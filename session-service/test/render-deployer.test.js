const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const GH_TOKEN = 'ghp_synthetic_token_for_unit_tests_only';
const RENDER_KEY = 'rnd_synthetic_key_for_unit_tests_only';
const UPDATE_KEY = 'rnd_separate_update_key_for_unit_tests_only';

async function setup(t, extra = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, method: options.method, body, headers: options.headers });
    const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
    if (extra.fetchImpl) { const r = await extra.fetchImpl(url, options, body); if (r) return r; }
    if (url === 'https://api.github.com/user') return response({ login: 'synthetic-owner' });
    if (url.endsWith('/user/repos')) return response({ default_branch: 'main' }, 201);
    if (url.includes('/contents/Dockerfile')) return response({ content: { sha: 'test' } }, 201);
    if (url.includes('/owners?')) return response([{ owner: { id: 'tea-test', name: 'Test workspace' } }]);
    if (url.endsWith('/postgres') && options.method === 'POST') return response({ id: 'dpg-test-a' }, 201);
    if (url.endsWith('/postgres/dpg-test-a')) return response({ status: 'available' });
    if (url.endsWith('/connection-info')) return response({ internalConnectionString: 'postgresql://synthetic:secret@internal/db' });
    if (url.endsWith('/services') && options.method === 'POST') return response({ service: { id: 'srv-test', serviceDetails: { url: 'https://synthetic.onrender.com' } }, deployId: 'dep-test' }, 201);
    if (url.endsWith('/deploys/dep-test')) return response({ status: 'live' });
    throw new Error('Unexpected provider request: ' + url);
  };
  const app = createApp({ adapter: async () => {}, deployerOptions: { fetchImpl, sleep: async () => {}, databaseAttempts: 2, deployAttempts: 2, ...extra.options } });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  let id;
  async function api(path, data, method = data ? 'POST' : 'GET') {
    const r = await fetch(base + '/api/render/' + path, { method, headers: { Origin: 'https://aslns.online', 'Content-Type': 'application/json', ...(id ? { Authorization: 'Bearer ' + id } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: r.status, data: await r.json() };
  }
  async function connect() {
    const connected = await api('connect', { token: GH_TOKEN }); assert.equal(connected.status, 200); id = connected.data.id;
    const owners = await api('workspaces', { apiKey: RENDER_KEY }); assert.equal(owners.status, 200);
  }
  async function terminal() {
    for (let i = 0; i < 30; i++) { const r = await api('status'); if (['error', 'live'].includes(r.data.phase)) return r.data; await new Promise(resolve => setImmediate(resolve)); }
    throw new Error('Job did not finish');
  }
  const config = { confirm: true, configureUpdates: true, updateApiKey: UPDATE_KEY, name: 'synthetic-bot', ownerId: 'tea-test', region: 'singapore', session: 'RGNK~synthetic-test-session', sudo: '10000000000' };
  return { api, connect, terminal, calls, config, base };
}

test('complete deployment creates private settings only on Render and clears token access', async t => {
  const { api, connect, terminal, calls, config } = await setup(t);
  await connect(); assert.equal((await api('deploy', config)).status, 202);
  const state = await terminal(); assert.equal(state.phase, 'live');
  const repo = calls.find(c => c.url.endsWith('/user/repos')); assert.equal(repo.body.private, false);
  const content = calls.find(c => c.url.includes('/contents/Dockerfile'));
  const source = Buffer.from(content.body.content, 'base64').toString();
  assert.ok(source.includes('amsoulness/amsoulness-md.git')); assert.ok(!source.includes(config.session));
  const service = calls.find(c => c.url.endsWith('/services'));
  assert.equal(service.body.serviceDetails.plan, 'free'); assert.equal(service.body.serviceDetails.runtime, 'docker');
  assert.equal(service.body.envVars.find(x => x.key === 'SESSION').value, config.session);
  assert.equal(service.body.envVars.find(x => x.key === 'RENDER_API_KEY').value, UPDATE_KEY);
  assert.ok(!service.body.envVars.some(x => x.value === RENDER_KEY));
  assert.ok(!source.includes(UPDATE_KEY));
  assert.equal(service.body.envVars.find(x => x.key === 'DATABASE_URL').value, 'postgresql://synthetic:secret@internal/db');
  const publicStatus = JSON.stringify(state);
  for (const secret of [GH_TOKEN, RENDER_KEY, UPDATE_KEY, config.session, 'postgresql://']) assert.ok(!publicStatus.includes(secret));
  assert.equal((await api('deploy', config)).status, 400);
});
test('confirmation, owner membership and session validation run before mutations', async t => {
  const { api, connect, calls, config } = await setup(t); await connect();
  assert.equal((await api('deploy', { ...config, confirm: false })).status, 400);
  assert.equal((await api('deploy', { ...config, ownerId: 'tea-other' })).status, 400);
  assert.equal((await api('deploy', { ...config, session: 'ASLNS~invalid' })).status, 400);
  assert.ok(!calls.some(c => c.url.endsWith('/user/repos')));
});
test('duplicate submissions share one deployment job', async t => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { api, connect, terminal, calls, config } = await setup(t, { fetchImpl: async url => { if (url.endsWith('/user/repos')) await gate; } });
  await connect();
  const submissions = await Promise.all([api('deploy', config), api('deploy', config)]);
  assert.ok(submissions.every(r => r.status === 202)); release();
  assert.equal((await terminal()).phase, 'live');
  assert.equal(calls.filter(c => c.url.endsWith('/user/repos')).length, 1);
});
test('existing database does not create another database', async t => {
  const { api, connect, terminal, calls, config } = await setup(t); await connect();
  await api('deploy', { ...config, existingDatabaseUrl: 'postgresql://existing/db' });
  assert.equal((await terminal()).phase, 'live');
  assert.ok(!calls.some(c => c.url.endsWith('/postgres')));
});
test('provider errors are redacted and never trigger paid fallback or resource deletion', async t => {
  const { api, connect, terminal, calls, config } = await setup(t, { fetchImpl: async (url, options) => {
    if (url.endsWith('/postgres') && options.method === 'POST') return { ok: false, status: 402, json: async () => ({ secret: RENDER_KEY }) };
  } });
  await connect(); await api('deploy', config);
  const state = await terminal(); assert.equal(state.phase, 'error'); assert.match(state.error, /No paid plan/);
  assert.ok(state.repoUrl); assert.ok(!JSON.stringify(state).includes(RENDER_KEY));
  assert.ok(!calls.some(c => c.url.endsWith('/services'))); assert.ok(!calls.some(c => c.method === 'DELETE'));
});
test('connections are isolated, expire, and reject invalid OAuth callbacks', async t => {
  let now = Date.now();
  const { api, connect } = await setup(t, { options: { clock: () => now } });
  assert.equal((await api('status')).status, 410); await connect();
  assert.equal((await api('oauth/callback?state=invalid&code=invalid')).status, 400);
  now += 16 * 60000; assert.equal((await api('status')).status, 410);
});

test('OAuth validates browser state and exchanges a one-use ticket without leaking GitHub tokens', async t => {
  const previousId = process.env.GITHUB_OAUTH_CLIENT_ID, previousSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  process.env.GITHUB_OAUTH_CLIENT_ID = 'synthetic-client-id'; process.env.GITHUB_OAUTH_CLIENT_SECRET = 'synthetic-client-secret';
  t.after(() => { if (previousId === undefined) delete process.env.GITHUB_OAUTH_CLIENT_ID; else process.env.GITHUB_OAUTH_CLIENT_ID = previousId; if (previousSecret === undefined) delete process.env.GITHUB_OAUTH_CLIENT_SECRET; else process.env.GITHUB_OAUTH_CLIENT_SECRET = previousSecret; });
  const { base, api } = await setup(t, { fetchImpl: async url => {
    if (url === 'https://github.com/login/oauth/access_token') return { ok: true, status: 200, json: async () => ({ access_token: GH_TOKEN, scope: 'public_repo' }) };
  } });
  const start = await fetch(base + '/api/render/oauth/start?origin=https://aslns.online', { redirect: 'manual' });
  assert.equal(start.status, 302);
  const authorize = new URL(start.headers.get('location'));
  assert.equal(authorize.origin, 'https://github.com'); assert.equal(authorize.searchParams.get('scope'), 'public_repo');
  const state = authorize.searchParams.get('state');
  assert.match(start.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  const callback = await fetch(base + `/api/render/oauth/callback?state=${state}&code=synthetic-code`, { redirect: 'manual', headers: { Cookie: 'aslns_oauth=' + state } });
  assert.equal(callback.status, 302);
  const redirect = new URL(callback.headers.get('location'));
  assert.equal(redirect.origin, 'https://aslns.online'); assert.ok(!redirect.href.includes(GH_TOKEN));
  const ticket = new URLSearchParams(redirect.hash.slice(1)).get('ticket');
  const connected = await api('ticket', { ticket }); assert.equal(connected.status, 200); assert.equal(connected.data.login, 'synthetic-owner');
  assert.equal((await api('ticket', { ticket })).status, 400);
});

test('update key is separate, authorized and workspace-checked before creation', async t => {
  const { api, connect, calls, config } = await setup(t); await connect();
  for (const change of [{ configureUpdates: false }, { updateApiKey: '' }, { updateApiKey: RENDER_KEY }]) assert.equal((await api('deploy', { ...config, ...change })).status, 400);
  assert.ok(!calls.some(c => c.url.endsWith('/user/repos')));
});
test('a second key from another workspace cannot create resources', async t => {
  const { api, connect, calls, config } = await setup(t, { fetchImpl: async (url, options) => {
    if (url.includes('/owners?') && options.headers.Authorization === `Bearer ${UPDATE_KEY}`) return { ok: true, status: 200, json: async () => [{ owner: { id: 'tea-other', name: 'Other workspace' } }] };
  } }); await connect();
  assert.equal((await api('deploy', config)).status, 400);
  assert.ok(!calls.some(c => c.url.endsWith('/user/repos')));
});
