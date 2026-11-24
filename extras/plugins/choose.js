const { Module } = require('../main');
const { randomInt } = require('node:crypto');
Module({
  name: 'aslns-choose',
  pattern: 'choose(?: |$)(.*)', fromMe: true, desc: 'Pick an option: .choose tea, coffee', use: 'games' }, async (message, match) => {
  const text = String(match?.[1] || '');
  if (text.length > 2000) return message.send('Keep options under 2000 characters.');
  const options = text.split(',').map(s => s.trim()).filter(Boolean);
  if (options.length < 2 || options.length > 50) return message.send('Give 2–50 comma-separated options. Example: .choose tea, coffee');
  await message.send(`My pick: ${options[randomInt(options.length)]}`);
});
