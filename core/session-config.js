// Shared parser for portable ASLNS tokens and upstream labelled local logins.
function parseSessionConfig(raw, warn = console.warn) {
// ids never depend on the method, so switching qr/pair keeps a linked account
const importedIds = require('./session-token').parseSessions((raw || '').split(',').filter(token => token.includes('~')).join(','));
const sessionEntries = [];
let importedIndex = 0;
const LOGIN_METHODS = {};
let unnamedLocals = 0;
for (const token of (raw || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  let entry;
  if (token.includes("~")) {
    const id = importedIds[importedIndex++];
    if (!id) continue;
    entry = { id, local: false };
  } else {
    const colon = token.indexOf(":");
    const method = (colon === -1 ? token : token.slice(0, colon)).trim().toLowerCase();
    if (method !== "qr" && method !== "pair") {
      warn(`⚠️ SESSION "${token}" is not a session string (like ASLNS~...), "qr" or "pair". Logging in with a QR code instead.`);
    }
    let name = colon === -1 ? null : token.slice(colon + 1).trim().toLowerCase();
    // digit names would collide with positional local-2
    if (name !== null && /^\d+$/.test(name)) {
      warn(`⚠️ SESSION "${token}": a name can't be only digits (put the phone number in PAIRING_NUMBER). Ignoring the name.`);
      name = null;
    } else if (name !== null && !/^[a-z0-9_-]{1,24}$/.test(name)) {
      warn(`⚠️ SESSION "${token}": names may use only a-z, 0-9, _ and -, up to 24 characters. Ignoring the name.`);
      name = null;
    }
    const id = name ? `local-${name}` : ++unnamedLocals === 1 ? "local" : `local-${unnamedLocals}`;
    entry = { id, local: true, method: method === "pair" ? "pair" : "qr" };
  }
  if (sessionEntries.some((e) => e.id === entry.id)) {
    warn(`⚠️ SESSION lists "${entry.id}" twice. Starting it once.`);
    continue;
  }
  sessionEntries.push(entry);
}
if (sessionEntries.length === 0) sessionEntries.push({ id: "local", local: true, method: "qr" });
for (const entry of sessionEntries) {
  if (entry.local) LOGIN_METHODS[entry.id] = entry.method;
}

const SESSION = sessionEntries.map((entry) => entry.id);
const LOCAL_SESSIONS = Object.keys(LOGIN_METHODS);


return { SESSION, LOCAL_SESSIONS, LOGIN_METHODS };
}
module.exports = { parseSessionConfig };
