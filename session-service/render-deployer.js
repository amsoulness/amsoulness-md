const { randomBytes } = require('node:crypto');
const { decodeSession } = require('../core/session-token');

const GH = 'https://api.github.com';
const RENDER = 'https://api.render.com/v1';
const FRONTEND = 'https://aslns.online';
const CALLBACK_PATH = '/api/render/oauth/callback';
const WRAPPER = `FROM node:26-alpine
RUN apk add --no-cache git ffmpeg libwebp-tools python3 make g++
RUN git clone --depth 1 https://github.com/amsoulness/amsoulness-md.git /app
WORKDIR /app
RUN npm install -g yarn@1.22.22 && yarn install --frozen-lockfile
ENV AUTO_UPDATE=false BOT_NAME=Amsoulness
CMD ["node", "index.js"]
`;
const REGIONS = new Set(['oregon', 'ohio', 'virginia', 'frankfurt', 'singapore']);
const nonce = () => randomBytes(32).toString('base64url');
class PublicError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }

function createRenderDeployer({ fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), databaseAttempts = 120, deployAttempts = 300, clock = Date.now } = {}) {
  const connections = new Map(), states = new Map(), tickets = new Map(), limits = new Map();
  const wipe = r => { r.githubToken = null; r.renderKey = null; r.session = null; r.databaseUrl = null; };
  function remove(id) { const r = connections.get(id); if (r) { r.abort.abort(); wipe(r); connections.delete(id); } }
  const sweep = setInterval(() => {
    for (const [id, r] of connections) if (clock() > r.expiresAt) remove(id);
    for (const map of [states, tickets, limits]) for (const [id, r] of map) if (clock() > r.expiresAt) map.delete(id);
  }, 10000); sweep.unref();
  async function request(base, endpoint, token, method = 'GET', data, signal) {
    let response;
    try {
      response = await fetchImpl(base + endpoint, { method, redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'Amsoulness-Deployer', ...(base === GH ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    } catch { throw new PublicError('The provider did not respond. Check the resource links below before starting another deployment.', 502); }
    if (!response.ok) {
      const name = base === GH ? 'GitHub' : 'Render';
      if ([401, 403].includes(response.status)) throw new PublicError(`${name} rejected this credential or its permissions. Check your token and account access.`, 401);
      if (response.status === 402) throw new PublicError('Render requires billing setup for this request. No paid plan will be selected automatically.');
      if (response.status === 409 || response.status === 422) throw new PublicError(`${name} could not create this resource. The name may already exist; choose a different name and check your account.`);
      if (response.status === 429) throw new PublicError(`${name} is rate limiting requests. Wait before trying again.`, 429);
      throw new PublicError(`${name} rejected the request (${response.status}). Check the chosen region, free-plan availability and account limits.`, 400);
    }
    return response.status === 204 ? {} : response.json();
  }
  async function connectGithub(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 512 || /\s/.test(token)) throw new PublicError('Enter a valid GitHub token.');
    if (connections.size >= 25) throw new PublicError('The deployer is busy. Please try again shortly.', 503);
    const user = await request(GH, '/user', token);
    if (!/^[a-z0-9-]+$/i.test(user.login || '')) throw new PublicError('GitHub did not return a valid account.');
    if (connections.size >= 25) throw new PublicError('The deployer is busy. Please try again shortly.', 503);
    const id = nonce();
    connections.set(id, { githubToken: token, login: user.login, expiresAt: clock() + 15 * 60000, phase: 'connected', steps: [], owners: [], abort: new AbortController() });
    return { id, login: user.login, expiresAt: connections.get(id).expiresAt };
  }
  function safe(r) {
    return { login: r.login, phase: r.phase, expiresAt: r.expiresAt, steps: r.steps, error: r.error, repoUrl: r.repoUrl, databaseId: r.databaseId, databaseDashboard: r.databaseDashboard, serviceId: r.serviceId, dashboardUrl: r.dashboardUrl, serviceUrl: r.serviceUrl, deploymentStatus: r.deploymentStatus };
  }
  function update(r, phase, message) { r.phase = phase; r.steps.push({ message, at: new Date(clock()).toISOString() }); }
  async function deploy(r, data) {
    try {
      update(r, 'repository', 'Creating your public deployment repository');
      const repo = await request(GH, '/user/repos', r.githubToken, 'POST', { name: data.name + '-deploy', private: false, auto_init: true, description: 'Amsoulness / ASLNS Render deployment wrapper. No credentials are stored in this repository.' }, r.abort.signal);
      r.repoUrl = `https://github.com/${r.login}/${data.name}-deploy`;
      const repoPath = `/repos/${r.login}/${data.name}-deploy/contents/`;
      const branch = repo.default_branch || 'main';
      await request(GH, repoPath + 'Dockerfile', r.githubToken, 'PUT', { message: 'Add Amsoulness Docker build', branch, content: Buffer.from(WRAPPER).toString('base64') }, r.abort.signal);
      r.githubToken = null;
      update(r, 'database', data.existingDatabaseUrl ? 'Using your existing PostgreSQL database' : 'Creating your free PostgreSQL database');
      let databaseUrl = data.existingDatabaseUrl;
      if (!databaseUrl) {
        const db = await request(RENDER, '/postgres', r.renderKey, 'POST', { name: data.name + '-db', ownerId: data.ownerId, plan: 'free', region: data.region, version: '16', databaseName: 'amsoulness', databaseUser: 'amsoulness', ipAllowList: [] }, r.abort.signal);
        if (!/^dpg-[a-z0-9-]+$/i.test(db.id || '')) throw new PublicError('Render did not return a database identifier. Check the Render dashboard before retrying.');
        r.databaseId = db.id; r.databaseDashboard = `https://dashboard.render.com/d/${db.id}`;
        for (let attempt = 0; attempt < databaseAttempts; attempt++) {
          const state = await request(RENDER, `/postgres/${db.id}`, r.renderKey, 'GET', undefined, r.abort.signal);
          if (state.status === 'available') break;
          if (['failed', 'suspended'].includes(state.status)) throw new PublicError('Render could not prepare the database. Open its dashboard for details.');
          if (attempt === databaseAttempts - 1) throw new PublicError('The database is taking longer than expected. Open its dashboard to inspect it.');
          await sleep(2500);
          if (r.abort.signal.aborted) throw new PublicError('Deployment connection was closed. Created resources remain in your accounts.');
        }
        const info = await request(RENDER, `/postgres/${db.id}/connection-info`, r.renderKey, 'GET', undefined, r.abort.signal);
        databaseUrl = info.internalConnectionString;
        if (!/^postgres(?:ql)?:\/\//.test(databaseUrl || '')) throw new PublicError('Render did not return a database connection. Check its dashboard.');
      }
      update(r, 'service', 'Creating the bot service and applying private environment settings');
      const created = await request(RENDER, '/services', r.renderKey, 'POST', {
        type: 'web_service', name: data.name, ownerId: data.ownerId, repo: r.repoUrl, branch, autoDeployTrigger: 'off',
        envVars: [{ key: 'SESSION', value: data.session }, { key: 'SUDO', value: data.sudo }, { key: 'DATABASE_URL', value: databaseUrl }, { key: 'BOT_NAME', value: 'Amsoulness' }, { key: 'AUTO_UPDATE', value: 'false' }, { key: 'PORT', value: '3000' }, { key: 'TZ', value: 'Asia/Kolkata' }],
        serviceDetails: { runtime: 'docker', plan: 'free', region: data.region, healthCheckPath: '/health', envSpecificDetails: { dockerfilePath: './Dockerfile', dockerContext: '.' } },
      }, r.abort.signal);
      data.session = null; data.existingDatabaseUrl = null; databaseUrl = null;
      const service = created.service;
      if (!/^srv-[a-z0-9-]+$/i.test(service?.id || '')) throw new PublicError('Render did not return a service identifier. Inspect the Render dashboard.');
      r.serviceId = service.id; r.dashboardUrl = `https://dashboard.render.com/web/${service.id}`;
      r.serviceUrl = service.serviceDetails?.url;
      update(r, 'building', 'Render is building and starting your bot');
      let deployId = created.deployId;
      if (!deployId) {
        const triggered = await request(RENDER, `/services/${service.id}/deploys`, r.renderKey, 'POST', {}, r.abort.signal);
        deployId = triggered.id;
      }
      if (!/^dep-[a-z0-9-]+$/i.test(deployId || '')) throw new PublicError('Render accepted the service. Follow its dashboard to monitor the deployment.');
      for (let attempt = 0; attempt < deployAttempts; attempt++) {
        const current = await request(RENDER, `/services/${service.id}/deploys/${deployId}`, r.renderKey, 'GET', undefined, r.abort.signal);
        r.deploymentStatus = current.status;
        if (current.status === 'live') { update(r, 'live', 'Your Render deployment is live'); return; }
        if (['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'].includes(current.status)) throw new PublicError('Render could not complete the deployment. Open the build logs using the service dashboard link.');
        await sleep(5000);
        if (r.abort.signal.aborted) throw new PublicError('Deployment connection was closed. Created resources remain in your accounts.');
      }
      throw new PublicError('Render is still working. Continue monitoring the service in its dashboard.');
    } catch (error) { r.phase = 'error'; r.error = error instanceof PublicError ? error.message : 'The deployment stopped unexpectedly. Inspect the resource links before starting again.'; }
    finally { data.session = null; data.existingDatabaseUrl = null; wipe(r); r.running = false; }
  }
  async function body(req) { let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 128 * 1024) throw new PublicError('Request too large.', 413); } try { return JSON.parse(text || '{}'); } catch { throw new PublicError('Invalid JSON request.'); } }
  function limited(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    let r = limits.get(ip); if (!r || r.expiresAt < clock()) { if (limits.size >= 10000) throw new PublicError('Server busy.', 503); limits.set(ip, r = { count: 0, expiresAt: clock() + 600000 }); }
    if (++r.count > 8) throw new PublicError('Too many connection attempts. Try again in ten minutes.', 429);
  }
  async function handle(req, res, send) {
    const url = new URL(req.url, 'https://aslns-pairing-production.up.railway.app');
    if (!url.pathname.startsWith('/api/render/')) return false;
    try {
      if (url.pathname === '/api/render/config' && req.method === 'GET') { send(200, { githubOAuthAvailable: Boolean(process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET) }); return true; }
      if (url.pathname === '/api/render/oauth/start' && req.method === 'GET') {
        limited(req);
        if (states.size >= 100) throw new PublicError('GitHub sign-in is busy. Try again shortly.', 503);
        if (!process.env.GITHUB_OAUTH_CLIENT_ID || !process.env.GITHUB_OAUTH_CLIENT_SECRET) throw new PublicError('One-click GitHub sign-in is not configured. Use the temporary-token option on the deploy page.', 503);
        const origin = url.searchParams.get('origin') || FRONTEND;
        if (![FRONTEND, 'https://www.aslns.online', 'http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin)) throw new PublicError('Invalid return website.');
        const state = nonce(); states.set(state, { origin, expiresAt: clock() + 5 * 60000 });
        const callback = (process.env.PUBLIC_API_URL || 'https://aslns-pairing-production.up.railway.app') + CALLBACK_PATH;
        const query = new URLSearchParams({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID, redirect_uri: callback, scope: 'public_repo', state });
        res.setHeader('Set-Cookie', `aslns_oauth=${state}; Path=/api/render/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=300`);
        res.writeHead(302, { Location: 'https://github.com/login/oauth/authorize?' + query }); res.end(); return true;
      }
      if (url.pathname === CALLBACK_PATH && req.method === 'GET') {
        const state = url.searchParams.get('state'), saved = states.get(state), cookie = /(?:^|;\s*)aslns_oauth=([^;]+)/.exec(req.headers.cookie || '')?.[1];
        states.delete(state);
        if (!saved || saved.expiresAt < clock() || cookie !== state || !url.searchParams.get('code')) throw new PublicError('GitHub sign-in expired or was declined. Start again.');
        const callback = (process.env.PUBLIC_API_URL || 'https://aslns-pairing-production.up.railway.app') + CALLBACK_PATH;
        const response = await fetchImpl('https://github.com/login/oauth/access_token', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID, client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: callback }) });
        const token = await response.json();
        if (!response.ok || !token.access_token || !String(token.scope).split(/[ ,]+/).includes('public_repo')) throw new PublicError('GitHub did not grant public-repository access. Start sign-in again.');
        const connection = await connectGithub(token.access_token);
        const ticket = nonce(); tickets.set(ticket, { id: connection.id, expiresAt: clock() + 60000 });
        res.setHeader('Set-Cookie', 'aslns_oauth=; Path=/api/render/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        res.writeHead(302, { Location: saved.origin + '/session/deploy/render#ticket=' + ticket }); res.end(); return true;
      }
      if (url.pathname === '/api/render/connect' && req.method === 'POST') { limited(req); send(200, await connectGithub((await body(req)).token)); return true; }
      if (url.pathname === '/api/render/ticket' && req.method === 'POST') {
        limited(req); const data = await body(req), ticket = tickets.get(data.ticket); tickets.delete(data.ticket);
        const r = ticket && connections.get(ticket.id);
        if (!ticket || ticket.expiresAt < clock() || !r) throw new PublicError('GitHub sign-in expired. Start again.');
        send(200, { id: ticket.id, login: r.login, expiresAt: r.expiresAt }); return true;
      }
      const id = String(req.headers.authorization || '').replace(/^Bearer /, ''), r = connections.get(id);
      if (!r || r.expiresAt < clock()) { remove(id); throw new PublicError('Your deployment connection expired. Connect GitHub again.', 410); }
      if (url.pathname === '/api/render/connection' && req.method === 'DELETE') { remove(id); send(200, { ok: true }); return true; }
      if (url.pathname === '/api/render/status' && req.method === 'GET') { send(200, safe(r)); return true; }
      if (url.pathname === '/api/render/workspaces' && req.method === 'POST') {
        if (r.running || r.phase === 'live') throw new PublicError('Deployment has already started.');
        const data = await body(req);
        if (typeof data.apiKey !== 'string' || data.apiKey.length < 15 || data.apiKey.length > 512 || /\s/.test(data.apiKey)) throw new PublicError('Enter a valid Render API key.');
        const owners = await request(RENDER, '/owners?limit=100', data.apiKey);
        r.owners = (Array.isArray(owners) ? owners : []).map(x => x.owner).filter(x => x?.id && x?.name).map(x => ({ id: x.id, name: x.name }));
        if (!r.owners.length) throw new PublicError('This Render key has no accessible workspaces.');
        r.renderKey = data.apiKey; r.phase = 'configured'; send(200, { workspaces: r.owners }); return true;
      }
      if (url.pathname === '/api/render/deploy' && req.method === 'POST') {
        if (r.running) { send(202, safe(r)); return true; }
        if (r.phase !== 'configured' || !r.githubToken || !r.renderKey) throw new PublicError('Connect your GitHub and Render accounts first.');
        const data = await body(req);
        if (data.confirm !== true) throw new PublicError('Confirm the resources to create before deploying.');
        if (!/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(data.name || '')) throw new PublicError('Use a name of 3–40 lowercase letters, numbers or hyphens, ending with a letter or number.');
        if (!r.owners.some(owner => owner.id === data.ownerId) || !REGIONS.has(data.region)) throw new PublicError('Choose an accessible workspace and supported region.');
        if (typeof data.session !== 'string' || data.session.length > 100000 || !/^(ASLNS|RGNK)~/.test(data.session)) throw new PublicError('Enter your complete session string.');
        if (data.session.startsWith('ASLNS~')) { try { decodeSession(data.session); } catch { throw new PublicError('The Amsoulness session is invalid. Generate a new one.'); } }
        if (!/^\d{7,15}$/.test(data.sudo || '')) throw new PublicError('Enter your owner phone number with country code.');
        if (data.existingDatabaseUrl && (typeof data.existingDatabaseUrl !== 'string' || data.existingDatabaseUrl.length > 4000 || !/^postgres(?:ql)?:\/\//.test(data.existingDatabaseUrl))) throw new PublicError('Enter a valid PostgreSQL connection URL.');
        if (r.running) { send(202, safe(r)); return true; }
        if (r.phase !== 'configured') throw new PublicError('This deployment was already submitted. Inspect its status before starting again.');
        r.running = true; r.expiresAt = clock() + 30 * 60000; update(r, 'queued', 'Deployment approved');
        void deploy(r, data);
        send(202, safe(r)); return true;
      }
      send(404, { error: 'Deployment endpoint not found.' }); return true;
    } catch (error) { send(error instanceof PublicError ? error.status : 502, { error: error instanceof PublicError ? error.message : 'The deployment provider could not complete this request. Please try again.' }); return true; }
  }
  return { handle, close() { clearInterval(sweep); for (const id of connections.keys()) remove(id); states.clear(); tickets.clear(); limits.clear(); } };
}

module.exports = { createRenderDeployer, WRAPPER };
