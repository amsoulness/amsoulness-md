const { gzipSync, gunzipSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const imported = new Map();
const LIMIT = 2 * 1024 * 1024;

function encodeSession(fileMap) {
  const raw = JSON.stringify({ format: 'aslns-session-v1', files: fileMap });
  if (Buffer.byteLength(raw) > LIMIT) throw new Error('Session is too large');
  return 'ASLNS~v1_' + gzipSync(raw).toString('base64url');
}

function decodeSession(token) {
  const body = token.replace(/^ASLNS~/, '');
  if (!/^v1_[A-Za-z0-9_-]+$/.test(body) || body.length > LIMIT) throw new Error('Invalid Amsoulness session');
  const data = JSON.parse(gunzipSync(Buffer.from(body.slice(3), 'base64url'), { maxOutputLength: LIMIT }).toString());
  if (data.format !== 'aslns-session-v1' || !data.files || typeof data.files['creds.json'] !== 'string') throw new Error('Invalid session data');
  const creds = JSON.parse(data.files['creds.json']);
  if (!creds.me?.id) throw new Error('Session has no linked account');
  for (const [name, value] of Object.entries(data.files)) {
    if (!name.endsWith('.json') || name.includes('/') || name.includes('\\') || typeof value !== 'string') throw new Error('Invalid session key');
  }
  return data.files;
}

function parseSessions(raw) {
  imported.clear();
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean).map(token => {
    if (token.startsWith('ASLNS~')) {
      const files = decodeSession(token);
      const id = 'aslns-' + createHash('sha256').update(token).digest('hex').slice(0, 32);
      imported.set(id, files);
      return id;
    }
    const parts = token.split('~');
    if (parts.length !== 2 || !parts[1].trim()) throw new Error('SESSION must contain a valid ASLNS or upstream session string');
    return parts[1].trim();
  });
}

module.exports = { encodeSession, decodeSession, parseSessions, importedSession: id => imported.get(id) };
