const { randomBytes } = require('node:crypto');

// Isolated from QR connections: expose only server-acknowledged pairing codes.
async function requestConfirmedCode(socket, phone, wa, browser) {
  const creds = socket.authState.creds;
  const code = wa.bytesToCrockford(randomBytes(5));
  creds.pairingCode = code;
  creds.me = { id: wa.jidEncode(phone, 's.whatsapp.net'), name: '~' };
  socket.ev.emit('creds.update', creds);
  const salt = randomBytes(32), iv = randomBytes(16);
  const key = await wa.derivePairingCodeKey(code, salt);
  const wrapped = Buffer.concat([salt, iv, wa.aesEncryptCTR(creds.pairingEphemeralKeyPair.public, key, iv)]);
  const response = await socket.query({
    tag: 'iq', attrs: { to: wa.S_WHATSAPP_NET, type: 'set', id: socket.generateMessageTag(), xmlns: 'md' },
    content: [{ tag: 'link_code_companion_reg', attrs: { jid: creds.me.id, stage: 'companion_hello', should_show_push_notification: 'true' }, content: [
      { tag: 'link_code_pairing_wrapped_companion_ephemeral_pub', attrs: {}, content: wrapped },
      { tag: 'companion_server_auth_key_pub', attrs: {}, content: creds.noiseKey.public },
      { tag: 'companion_platform_id', attrs: {}, content: wa.getCompanionPlatformId(browser) },
      { tag: 'companion_platform_display', attrs: {}, content: `${browser[1]} (${browser[0]})` },
      { tag: 'link_code_pairing_nonce', attrs: {}, content: Buffer.from([0]) }
    ] }]
  });
  const registration = wa.getBinaryNodeChild(response, 'link_code_companion_reg');
  const ref = wa.getBinaryNodeChildBuffer(registration, 'link_code_pairing_ref');
  if (!ref?.length) throw new Error('WhatsApp did not accept the pairing-code request.');
  return code;
}
module.exports = { requestConfirmedCode };
