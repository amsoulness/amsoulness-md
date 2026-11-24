const { Module } = require('../main');
const { randomUUID } = require('node:crypto');
Module({
  name: 'aslns-uuid',
  pattern: 'uuid$', fromMe: true, desc: 'Generate a UUID', use: 'utility' }, async message => {
  await message.send(randomUUID());
});
