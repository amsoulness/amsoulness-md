const { Module } = require('../main');
const fs = require('node:fs');
const path = require('node:path');
const { sendRichApp } = require('../core/rich-app');

const apps = {
  mariorun: { title: 'Amsoulness Mario Run', file: 'mariorun.html' },
  beatstudio: { title: 'Amsoulness Beat Studio', file: 'beatstudio.html' },
};
async function launch(message, app, asFile) {
  const file = path.join(__dirname, '../assets/interactive', app.file);
  try {
    const html = fs.readFileSync(file, 'utf8');
    const document = () => message.client.sendMessage(message.jid, {
      document: Buffer.from(html, 'utf8'), mimetype: 'text/html', fileName: app.file,
      caption: `${app.title} — open this HTML document in your browser to play.`,
    });
    if (asFile) return await document();
    try { return await sendRichApp(message.client, message.jid, html, app.title); }
    catch { return await document(); }
  } catch {
    return message.sendReply('The app could not be sent. Please try again shortly.');
  }
}
Module({
  pattern: 'mariorun(?:\\s+(file))?\\s*$', use: 'game',
  desc: 'Play Amsoulness Mario Run: three worlds, coins and double jumps.',
  usage: '.mariorun | .mariorun file',
  warn: 'Interactive rendering depends on the receiving WhatsApp client.',
}, (message, match) => launch(message, apps.mariorun, Boolean(match[1])));
Module({
  pattern: '(?:beatstudio|beststuido|beatstuido)(?:\\s+(file))?\\s*$', use: 'game',
  desc: 'Open Amsoulness Beat Studio: drum pads, patterns and a sequencer.',
  usage: '.beatstudio | .beatstudio file (alias: .beststuido)',
  warn: 'Tap a pad to enable audio. Interactive rendering depends on the WhatsApp client.',
}, (message, match) => launch(message, apps.beatstudio, Boolean(match[1])));
