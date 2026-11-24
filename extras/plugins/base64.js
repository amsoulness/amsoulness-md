const { Module } = require('../main');
Module({ name: 'aslns-base64', pattern: 'b64(?: |$)(.*)', fromMe: true, desc: 'Encode/decode text: .b64 encode Hello', use: 'utility' }, async (message, match) => {
  const input = String(match?.[1] || '');
  const found = /^(encode|decode)\s+([\s\S]+)$/i.exec(input);
  if (!found || input.length > 2000) return message.send('Use .b64 encode TEXT or .b64 decode BASE64 (up to 2000 characters).');
  if (found[1].toLowerCase() === 'encode') return message.send(Buffer.from(found[2], 'utf8').toString('base64'));
  const text = found[2].trim();
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) return message.send('That is not valid Base64.');
  await message.send(Buffer.from(text, 'base64').toString('utf8') || '(empty text)');
});
