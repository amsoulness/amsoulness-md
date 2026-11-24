const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

async function setup(t, options = {}) {
  const app = createApp(options);
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.server.address().port}`;
  const create = body => fetch(url + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://aslns.online' }, body: JSON.stringify(body) });
  return { url, create };
}
test('pairing is private, readable with bearer token and cancellable', async t => {
  let disposed = false;
  const { url, create } = await setup(t, { adapter: async r => { r.state = 'ready'; r.session = 'synthetic-test-session'; r.dispose = () => { disposed = true; }; } });
  const started = await create({ method: 'qr' }); assert.equal(started.status, 201);
  const { id } = await started.json(); assert.ok(id.length >= 40);
  assert.equal((await fetch(url + '/api/session')).status, 410);
  const result = await fetch(url + '/api/session', { headers: { Authorization: `Bearer ${id}`, Origin: 'https://aslns.online' } });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('access-control-allow-origin'), 'https://aslns.online');
  assert.equal((await result.json()).session, 'synthetic-test-session');
  assert.equal((await fetch(url + '/api/session', { method: 'DELETE', headers: { Authorization: `Bearer ${id}` } })).status, 200);
  assert.ok(disposed);
  assert.equal((await fetch(url + '/api/session', { headers: { Authorization: `Bearer ${id}` } })).status, 410);
});
test('invalid phone and foreign origins are rejected', async t => {
  const { url, create } = await setup(t, { adapter: async () => {} });
  assert.equal((await create({ method: 'code', phone: 'abc' })).status, 400);
  assert.equal((await fetch(url + '/api/session', { method: 'POST', headers: { Origin: 'https://untrusted.example' }, body: '{"method":"qr"}' })).status, 403);
});
test('rate limits and active connection caps apply', async t => {
  const { create } = await setup(t, { maxSessions: 1, adapter: async () => {} });
  assert.equal((await create({ method: 'qr' })).status, 201);
  assert.equal((await create({ method: 'qr' })).status, 503);
  for (let n = 0; n < 3; n++) await create({ method: 'qr' });
  assert.equal((await create({ method: 'qr' })).status, 429);
});
test('expired sessions are inaccessible and cleaned up', async t => {
  const { url, create } = await setup(t, { ttl: 10, adapter: async () => {} });
  const { id } = await (await create({ method: 'qr' })).json();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal((await fetch(url + '/api/session', { headers: { Authorization: `Bearer ${id}` } })).status, 410);
});
