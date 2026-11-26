const fs = require('node:fs');
const path = require('node:path');
const HEADER = path.join(__dirname, '../plugins/utils/images/amsoulness-motion.mp4');
async function sendAnimatedHeader(client, jid, caption, enabled = true) {
  if (!enabled) return false;
  try {
    await client.sendMessage(jid, { video: fs.readFileSync(HEADER), mimetype: 'video/mp4', gifPlayback: true, caption });
    return true;
  } catch { return false; }
}
module.exports = { sendAnimatedHeader };
