const { Module } = require('../main');
const config = require('../config');
const store = require('../core/config/store');
const context = require('../core/context');
const { helpPrefix } = require('../core/plugins/registry');

function selfChat(message) {
  const bare = value => typeof value === 'string' ? value.replace(/:\d+(?=@)/, '') : '';
  const own = [bare(message.client.user?.id), bare(message.client.user?.lid)].filter(Boolean);
  return message.fromMe === true && own.includes(message.jid);
}
async function handleRenderKey(message, match) {
  // Replies must NOT quote the command containing the key.
  const reply = text => message.client.sendMessage(message.jid, { text });
  if (!selfChat(message)) return reply('Use this command only from your own linked account in its self-chat (Message yourself).');
  const arg = (match[1] || '').trim();
  const p = helpPrefix();
  if (!arg) return reply(`Render key setup\n\n${p}renderkey <your Render API key>\n${p}renderkey status\n${p}renderkey remove\n\nThe key is checked against this Render service and saved privately in your bot database. Never use a group or another person’s chat.`);
  if (arg.toLowerCase() === 'status') return reply(config.RENDER_API_KEY ? 'A Render API key is configured. Its value is hidden.' : 'No Render API key is configured.');
  if (!context.accountId()) return reply('This account is not ready yet. Try again after the bot reconnects.');
  if (arg.toLowerCase() === 'remove') {
    try { await store.unset('RENDER_API_KEY', { persist: true });
      return reply(config.RENDER_API_KEY ? 'The key saved by this command was removed. A host environment key is still configured; remove it in Render to disable access completely.' : 'The saved Render API key was removed.');
    } catch { return reply('Could not remove the saved key. Please try again.'); }
  }
  // Best effort: remove the original message without ever echoing its contents.
  try { await message.client.sendMessage(message.jid, { delete: message.data?.key || { remoteJid: message.jid, id: message.id, fromMe: true } }); } catch {}
  if (!/^rnd_[A-Za-z0-9_-]{16,200}$/.test(arg)) return reply('That does not look like a Render API key. Create one in your Render account settings, then try again.');
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!serviceId) return reply('This bot is not running as a Render service. This command configures updates for the current Render bot only.');
  try {
    const response = await fetch(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}`, {
      headers: { Authorization: `Bearer ${arg}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return reply('Render did not accept this key for the current service. Check the key’s permissions and account, then try again.');
    await store.set('RENDER_API_KEY', arg, { persist: true });
    return reply(`Render API key verified and saved for this linked account. No restart needed.\n\nUse ${p}update to check for updates. The key is hidden; deletion of your original message was attempted.`);
  } catch { return reply('Could not verify or save the key. Please try again. Your existing key was kept.'); }
}
Module({ pattern: 'renderkey(?:\\s+([\\s\\S]+))?\\s*$', fromMe: true, use: 'owner',
  desc: 'Configure the Render update API key privately in your own self-chat.',
  usage: '.renderkey <key> | .renderkey status | .renderkey remove',
}, handleRenderKey);
module.exports = { selfChat, handleRenderKey };
