async function sendSessionToSelf(socket, token, { timeoutMs = 10000 } = {}) {
  // Derive the destination from authenticated socket state, never submitted phone input.
  const raw = socket.user?.id || socket.authState?.creds?.me?.id;
  const target = typeof raw === 'string' ? raw.replace(/:\d+(?=@)/, '') : '';
  if (!/^\d+@s\.whatsapp\.net$/.test(target) || !token?.startsWith('ASLNS~v1_')) return false;
  let timer;
  try {
    await Promise.race([
      socket.sendMessage(target, { text: `*Amsoulness / ASLNS — Connected*\n\nYour private session code:\n\n${token}\n\nKeep this private. Anyone with this code can access your linked WhatsApp account. Use it only as SESSION in your own bot settings.\n\nhttps://aslns.online/session` }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Self-message timed out')), timeoutMs); })
    ]);
    return true;
  } catch { return false; }
  finally { clearTimeout(timer); }
}
module.exports = { sendSessionToSelf };
