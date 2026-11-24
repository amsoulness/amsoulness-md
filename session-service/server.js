const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { startPairing } = require('./whatsapp');
const { createRenderDeployer } = require('./render-deployer');

function createApp({ adapter = startPairing, ttl = 5 * 60 * 1000, maxSessions = 8, deployerOptions } = {}) {
  const deployer = createRenderDeployer(deployerOptions);
  const sessions = new Map(), rate = new Map();
  const allowed = new Set((process.env.ALLOWED_ORIGINS || 'https://aslns.online,https://www.aslns.online,http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()));
  const remove = id => { const r = sessions.get(id); if (r) { r.cancelled = true; r.dispose?.(); sessions.delete(id); } };
  const sweep = setInterval(() => { for (const [id, r] of sessions) if (Date.now() > r.expiresAt) remove(id); for (const [ip, r] of rate) if (Date.now() > r.until) rate.delete(ip); }, 10000);
  sweep.unref();
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Vary', 'Origin');
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    const path = req.url?.split('?')[0];
    if (path === '/health' && req.method === 'GET') return send(200, { ok: true, service: 'aslns-pairing' });
    if (origin && !allowed.has(origin)) return send(403, { error: 'This website is not allowed to use pairing.' });
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (await deployer.handle(req, res, send)) return;
    if (path !== '/api/session') return send(404, { error: 'Not found' });
    if (req.method === 'POST') {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
      const now = Date.now();
      let bucket = rate.get(ip);
      if (!bucket || now > bucket.until) { if (rate.size >= 10000) return send(503, { error: 'Server busy. Try again shortly.' }); rate.set(ip, bucket = { count: 0, until: now + 600000 }); }
      if (++bucket.count > 5) return send(429, { error: 'Too many requests. Try again in ten minutes.' });
      if (sessions.size >= maxSessions) return send(503, { error: 'All pairing slots are busy. Try again shortly.' });
      try {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 2048) return send(413, { error: 'Request is too large.' }); }
        const data = JSON.parse(raw || '{}');
        if (!['qr', 'code'].includes(data.method)) return send(400, { error: 'Choose QR or pairing code.' });
        const phone = String(data.phone || '').replace(/[\s()+-]/g, '');
        if (data.method === 'code' && !/^[1-9]\d{6,14}$/.test(phone)) return send(400, { error: 'Enter your full phone number with country code.' });
        if (sessions.size >= maxSessions) return send(503, { error: 'All pairing slots are busy. Try again shortly.' });
        // Random bearer capability; never logged or put in a URL.
        const id = randomBytes(32).toString('base64url');
        const record = { method: data.method, phone, state: 'starting', expiresAt: Date.now() + ttl };
        sessions.set(id, record);
        Promise.resolve().then(() => adapter(record, () => {})).catch(() => { if (!record.cancelled) { record.state = 'error'; record.error = 'Pairing is unavailable. Please start again.'; record.dispose?.(); } });
        return send(201, { id, expiresAt: record.expiresAt });
      } catch { return send(400, { error: 'Invalid request.' }); }
    }
    const id = String(req.headers.authorization || '').replace(/^Bearer /, '');
    const r = sessions.get(id);
    if (!r || Date.now() > r.expiresAt) { remove(id); return send(410, { error: 'This connection expired. Start a new one.' }); }
    if (req.method === 'DELETE') { remove(id); return send(200, { ok: true }); }
    if (req.method !== 'GET') return send(405, { error: 'Method not allowed.' });
    return send(200, { state: r.state, qr: r.qr, code: r.code, session: r.session, error: r.error, expiresAt: r.expiresAt });
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  return { server, close: () => { deployer.close(); clearInterval(sweep); for (const id of sessions.keys()) remove(id); server.close(); } };
}

if (require.main === module) {
  const app = createApp();
  app.server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Amsoulness pairing server listening'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { app.close(); setTimeout(() => process.exit(0), 3000).unref(); });
}
module.exports = { createApp };
