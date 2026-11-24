const { Module } = require('../main');
const { randomInt } = require('node:crypto');
Module({
  name: 'aslns-coin',
  pattern: 'coin$', fromMe: true, desc: 'Flip a coin', use: 'games' }, async message => {
  await message.send(randomInt(2) ? '🪙 Heads' : '🪙 Tails');
});
