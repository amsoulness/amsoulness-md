const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const { encodeSession, decodeSession, parseSessions, importedSession } = require('../core/session-token');
const fixture = { 'creds.json': JSON.stringify({ me: { id: '0000000000@s.whatsapp.net' }, noiseKey: { type: 'Buffer', data: 'dGVzdA==' } }), 'test-key.json': '{"test":true}', 'app-state-sync-key-base64/key=.json': '{"test":true}' };

test('portable session round-trips and imports under a short database id', () => {
  const token = encodeSession(fixture);
  assert.match(token, /^ASLNS~v1_/);
  assert.deepEqual(decodeSession(token), fixture);
  const [id, legacy] = parseSessions(`${token},RGNK~legacy-test`);
  assert.equal(id.length, 38); assert.equal(legacy, 'legacy-test');
  assert.deepEqual(importedSession(id), fixture);
});
test('malformed and unlinked sessions are rejected', () => {
  assert.throws(() => decodeSession('ASLNS~not-a-session'));
  assert.throws(() => decodeSession(encodeSession({ 'creds.json': '{}' })));
  assert.throws(() => parseSessions('placeholder'));
});
test('compressed oversized payloads and invalid key paths are rejected', () => {
  assert.throws(() => decodeSession('ASLNS~v1_' + gzipSync('x'.repeat(3 * 1024 * 1024)).toString('base64url')));
  assert.throws(() => decodeSession(encodeSession({ ...fixture, '../outside.json': '{}' })));
});
