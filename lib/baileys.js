// lib/baileys.js - DEX Nova version (deobfuscated, cleaned & updated)
// Baileys wrapper - multi-device connection, event handling, reconnection logic

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');

// Custom imports
const config = require('./config');
const { getAlive } = require('./alive');
const { sessionDir } = require('./auth');

// Logger
const logger = pino({ level: config.BAILEYS_LOG_LVL || 'silent' });

// Banner
console.log(chalk.green(figlet.textSync('DEX NOVA', { font: 'Standard' })));
console.log(chalk.cyan(`Version: ${config.VERSION} | Powered By Dex`));
console.log(chalk.yellow(`Session: ${config.SESSION_ID}`));

// Global socket
let sock = null;

/**
 * Start Baileys connection
 * @returns {Promise<void>}
 */
async function connectBaileys() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(sessionDir, config.SESSION_ID)
    );

    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.macOS('Chrome'), // or ['DEX Nova', 'Chrome', '126.0']
      syncFullHistory: false,
      markOnlineOnConnect: config.ALWAYS_ONLINE === 'true',
      generateHighQualityLinkPreview: true,
      getMessage: async key => {
        return { conversation: 'DEX Nova' }; // fallback
      }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Connection update
    sock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.green('[DEX Nova] Scan this QR to pair:'));
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(
          chalk.red(`[Connection closed] ${lastDisconnect?.error || 'Unknown error'}`)
        );
        console.log(chalk.yellow(`Reconnect? ${shouldReconnect ? 'Yes' : 'No (logged out)'}`));

        if (shouldReconnect) {
          connectBaileys();
        } else {
          console.log(chalk.red('[DEX Nova] Logged out. Clear sessions folder and pair again.'));
        }
      }

      if (connection === 'open') {
        console.log(chalk.green(`[DEX Nova] Connected successfully! Session: ${config.SESSION_ID}`));

        // Send alive status to console
        const aliveMsg = getAlive();
        console.log(chalk.blue(aliveMsg));

        // Optional: Send alive to sudo/owner
        if (config.SUDO) {
          const owners = config.SUDO.split(',').map(num => num.trim() + '@s.whatsapp.net');
          for (const owner of owners) {
            await sock.sendMessage(owner, { text: aliveMsg });
          }
        }
      }
    });

    // Handle incoming messages (forward to cmd.js or plugins)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if (!text) continue;

        // Forward to command handler (you can move this to cmd.js)
        const prefixRegex = new RegExp(`^${config.PREFIX}`, 'i');
        if (!prefixRegex.test(text)) continue;

        const cmdText = text.replace(prefixRegex, '').trim();
        const cmd = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);

        // Load plugins or call handleCommand from cmd.js
        console.log(chalk.yellow(`[CMD] ${msg.key.participant?.split('@')[0] || 'User'} used: ${cmd} ${args.join(' ')}`));

        // Example: simple ping command
        if (cmd === 'ping') {
          await sock.sendMessage(from, { text: '_Pong! DEX Nova is alive 🚀_' });
        }

        // Add more commands or forward to cmd.js
      }
    });

    // Anti-delete (optional)
    sock.ev.on('messages.delete', async ({ keys }) => {
      if (config.ANTI_DELETE === 'true') {
        console.log(chalk.yellow('[Anti-Delete] Message deleted detected'));
        // You can re-send or notify here
      }
    });

  } catch (err) {
    console.error(chalk.red('[Baileys Error]:', err.message));
    setTimeout(connectBaileys, 5000); // retry
  }
}

// Export
module.exports = {
  sock,
  connectBaileys
};