// lib/client.js - DEX Nova version (deobfuscated, cleaned & updated)
// Baileys client wrapper - connects, handles events, loads plugins, anti-delete, etc.

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

// Global client
let client = null;

// Start client
async function startClient() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, config.SESSION_ID));

    const { version } = await fetchLatestBaileysVersion();

    client = makeWASocket({
      version,
      logger,
      auth: state,
      printQRInTerminal: true,
      browser: Browsers.macOS('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: toBool(config.ALWAYS_ONLINE),
      generateHighQualityLinkPreview: true,
      getMessage: async key => {
        // Optional: fetch message from store if needed
        return { conversation: 'DEX Nova' };
      }
    });

    // Save creds on update
    client.ev.on('creds.update', saveCreds);

    // Connection events
    client.ev.on('connection.update', async update => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(chalk.green('[DEX Nova] Scan QR to pair session'));
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(chalk.red(`Connection closed: ${lastDisconnect?.error}`));
        console.log(chalk.yellow(`Reconnect? ${shouldReconnect ? 'Yes' : 'No (logged out)'}`));

        if (shouldReconnect) {
          startClient();
        } else {
          console.log(chalk.red('[DEX Nova] Logged out. Clear sessions and pair again.'));
        }
      }

      if (connection === 'open') {
        console.log(chalk.green(`[DEX Nova] Connected! Session: ${config.SESSION_ID}`));

        // Send alive status
        const aliveMsg = getAlive();
        console.log(chalk.blue(aliveMsg));

        // Send to sudo/owner if set
        if (config.SUDO) {
          const owners = config.SUDO.split(',').map(n => n.trim() + '@s.whatsapp.net');
          for (const owner of owners) {
            await client.sendMessage(owner, { text: aliveMsg });
          }
        }
      }
    });

    // Messages handler
    client.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if (!text) continue;

        // Check prefix or mention
        const prefixRegex = new RegExp(`^${config.PREFIX}`, 'i');
        const isCmd = prefixRegex.test(text);
        const isMention = text.includes(client.user.id.split(':')[0]);

        if (!isCmd && !isMention) continue;

        const cmdText = isCmd ? text.replace(prefixRegex, '').trim() : text;
        const cmd = cmdText.split(' ')[0].toLowerCase();
        const args = cmdText.split(' ').slice(1);

        // Load plugins from plugins/
        const pluginsDir = path.join(__dirname, '../plugins');
        const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

        for (const file of pluginFiles) {
          try {
            const plugin = require(path.join(pluginsDir, file));
            if (plugin.name === cmd || plugin.alias?.includes(cmd)) {
              await plugin.start(client, msg, { prefix: config.PREFIX, args, command: cmd });
              break;
            }
          } catch (err) {
            console.error(chalk.red(`Plugin error in ${file}: ${err.message}`));
          }
        }
      }
    });

    // Anti-delete (optional)
    client.ev.on('messages.delete', async ({ keys }) => {
      if (toBool(config.ANTI_DELETE)) {
        console.log(chalk.yellow('[Anti-Delete] Detected deletion'));
        // Re-send deleted messages or notify
      }
    });

  } catch (err) {
    console.error(chalk.red('[DEX Nova] Client error:', err.message));
    setTimeout(startClient, 5000);
  }
}

// Start
startClient();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('[DEX Nova] Shutting down...'));
  if (client) await client.logout();
  process.exit(0);
});

module.exports = { client, startClient };