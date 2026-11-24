const { Module } = require('../main');
const { randomInt } = require('node:crypto');
Module({
  name: 'aslns-dice',
  pattern: 'dice(?: |$)(.*)', fromMe: true, desc: 'Roll dice: .dice 2d6', use: 'games' }, async (message, match) => {
  const input = String(match?.[1] || '1d6').trim();
  const found = /^(\d{1,2})d(\d{1,4})$/i.exec(input);
  if (!found || +found[1] < 1 || +found[1] > 20 || +found[2] < 2 || +found[2] > 1000) return message.send('Use .dice NdS, with 1–20 dice and 2–1000 sides. Example: .dice 2d6');
  const rolls = Array.from({ length: +found[1] }, () => randomInt(1, +found[2] + 1));
  await message.send(`🎲 ${input}: ${rolls.join(', ')}\nTotal: ${rolls.reduce((a, b) => a + b, 0)}`);
});
