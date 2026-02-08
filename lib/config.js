// lib/config.js - DEX Nova version (cleaned & updated)
// Loads .env, sets defaults, configures database (SQLite/Postgres)

const { Sequelize } = require('sequelize');
const { existsSync } = require('fs');
const path = require('path');

// Load .env file if exists
const configPath = path.join(__dirname, '../config.env');
if (existsSync(configPath)) {
  require('dotenv').config({ path: configPath });
}

const toBool = (val) => val === 'true' || val === true;

// Database path (SQLite fallback)
const dbPath = path.join(__dirname, '../database.db');
const dbUrl = process.env.DATABASE_URL || dbPath;

// Helper to create Sequelize instance
const createDb = () => {
  if (dbUrl === dbPath) {
    // Local SQLite
    return new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: false,
      retry: { max: 10 },
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: { busyTimeout: 10000 },
      hooks: {
        afterConnect: (conn) => {
          conn.run('PRAGMA synchronous = NORMAL;');
          conn.run('PRAGMA busy_timeout = 10000;');
        }
      }
    });
  } else {
    // Remote Postgres (Railway, Render, etc.)
    return new Sequelize(dbUrl, {
      dialect: 'postgres',
      ssl: true,
      protocol: 'postgres',
      dialectOptions: {
        native: true,
        ssl: { require: true, rejectUnauthorized: false }
      },
      logging: false
    });
  }
};

module.exports = {
  // Bot version from package.json
  VERSION: require('../package.json').version || '1.0.0',

  // Session ID (used for multi-device pairing)
  SESSION_ID: (process.env.SESSION_ID || 'dexnova-default').trim(),

  // Database instance
  DATABASE: createDb(),

  // Command prefix (default . ! ,)
  PREFIX: (process.env.PREFIX || '^[.,!]').trim(),

  // Sudo / owner numbers (comma separated)
  SUDO: process.env.SUDO || '',

  // Sticker pack name (default DEX Nova)
  STICKER_PACKNAME: process.env.STICKER_PACKNAME || '❤️,DEX Nova',

  // Bot online status
  ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || 'false',

  // Logging
  LOG_MSG: process.env.LOG_MSG || 'false',

  // Remove.bg API key
  RMBG_KEY: process.env.RMBG_KEY || 'null',

  // Baileys log level
  BAILEYS_LOG_LVL: process.env.BAILEYS_LOG_LVL || 'silent',

  // Language
  LANG: (process.env.LANG || 'en').toLowerCase(),

  // Warn settings
  WARN_LIMIT: process.env.WARN_LIMIT || 3,
  WARN_MESSAGE: process.env.WARN_MESSAGE || '⚠️ WARNING ⚠️\n*User:* &mention\n*Warn:* &warn\n*Remaining:* &remaining',

  // Anti-link / anti-spam messages
  ANTILINK_MSG: process.env.ANTILINK_MSG || '_Antilink Detected &mention kicked_',
  ANTISPAM_MSG: process.env.ANTISPAM_MSG || '_Antispam Detected &mention kicked_',
  ANTIWORDS_MSG: process.env.ANTIWORDS_MSG || '_AntiWord Detected &mention kicked_',

  // Other settings
  FORCE_LOGOUT: process.env.FORCE_LOGOUT || 'false',
  DISABLE_BOT: process.env.DISABLE_BOT || 'null',
  REJECT_CALL: process.env.REJECT_CALL || 'false',
  AUTO_STATUS_VIEW: (process.env.AUTO_STATUS_VIEW || 'false').trim(),
  SEND_READ: process.env.SEND_READ || 'false',
  AJOIN: process.env.AJOIN || 'false',
  GPT: (process.env.GPT || 'free').trim(),
  MODEL: (process.env.MODEL || 'gpt-3.5-turbo').trim(),
  ANTI_DELETE: (process.env.ANTI_DELETE || 'null').trim(),
  PERSONAL_MESSAGE: (process.env.PERSONAL_MESSAGE || 'null').trim(),
  DISABLE_START_MESSAGE: process.env.DISABLE_START_MESSAGE || 'false',

  // API keys (optional)
  BING_COOKIE: process.env.BING_COOKIE || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',

  // Deployment helpers
  HEROKU_APP_NAME: process.env.HEROKU_APP_NAME,
  HEROKU_API_KEY: process.env.HEROKU_API_KEY,
  KOYEB: process.env.KOYEB || 'false',
  RENDER_NAME: process.env.RENDER_NAME,
  TIMEZONE: process.env.TIMEZONE || 'Asia/Kolkata',

  // Reaction on commands
  CMD_REACTION: process.env.CMD_REACTION || 'true',

  // Auto update
  AUTO_UPDATE: process.env.AUTO_UPDATE || 'true'
};