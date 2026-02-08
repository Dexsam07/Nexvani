// lib/cmd.js - DEX Nova version (deobfuscated, cleaned & updated)
// Command handler - prefix detection, plugin routing, sudo check, cooldown, etc.

const { getDb, setDb } = require('./db');
const config = require('./config');
const { client } = require('./client'); // or your client instance
const fs = require('fs');
const path = require('path');

// Cooldown Map (userId -> lastCmdTime)
const cooldowns = new Map();

// Load all command files from plugins/
const pluginsDir = path.join(__dirname, '../plugins');
const commandFiles = fs.readdirSync(pluginsDir)
  .filter(file => file.endsWith('.js'));

// Command registry
const commands = new Map();
const aliases = new Map();

for (const file of commandFiles) {
  try {
    const plugin = require(path.join(pluginsDir, file));
    if (!plugin.name || typeof plugin.start !== 'function') continue;

    commands.set(plugin.name.toLowerCase(), plugin);

    if (plugin.alias && Array.isArray(plugin.alias)) {
      for (const alias of plugin.alias) {
        aliases.set(alias.toLowerCase(), plugin.name.toLowerCase());
      }
    }

    console.log(`[DEX Nova] Loaded command: ${plugin.name}`);
  } catch (err) {
    console.error(`[Plugin Load Error] ${file}: ${err.message}`);
  }
}

/**
 * Main command handler
 * @param {Object} sock - Baileys socket/client
 * @param {Object} msg - Incoming message
 * @param {Object} options - { prefix, args, command }
 */
async function handleCommand(sock, msg, { prefix, args, command }) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const isSudo = config.SUDO.split(',').map(n => n.trim()).includes(sender.split('@')[0]);

  // Cooldown check (skip for sudo)
  if (!isSudo) {
    const now = Date.now();
    const lastUsed = cooldowns.get(sender) || 0;
    const cooldownTime = 2000; // 2 seconds default

    if (now - lastUsed < cooldownTime) {
      return; // silent ignore or send "slow down"
    }
    cooldowns.set(sender, now);
  }

  // Resolve command from alias
  let cmdName = command.toLowerCase();
  if (aliases.has(cmdName)) {
    cmdName = aliases.get(cmdName);
  }

  const cmd = commands.get(cmdName);
  if (!cmd) return;

  // Permission check (if command has .sudoOnly)
  if (cmd.sudoOnly && !isSudo) {
    await sock.sendMessage(from, { text: '_This command is only for SUDO/OWNER_' });
    return;
  }

  try {
    // Execute command
    await cmd.start(sock, msg, { prefix, args, command: cmdName, isSudo, isGroup });

    // Log command usage (optional)
    console.log(`[CMD] ${sender.split('@')[0]} used: ${cmdName} ${args.join(' ')}`);
  } catch (err) {
    console.error(`[CMD ERROR] ${cmdName}: ${err.message}`);
    await sock.sendMessage(from, { text: '_Error executing command. Contact owner._' });
  }
}

module.exports = {
  handleCommand,

  // Optional: reload commands (for dev)
  reloadCommands: () => {
    // Clear old cache
    for (const file of commandFiles) {
      delete require.cache[require.resolve(path.join(pluginsDir, file))];
    }
    commands.clear();
    aliases.clear();

    // Re-load
    for (const file of commandFiles) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (!plugin.name || typeof plugin.start !== 'function') continue;

        commands.set(plugin.name.toLowerCase(), plugin);

        if (plugin.alias && Array.isArray(plugin.alias)) {
          for (const alias of plugin.alias) {
            aliases.set(alias.toLowerCase(), plugin.name.toLowerCase());
          }
        }
      } catch (err) {
        console.error(`[Reload Error] ${file}: ${err.message}`);
      }
    }
    console.log('[DEX Nova] Commands reloaded');
  }
};