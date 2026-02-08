// lib/pm2.js - DEX Nova version (cleaned & updated)
// PM2 process manager wrapper - start, stop, restart, logs, status for bot instances

const pm2 = require('pm2');
const util = require('util');
const path = require('path');
const { exec } = require('child_process');
const config = require('./config');

// Promisify PM2 methods
const pm2Connect = util.promisify(pm2.connect);
const pm2List = util.promisify(pm2.list);
const pm2Start = util.promisify(pm2.start);
const pm2Restart = util.promisify(pm2.restart);
const pm2Stop = util.promisify(pm2.stop);
const pm2Delete = util.promisify(pm2.delete);
const pm2Logs = util.promisify(pm2.logs);
const pm2Describe = util.promisify(pm2.describe);

/**
 * Connect to PM2 daemon
 */
async function connectPM2() {
  try {
    await pm2Connect();
    console.log('[PM2] Connected successfully');
  } catch (err) {
    console.error('[PM2 Connect Error]:', err.message);
    throw err;
  }
}

/**
 * Get all running processes
 * @returns {Promise<Array>} List of PM2 processes
 */
async function getProcesses() {
  try {
    return await pm2List();
  } catch (err) {
    console.error('[PM2 List Error]:', err.message);
    return [];
  }
}

/**
 * Start bot with PM2
 * @param {string} name - Process name (e.g. 'dexnova-main')
 * @param {string} script - Path to entry file (e.g. index.js)
 */
async function startBot(name = 'dexnova', script = 'index.js') {
  const scriptPath = path.resolve(process.cwd(), script);

  const pm2Config = {
    name,
    script: scriptPath,
    cwd: process.cwd(),
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      ...process.env
    },
    error_file: path.join(process.cwd(), 'logs', `${name}-err.log`),
    out_file: path.join(process.cwd(), 'logs', `${name}-out.log`),
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  };

  try {
    await pm2Start(pm2Config);
    console.log(`[PM2] Started ${name} successfully`);
    return true;
  } catch (err) {
    console.error(`[PM2 Start Error] ${name}:`, err.message);
    return false;
  }
}

/**
 * Restart a process by name
 * @param {string} name - Process name
 */
async function restartBot(name = 'dexnova') {
  try {
    await pm2Restart(name);
    console.log(`[PM2] Restarted ${name}`);
    return true;
  } catch (err) {
    console.error(`[PM2 Restart Error] ${name}:`, err.message);
    return false;
  }
}

/**
 * Stop a process by name
 * @param {string} name - Process name
 */
async function stopBot(name = 'dexnova') {
  try {
    await pm2Stop(name);
    console.log(`[PM2] Stopped ${name}`);
    return true;
  } catch (err) {
    console.error(`[PM2 Stop Error] ${name}:`, err.message);
    return false;
  }
}

/**
 * Delete a process by name
 * @param {string} name - Process name
 */
async function deleteBot(name = 'dexnova') {
  try {
    await pm2Delete(name);
    console.log(`[PM2] Deleted ${name}`);
    return true;
  } catch (err) {
    console.error(`[PM2 Delete Error] ${name}:`, err.message);
    return false;
  }
}

/**
 * Get logs for a process
 * @param {string} name - Process name
 * @param {number} lines - Number of lines (default 50)
 */
async function getLogs(name = 'dexnova', lines = 50) {
  try {
    const logs = await pm2Logs(name, { n: lines });
    return logs || 'No logs available';
  } catch (err) {
    console.error(`[PM2 Logs Error] ${name}:`, err.message);
    return 'Error fetching logs';
  }
}

/**
 * Get detailed status of a process
 * @param {string} name - Process name
 */
async function getStatus(name = 'dexnova') {
  try {
    const [proc] = await pm2Describe(name);
    if (!proc) return null;

    return {
      name: proc.name,
      status: proc.pm2_env.status,
      restarts: proc.pm2_env.restart_time,
      uptime: proc.pm_uptime,
      memory: (proc.monit.memory / 1024 / 1024).toFixed(2) + ' MB',
      cpu: proc.monit.cpu + '%',
      pid: proc.pid,
      created_at: new Date(proc.pm2_env.created_at).toLocaleString()
    };
  } catch (err) {
    console.error(`[PM2 Status Error] ${name}:`, err.message);
    return null;
  }
}

/**
 * Disconnect from PM2
 */
async function disconnectPM2() {
  pm2.disconnect();
  console.log('[PM2] Disconnected');
}

// Auto-connect on require
(async () => {
  try {
    await connectPM2();
  } catch (err) {
    console.error('[PM2 Auto Connect Failed]');
  }
})();

module.exports = {
  connectPM2,
  getProcesses,
  startBot,
  restartBot,
  stopBot,
  deleteBot,
  getLogs,
  getStatus,
  disconnectPM2
};