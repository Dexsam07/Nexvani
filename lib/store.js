// lib/store.js - DEX Nova version (cleaned & updated)
// Group metadata store with caching, sync, and participant tracking

const { getDb } = require('./db');
const config = require('./config');
const { client } = require('./client'); // your baileys sock

// In-memory cache
const groupCache = new Map(); // groupJid → metadata
const participantCache = new Map(); // groupJid → { participants: [], admins: [] }

/**
 * Fetch and cache group metadata
 * @param {string} groupJid - Group JID
 * @param {boolean} [forceRefresh=false] - Force API call
 * @returns {Promise<Object|null>} Group metadata or null
 */
async function fetchGroupMetadata(groupJid, forceRefresh = false) {
  if (!groupJid.endsWith('@g.us')) return null;

  // Check cache first
  if (!forceRefresh && groupCache.has(groupJid)) {
    return groupCache.get(groupJid);
  }

  try {
    const metadata = await client.groupMetadata(groupJid);

    // Cache it
    groupCache.set(groupJid, metadata);

    // Also cache participants/admins
    const participants = metadata.participants || [];
    const admins = participants.filter(p => p.admin).map(p => p.id);

    participantCache.set(groupJid, {
      participants: participants.map(p => p.id),
      admins,
      owner: metadata.owner,
      subject: metadata.subject,
      desc: metadata.desc?.toString() || '',
      creation: metadata.creation,
      cachedAt: Date.now()
    });

    console.log(`[Store] Cached metadata for \( {groupJid} ( \){metadata.subject})`);

    return metadata;
  } catch (err) {
    console.error(`[Store] Failed to fetch metadata for ${groupJid}:`, err.message);
    return null;
  }
}

/**
 * Get cached group metadata (or fetch if missing/expired)
 * @param {string} groupJid
 * @param {number} [maxAge=300000] - Cache valid for 5 minutes
 */
async function getGroupMetadata(groupJid, maxAge = 5 * 60 * 1000) {
  const cached = groupCache.get(groupJid);
  const now = Date.now();

  if (cached && (now - cached.cachedAt) < maxAge) {
    return cached;
  }

  return await fetchGroupMetadata(groupJid, true);
}

/**
 * Get participants/admins from cache or fetch
 * @param {string} groupJid
 */
async function getGroupParticipants(groupJid) {
  const cached = participantCache.get(groupJid);
  if (cached) return cached;

  const meta = await fetchGroupMetadata(groupJid);
  if (!meta) return null;

  return participantCache.get(groupJid);
}

/**
 * Check if user is admin in group
 * @param {string} groupJid
 * @param {string} userJid
 */
async function isGroupAdmin(groupJid, userJid) {
  const data = await getGroupParticipants(groupJid);
  if (!data) return false;

  return data.admins.includes(userJid);
}

/**
 * Check if user is group owner
 * @param {string} groupJid
 * @param {string} userJid
 */
async function isGroupOwner(groupJid, userJid) {
  const data = await getGroupParticipants(groupJid);
  if (!data || !data.owner) return false;

  return data.owner === userJid;
}

/**
 * Sync group metadata on events (add/remove/promote/demote)
 */
client.ev.on('group-participants.update', async (update) => {
  const { id: groupJid } = update;

  // Force refresh cache on any participant change
  await fetchGroupMetadata(groupJid, true);
  console.log(`[Store] Refreshed cache for ${groupJid} after participant update`);
});

/**
 * Clear cache for a group (manual refresh)
 * @param {string} groupJid
 */
function clearGroupCache(groupJid) {
  groupCache.delete(groupJid);
  participantCache.delete(groupJid);
  console.log(`[Store] Cleared cache for ${groupJid}`);
}

// Export
module.exports = {
  fetchGroupMetadata,
  getGroupMetadata,
  getGroupParticipants,
  isGroupAdmin,
  isGroupOwner,
  clearGroupCache
};