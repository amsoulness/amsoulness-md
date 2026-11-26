const { randomUUID } = require('node:crypto');
function buildContent(html, title) {
  const responseId = randomUUID();
  const response = {
    __typename: 'GenAIUnifiedResponse', response_id: responseId,
    sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: {
      __typename: 'GenAISingleLayoutViewModel', primitive: {
        __typename: 'FOAHtmlPrimitiveDemoDONOTUSE', trusted_sources: [], payload: html,
      },
    } }],
  };
  return {
    messageContextInfo: { botMetadata: { botResponseId: responseId } },
    richResponseMessage: {
      messageType: 1,
      submessages: [{ messageType: 2, messageText: `${title} — interactive HTML. Requires a compatible WhatsApp client. Send the command again with "file" to get the HTML document.` }],
      unifiedResponse: { data: Buffer.from(JSON.stringify(response), 'utf8') },
      contextInfo: { isForwarded: true, forwardOrigin: 4 },
    },
  };
}
async function sendRichApp(client, jid, html, title, load) {
  const { proto, generateWAMessageFromContent } = await (load || require('./helpers').loadBaileys)();
  const message = generateWAMessageFromContent(jid, buildContent(html, title), { userJid: client.user?.id });
  const { messageContextInfo, ...innerMessage } = message.message;
  message.message = proto.Message.fromObject({ messageContextInfo, botForwardedMessage: { message: innerMessage } });
  await client.relayMessage(jid, message.message, { messageId: message.key.id });
  // An edit nudges compatible clients to render the rich envelope. If only this
  // edit fails, the first message was already sent: don't duplicate the app.
  try {
    const edit = generateWAMessageFromContent(jid, proto.Message.fromObject({
      botForwardedMessage: { message: { protocolMessage: {
        key: message.key, type: proto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
        timestampMs: Date.now(), editedMessage: message.message,
      } } },
    }), { userJid: client.user?.id });
    await client.relayMessage(jid, edit.message, { messageId: edit.key.id });
    return { message, edited: true };
  } catch { return { message, edited: false }; }
}
module.exports = { buildContent, sendRichApp };
