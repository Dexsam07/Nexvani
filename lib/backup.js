// lib/backup.js - DEX Nova version (cleaned & updated)
// Automated backup system - sessions, database, config, plugins (local + optional Google Drive)

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const config = require('./config');
const { uploadFile, uploadUrlToDrive } = require('./drive'); // assuming you have drive.js

// Backup directories
const ROOT_DIR = path.join(__dirname, '..');
const SESSION_DIR = path.join(ROOT_DIR, 'session');
const DB_DIR = path.join(ROOT_DIR, 'database');
const CONFIG_FILE = path.join(ROOT_DIR, 'config.env');
const PLUGINS_DIR = path.join(ROOT_DIR, 'plugins');

// Backup output folder
const BACKUP_DIR = path.join(ROOT_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a full backup (sessions + db + config + plugins)
 * @param {boolean} uploadToDrive - Upload to Google Drive after backup
 * @returns {Promise<string>} Path to backup zip file
 */
async function createBackup(uploadToDrive = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `dexnova_backup_${timestamp}.zip`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  console.log(`[Backup] Starting full backup: ${backupName}`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      console.log(`[Backup] Completed: ${archive.pointer()} bytes`);
      
      if (uploadToDrive && config.GOOGLE_DRIVE_ENABLED === 'true') {
        try {
          const driveUrl = await uploadFile(backupPath, backupName);
          console.log(`[Backup] Uploaded to Google Drive: ${driveUrl}`);
          resolve({ local: backupPath, drive: driveUrl });
        } catch (err) {
          console.error('[Backup Drive Upload Error]:', err.message);
          resolve({ local: backupPath });
        }
      } else {
        resolve({ local: backupPath });
      }
    });

    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    // Add important folders/files
    if (fs.existsSync(SESSION_DIR)) {
      archive.directory(SESSION_DIR, 'session');
    }

    if (fs.existsSync(DB_DIR)) {
      archive.directory(DB_DIR, 'database');
    }

    if (fs.existsSync(PLUGINS_DIR)) {
      archive.directory(PLUGINS_DIR, 'plugins');
    }

    if (fs.existsSync(CONFIG_FILE)) {
      archive.file(CONFIG_FILE, { name: 'config.env' });
    }

    // Optional: package.json, index.js, etc.
    archive.file(path.join(ROOT_DIR, 'package.json'), { name: 'package.json' });
    archive.file(path.join(ROOT_DIR, 'index.js'), { name: 'index.js' });

    archive.finalize();
  });
}

/**
 * Auto backup every X hours (called from cron or setInterval)
 * @param {number} intervalHours - How often to backup (default 6 hours)
 */
function startAutoBackup(intervalHours = 6) {
  console.log(`[Backup] Auto-backup scheduled every ${intervalHours} hours`);

  setInterval(async () => {
    try {
      const result = await createBackup(true); // upload to drive
      console.log(`[Auto Backup] Success: ${result.local}`);
      if (result.drive) console.log(`Drive: ${result.drive}`);
    } catch (err) {
      console.error('[Auto Backup Failed]:', err.message);
    }
  }, intervalHours * 60 * 60 * 1000);

  // Run first backup immediately
  createBackup(true).catch(err => console.error('[Initial Backup Failed]:', err));
}

/**
 * Restore from a backup zip file
 * @param {string} backupPath - Path to .zip backup file
 */
async function restoreBackup(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  console.log(`[Restore] Starting restore from: ${backupPath}`);

  try {
    // Extract to temp folder first
    const tempExtract = path.join(ROOT_DIR, 'temp_restore');
    if (fs.existsSync(tempExtract)) {
      await execPromise(`rm -rf "${tempExtract}"`);
    }
    fs.mkdirSync(tempExtract, { recursive: true });

    await execPromise(`unzip -o "\( {backupPath}" -d " \){tempExtract}"`);

    // Copy session
    if (fs.existsSync(path.join(tempExtract, 'session'))) {
      await execPromise(`cp -r "\( {path.join(tempExtract, 'session')}"/* " \){SESSION_DIR}/"`);
      console.log('[Restore] Session restored');
    }

    // Copy database
    if (fs.existsSync(path.join(tempExtract, 'database'))) {
      await execPromise(`cp -r "\( {path.join(tempExtract, 'database')}"/* " \){DB_DIR}/"`);
      console.log('[Restore] Database restored');
    }

    // Copy config.env
    const tempConfig = path.join(tempExtract, 'config.env');
    if (fs.existsSync(tempConfig)) {
      fs.copyFileSync(tempConfig, CONFIG_FILE);
      console.log('[Restore] config.env restored');
    }

    // Copy plugins (careful - might overwrite custom changes)
    if (fs.existsSync(path.join(tempExtract, 'plugins'))) {
      await execPromise(`cp -r "\( {path.join(tempExtract, 'plugins')}"/* " \){PLUGINS_DIR}/"`);
      console.log('[Restore] Plugins restored');
    }

    // Clean temp
    await execPromise(`rm -rf "${tempExtract}"`);

    console.log('[Restore] Completed successfully. Restart bot to apply changes.');
  } catch (err) {
    console.error('[Restore Error]:', err.message);
    throw err;
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  startAutoBackup
};