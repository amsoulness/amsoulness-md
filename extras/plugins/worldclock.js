const { Module } = require('../main');
Module({ name: 'aslns-worldclock', pattern: 'worldclock(?: |$)(.*)', fromMe: true, desc: 'Time in an IANA timezone', use: 'utility' }, async (message, match) => {
  const zone = String(match?.[1] || 'Asia/Kolkata').trim();
  try {
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, dateStyle: 'full', timeStyle: 'long' }).format(new Date());
    await message.send(`${zone}\n${time}`);
  } catch { await message.send('Use an IANA timezone, for example .worldclock Asia/Kolkata or .worldclock Europe/London'); }
});
