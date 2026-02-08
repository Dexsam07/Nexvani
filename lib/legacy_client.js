// lib/legacy_client.js - DEX Nova version (deobfuscated, cleaned & updated)
// Legacy Baileys client wrapper (multi-device) - used as fallback or for old sessions

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
console.log(chalk.cyan(`Legacy Client - Version: ${config.VERSION}`));
console.log(chalk.yellow(`Session: ${config.SESSION_ID}`));

// Global legacy socket
let legacySock = null;

/**
 * Legacy Baileys connection (multi-device mode)
 * Used as fallback or for old pairing sessions
 */
async function startLegacyClient() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(sessionDir, `${config.SESSION_ID}_legacy`)
    );

    const { version } = await fetchLatestBaileysVersion();

    legacySock = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.macOS('Safari'), // Legacy mode - Safari for better compatibility
      syncFullHistory: false,
      markOnlineOnConnect: config.ALWAYS_ONLINE === 'true',
      generateHighQualityLinkPreview: true,
      getMessage: async key => {
        return { conversation: 'DEX Nova Legacy' };
      }
    });

    // Save creds
    legacySock.ev.on('creds.update', saveCreds);

    // Connection events
    legacySock.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.green('[Legacy] Scan QR for legacy session pairing'));
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(chalk.red(`[Legacy] Connection closed: ${lastDisconnect?.error || 'Unknown'}`));
        console.log(chalk.yellow(`Reconnect? ${shouldReconnect ? 'Yes' : 'No (logged out)'}`));

        if (shouldReconnect) {
          startLegacyClient();
        } else {
          console.log(chalk.red('[Legacy] Logged out. Delete legacy session folder to pair again.'));
        }
      }

      if (connection === 'open') {
        console.log(chalk.green(`[Legacy] Connected! Session: ${config.SESSION_ID}_legacy`));

        const aliveMsg = getAlive() + '\n(Using Legacy Client)';
        console.log(chalk.blue(aliveMsg));

        // Optional: Notify sudo/owner
        if (config.SUDO) {
          const owners = config.SUDO.split(',').map(n => n.trim() + '@s.whatsapp.net');
          for (const owner of owners) {
            await legacySock.sendMessage(owner, { text: aliveMsg });
          }
        }
      }
    });

    // Messages handler (same as main client)
    legacySock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if (!text) continue;

        const prefixRegex = new RegExp(`^${config.PREFIX}`, 'i');
        if (!prefixRegex.test(text)) continue;

        const cmdText = text.replace(prefixRegex, '').trim();
        const cmd = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);

        console.log(chalk.yellow(`[Legacy CMD] ${msg.key.participant?.split('@')[0] || 'User'} used: ${cmd} ${args.join(' ')}`));

        // Forward to main command handler or handle legacy-specific commands
        // For example:
        if (cmd === 'ping') {
          await legacySock.sendMessage(from, { text: '_Pong! Legacy client is alive 🚀_' });
        }

        // You can route to same cmd.js handler if needed
      }
    });

  } catch (err) {
    console.error(chalk.red('[Legacy Client Error]:', err.message));
    setTimeout(startLegacyClient, 8000); // retry after 8s
  }
}

// Export
module.exports = {
  legacySock,
  startLegacyClient
};