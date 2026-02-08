// lib/auth.js - DEX Nova version (deobfuscated & updated)
// Handles multi-device auth state, session saving/loading

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const sessionDir = path.join(__dirname, '../sessions'); // sessions folder

// Ensure sessions directory exists
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

/**
 * Load or create auth state for a given session ID
 * @param {string} sessionId - e.g. 'dexnova-123456'
 * @returns {Promise<{ state, saveCreds }>}
 */
async function getAuthState(sessionId) {
  const sessionPath = path.join(sessionDir, sessionId);

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  return { state, saveCreds };
}

/**
 * Connect to WhatsApp with given session
 * @param {string} sessionId 
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
async function connectToWhatsApp(sessionId = 'dexnova-default') {
  const logger = pino({ level: 'silent' });

  const { state, saveCreds } = await getAuthState(sessionId);

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: true,
    syncFullHistory: false,
    browser: ['DEX Nova', 'Chrome', '126.0.0.0'], // Custom browser signature
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[DEX Nova] Scan this QR code to pair session:', sessionId);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('[DEX Nova] Connection closed:', lastDisconnect?.error, 'Reconnecting?', shouldReconnect);

      if (shouldReconnect) {
        connectToWhatsApp(sessionId);
      } else {
        console.log('[DEX Nova] Logged out. Delete session and pair again.');
      }
    } else if (connection === 'open') {
      console.log(`[DEX Nova] Connected successfully! Session: ${sessionId}`);
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    // Handle incoming messages (forward to main handler if needed)
    console.log('[DEX Nova] New message received:', m.messages[0]?.message);
  });

  return sock;
}

module.exports = {
  connectToWhatsApp,
  getAuthState,
  sessionDir
};