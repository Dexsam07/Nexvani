// lib/participantUpdate.js - DEX Nova version (cleaned & updated)
// Handles group participant updates (add, remove, promote, demote) with logs & anti-bot

const { getDb } = require('./db');
const config = require('./config');
const { client } = require('./client'); // or your main sock

/**
 * Handle group participant update events
 * @param {Object} update - Baileys participant update payload
 */
async function handleParticipantUpdate(update) {
  const { id, participants, action } = update;

  if (!id.endsWith('@g.us')) return; // only groups

  const groupJid = id;
  const participant = participants[0]; // usually one at a time

  if (!participant) return;

  const who = participant.split('@')[0];
  const isBot = participant === client.user.id;

  // Log action
  console.log(`[Group Update] ${action} - ${who} in ${groupJid}`);

  try {
    switch (action) {
      case 'add':
        await handleUserAdded(groupJid, participant, isBot);
        break;

      case 'remove':
        await handleUserRemoved(groupJid, participant, isBot);
        break;

      case 'promote':
        await handlePromoted(groupJid, participant);
        break;

      case 'demote':
        await handleDemoted(groupJid, participant);
        break;

      default:
        console.log(`[Group Update] Unknown action: ${action}`);
    }
  } catch (err) {
    console.error('[Participant Update Error]:', err.message);
  }
}

/**
 * When someone is added to group
 */
async function handleUserAdded(groupJid, userJid, isBot) {
  // Anti-bot: kick if not allowed
  if (isBot && config.ANTI_BOT === 'true') {
    await client.groupParticipantsUpdate(groupJid, [userJid], 'remove');
    console.log(`[Anti-Bot] Removed bot: ${userJid.split('@')[0]}`);
    return;
  }

  // Welcome message (optional)
  if (config.WELCOME_MSG === 'true') {
    const welcomeText = `Welcome @${userJid.split('@')[0]} to the group! 👋\nEnjoy your stay 🚀`;
    await client.sendMessage(groupJid, {
      text: welcomeText,
      mentions: [userJid]
    });
  }

  // Save to db (optional: track join date)
  const db = await getDb();
  await db.collection('group_members').updateOne(
    { groupJid, userJid },
    { $set: { joinedAt: new Date(), status: 'member' } },
    { upsert: true }
  );
}

/**
 * When someone is removed
 */
async function handleUserRemoved(groupJid, userJid, isBot) {
  if (isBot) return; // bot removed itself? ignore

  // Goodbye message (optional)
  if (config.GOODBYE_MSG === 'true') {
    const goodbyeText = `Goodbye @${userJid.split('@')[0]} 👋 Take care!`;
    await client.sendMessage(groupJid, {
      text: goodbyeText,
      mentions: [userJid]
    });
  }

  // Update db
  const db = await getDb();
  await db.collection('group_members').updateOne(
    { groupJid, userJid },
    { $set: { leftAt: new Date(), status: 'left' } }
  );
}

/**
 * When someone is promoted to admin
 */
async function handlePromoted(groupJid, userJid) {
  const db = await getDb();
  await db.collection('group_members').updateOne(
    { groupJid, userJid },
    { $set: { isAdmin: true, promotedAt: new Date() } }
  );

  // Optional notify
  if (config.ADMIN_NOTIFY === 'true') {
    await client.sendMessage(groupJid, {
      text: `🎉 @${userJid.split('@')[0]} is now an admin!`,
      mentions: [userJid]
    });
  }
}

/**
 * When someone is demoted
 */
async function handleDemoted(groupJid, userJid) {
  const db = await getDb();
  await db.collection('group_members').updateOne(
    { groupJid, userJid },
    { $set: { isAdmin: false, demotedAt: new Date() } }
  );

  // Optional notify
  if (config.ADMIN_NOTIFY === 'true') {
    await client.sendMessage(groupJid, {
      text: `⚠️ @${userJid.split('@')[0]} is no longer admin.`,
      mentions: [userJid]
    });
  }
}

// Export
module.exports = {
  handleParticipantUpdate
};