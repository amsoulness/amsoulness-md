const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function plugin(file) {
  let command, handler;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../extras/plugins', file), 'utf8'), { Buffer, Intl, Date, require(name) {
    if (name === '../main') return { Module(info, fn) { command = info; handler = fn; } };
    return require(name);
  } });
  return { command, async run(text = '') { const sent = []; await handler({ send: async value => { sent.push(value); } }, [text, text]); return sent[0]; } };
}
test('every optional plugin registers with a unique name and owner access', () => {
  const names = [];
  for (const file of fs.readdirSync(path.join(__dirname, '../extras/plugins'))) {
    const { command } = plugin(file); assert.equal(command.fromMe, true); names.push(command.name);
  }
  assert.equal(new Set(names).size, 6);
});
test('dice validates bounds and returns a six-sided value', async () => {
  assert.match(await plugin('dice.js').run('0d6'), /1–20/);
  const text = await plugin('dice.js').run('1d6'); assert.match(text, /Total: [1-6]$/);
});
test('choice validates input and selects one supplied option', async () => {
  assert.match(await plugin('choose.js').run('only one'), /2–50/);
  assert.match(await plugin('choose.js').run('tea, coffee'), /^My pick: (tea|coffee)$/);
});
test('coin flip and UUID return valid outputs', async () => {
  assert.match(await plugin('coin.js').run(), /(Heads|Tails)$/);
  assert.match(await plugin('uuid.js').run(), /^[a-f0-9-]{36}$/);
});
test('world clock handles valid and invalid zones', async () => {
  assert.match(await plugin('worldclock.js').run('Asia/Kolkata'), /Asia\/Kolkata/);
  assert.match(await plugin('worldclock.js').run('invalid/zone'), /IANA timezone/);
});
test('base64 round-trips Unicode and rejects malformed input', async () => {
  const encoded = await plugin('base64.js').run('encode Hello 🌍');
  assert.equal(await plugin('base64.js').run('decode ' + encoded), 'Hello 🌍');
  assert.match(await plugin('base64.js').run('decode %%%%'), /not valid/);
});
