// DEBUG: one console line per message, then the whole payload
const { debugOn } = require("../../helpers");

module.exports = async function debugLog(env, next) {
  if (debugOn()) {
    const { msg } = env;
    // Credential commands must never dump the key or the raw message payload.
    if (/renderkey|rnd_[a-z0-9_-]+/i.test(env.text || '')) {
      console.log('[msg] private Render credential command [redacted]');
      return await next();
    }
    console.log(
      `[msg] ${env.isGroup ? "group" : env.isPM ? "pm" : env.jid.endsWith("@newsletter") ? "channel" : "status"} ${env.jid} from ${env.sender}${
        env.fromMe ? " (me)" : ""
      } | ${env.type}: ${env.text || "<no text>"}
       ${JSON.stringify(msg.message, null, 2)}`,
    );
  }
  await next();
};
