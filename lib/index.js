// lib/index.js - DEX Nova version (deobfuscated, cleaned & updated)
// Main entry point - starts the bot, connects to WhatsApp, loads plugins

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const figlet = require('figlet');
const chalk = require('chalk');

// Import custom modules
const { connectToWhatsApp } = require('./auth');
const { getAlive } = require('./alive');
const config = require('./config');

// Logger setup
const logger = pino({ level: config.BAILEYS_LOG_LVL || 'silent' });

// ASCII banner
console.log(chalk.green(figlet.textSync('DEX NOVA', { font: 'Standard' })));
console.log(chalk.cyan('Powered By Dex - Version ' + config.VERSION));

// Session ID from config
const SESSION_ID = config.SESSION_ID || 'dexnova-default';
console.log(chalk.yellow(`[DEX Nova] Starting with session: ${SESSION_ID}`));

// Global bot instance
let sock = null;

// Connect function
async function startBot() {
  try {
    sock = await connectToWhatsApp(SESSION_ID);

    // Event: Connection update
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.green('[DEX Nova] Scan QR to pair:'));
        require('qrcode-terminal').generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(chalk.red(`[DEX Nova] Connection closed: ${lastDisconnect?.error}`));
        console.log(chalk.yellow(`Reconnecting? ${shouldReconnect ? 'Yes' : 'No (logged out)'}`));

        if (shouldReconnect) {
          startBot();
        } else {
          console.log(chalk.red('[DEX Nova] Logged out. Delete sessions folder and pair again.'));
        }
      } else if (connection === 'open') {
        console.log(chalk.green(`[DEX Nova] Connected successfully! Session: ${SESSION_ID}`));

        // Send alive message to owner or console
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

    // Event: Messages upsert (main message handler)
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

      if (!text) return;

      // Check if bot is mentioned or command prefix
      const prefixRegex = new RegExp(`^${config.PREFIX}`, 'i');
      const isCommand = prefixRegex.test(text);
      const isMentioned = text.includes(sock.user.id.split(':')[0]);

      if (!isCommand && !isMentioned) return;

      const commandText = isCommand ? text.replace(prefixRegex, '').trim() : text;
      const command = commandText.split(' ')[0].toLowerCase();
      const args = commandText.split(' ').slice(1);

      // Load plugins dynamically (from plugins folder)
      const pluginsDir = path.join(__dirname, '../plugins');
      const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));

      for (const file of pluginFiles) {
        try {
          const plugin = require(path.join(pluginsDir, file));
          if (plugin.name === command || plugin.alias?.includes(command)) {
            await plugin.start(sock, msg, { prefix: config.PREFIX, args, command });
            break;
          }
        } catch (err) {
          console.error(chalk.red(`[Plugin Error] ${file}: ${err.message}`));
        }
      }
    });

  } catch (error) {
    console.error(chalk.red('[DEX Nova] Fatal error:', error.message));
    setTimeout(startBot, 5000); // Retry after 5s
  }
}

// Start the bot
startBot();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(chalk.red('[DEX Nova] Uncaught Exception:', err.stack));
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('[DEX Nova] Unhandled Rejection:', reason));
});