// lib/alive.js (cleaned & deobfuscated version for DEX Nova)

const { secondsToHms } = require('./functions');  // assuming functions.js has secondsToHms

/**
 * Returns the alive/status message for .alive command
 * @returns {string} Formatted bot status message
 */
const getAlive = () => {
  return `
*DEX Nova Status*

Platform: ${process.platform}
Node Version: ${process.version}
Uptime: ${secondsToHms(process.uptime())}
Author: Dex
Bot: DEX Nova

Powered By Dex
  `.trim();
};

module.exports = {
  getAlive
};