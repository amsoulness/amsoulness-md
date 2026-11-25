const { sendSessionToSelf } = require('./self-session');
const { requestConfirmedCode } = require('./pairing-code');
const { encodeSession } = require('../core/session-token');

async function startPairing(record, changed) {
  const wa = await import('baileys');
  const pino = require('pino');
  const QRCode = require('qrcode');
  const creds = wa.initAuthCreds();
  const keys = new Map();
  let socket, stopped = false, restarts = 0, pairRequested = false, finishing = false, readyTimer;
  const auth = {
    creds,
    keys: {
      get: async (type, ids) => Object.fromEntries(ids.map(id => {
        let value = keys.get(`${type}-${id}`);
        if (value && type === 'app-state-sync-key') value = wa.proto.Message.AppStateSyncKeyData.fromObject(value);
        return [id, value];
      })),
      set: async data => {
        for (const [type, values] of Object.entries(data)) for (const [id, value] of Object.entries(values)) {
          const name = `${type}-${id}`;
          if (value == null) keys.delete(name); else keys.set(name, value);
        }
      },
    },
  };
  const fail = () => {
    if (stopped) return;
    if (record.session) { record.state = 'ready'; changed(); dispose(); return; }
    record.state = 'error'; record.qr = undefined; record.code = undefined;
    record.error = record.method === 'code' ? 'WhatsApp rejected or expired this pairing request. Check the phone number matches your WhatsApp account, then request a fresh code. You can also connect using QR.' : 'WhatsApp could not complete this request. Start a new connection and try again.';
    changed(); dispose();
  };
  function dispose() {
    stopped = true;
    clearTimeout(readyTimer);
    socket?.ev.removeAllListeners();
    try { socket?.end(undefined); } catch {}
    keys.clear();
  }
  record.dispose = dispose;
  // The caller may have cancelled while dependencies loaded.
  if (record.cancelled) { dispose(); return; }
  const browser = record.method === 'code' ? wa.Browsers.windows('Chrome') : ['Amsoulness', 'Chrome', '1.0.0'];
  const connect = () => {
    if (stopped) return;
    socket = wa.default({ auth, logger: pino({ level: 'silent' }), browser, syncFullHistory: false, shouldSyncHistoryMessage: () => false, markOnlineOnConnect: false, connectTimeoutMs: 30000, defaultQueryTimeoutMs: 30000 });
    socket.ev.on('creds.update', update => Object.assign(creds, update));
    socket.ev.on('connection.update', update => {
      void (async () => {
        if (stopped) return;
        if (update.qr && record.method === 'qr') {
          const image = await QRCode.toDataURL(update.qr, { margin: 2, width: 320, errorCorrectionLevel: 'M' });
          if (stopped) return;
          record.qr = image; record.state = 'waiting'; changed();
        }
        if ((update.connection === 'connecting' || update.qr) && record.method === 'code' && !pairRequested) {
          pairRequested = true;
          // Wait for the initial QR stanza so the socket is ready for code requests.
          if (!update.qr) { pairRequested = false; return; }
          record.code = await requestConfirmedCode(socket, record.phone, wa, browser);
          record.expiresAt = Math.min(record.expiresAt, Date.now() + 180000);
          if (stopped) return;
          record.state = 'waiting'; changed();
        }
        if (update.connection === 'open' && !finishing) {
          finishing = true;
          record.state = 'finishing'; record.qr = undefined; record.code = undefined; changed();
          readyTimer = setTimeout(async () => {
            try {
              const files = { 'creds.json': JSON.stringify(creds, wa.BufferJSON.replacer) };
              for (const [key, value] of keys) files[`${key}.json`] = JSON.stringify(value, wa.BufferJSON.replacer);
              record.session = encodeSession(files); record.state = 'ready'; record.phone = undefined; changed();
              // Website success is independent of best-effort WhatsApp delivery.
              if (!stopped && !record.cancelled) await sendSessionToSelf(socket, record.session);
              dispose();
            } catch { fail(); }
          }, 1500);
        }
        if (update.connection === 'close') {
          if (update.lastDisconnect?.error?.output?.statusCode === wa.DisconnectReason.restartRequired && restarts++ < 3) {
            socket.ev.removeAllListeners(); connect();
          } else fail();
        }
      })().catch(fail);
    });
  };
  connect();
}

module.exports = { startPairing };
