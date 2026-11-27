const TIMES = new Set(['10:00', '18:00']);
const LAST_SLOT = 'AMSOULNESS_PROMO_LAST_SLOT';
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function promotionSlot(now = new Date()) {
  const p = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
  const time = `${p.hour}:${p.minute}`;
  return TIMES.has(time) ? `${p.year}-${p.month}-${p.day}/${time}` : null;
}
function promotionMessage(slot) {
  const intro = slot.endsWith('10:00')
    ? '*ASLNS / TODAY*\nBuild something creative today. Explore my website, free creative tools and WhatsApp bot.'
    : '*ASLNS / YOUR TOOLKIT*\nDiscover browser tools, WhatsApp automation, group moderation, media tools and community plugins.';
  return `${intro}\n\nWebsite: https://aslns.online\nCreative tools: https://aslns.online/tools\nConnect your bot: https://aslns.online/session\nDeploy: https://aslns.online/session/deploy\nPlugins: https://aslns.online/session/plugins\nGitHub: https://github.com/amsoulness/amsoulness-md\n\nPrivate reminder for your linked account. Turn off with .setvar PROMO_MESSAGES=false`;
}
function createPromotionSender({ get, save, now = () => new Date() }) {
  const busy = new Set();
  return async function sendPromotion(client, accountId) {
    if (!accountId || get('PROMO_MESSAGES') !== true || busy.has(accountId)) return false;
    const slot = promotionSlot(now());
    if (!slot || get(LAST_SLOT) === slot) return false;
    // Never use SUDO/ownerTarget: only the account belonging to this socket.
    const raw = client?.user?.lid || client?.user?.id;
    const target = typeof raw === 'string' ? raw.replace(/:\d+(?=@)/, '') : '';
    if (!/^\d+@(lid|s\.whatsapp\.net)$/.test(target)) return false;
    busy.add(accountId);
    try {
      // Persist before send: a reconnect/restart must not repeat this promotion.
      await save(LAST_SLOT, slot);
      await client.sendMessage(target, { text: promotionMessage(slot) });
      return true;
    } finally { busy.delete(accountId); }
  };
}
module.exports = { createPromotionSender, promotionSlot, promotionMessage };
