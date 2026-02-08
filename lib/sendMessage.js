// lib/sendMessage.js - DEX Nova version (cleaned & updated)
// Enhanced WhatsApp message sending utilities with typing indicators, reactions, edits, and more

const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { getMIMEType } = require('node-mime-types');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Send text message with optional typing simulation
 * @param {string} jid - Recipient JID
 * @param {string} text - Message text
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} Sent message key
 */
async function sendText(jid, text, options = {}) {
  const { simulateTyping = true, quote, mentions } = options;

  if (simulateTyping && config.SIMULATE_TYPING === 'true') {
    await client.presenceSubscribe(jid);
    await client.sendPresenceUpdate('composing', jid);
    await new Promise(r => setTimeout(r, Math.random() * 1500 + 500)); // 0.5-2s typing
    await client.sendPresenceUpdate('available', jid);
  }

  const msg = await client.sendMessage(jid, { 
    text,
    mentions: mentions || (quote ? [quote.key.participant] : undefined),
    quoted: quote
  }, { ...options });

  return msg;
}

/**
 * Send image with caption
 * @param {string} jid
 * @param {string|Buffer} image - Path, URL or Buffer
 * @param {string} caption
 * @param {Object} [options]
 */
async function sendImage(jid, image, caption = '', options = {}) {
  let media;

  if (typeof image === 'string' && image.startsWith('http')) {
    media = { url: image };
  } else if (Buffer.isBuffer(image)) {
    media = image;
  } else {
    media = fs.readFileSync(image);
  }

  const msg = await client.sendMessage(jid, {
    image: media,
    caption,
    mimetype: getMIMEType(image) || 'image/jpeg',
    ...options
  });

  return msg;
}

/**
 * Send document (PDF, ZIP, etc.)
 * @param {string} jid
 * @param {string|Buffer} file - Path or Buffer
 * @param {string} filename
 * @param {string} mimetype
 * @param {string} caption
 */
async function sendDocument(jid, file, filename, mimetype, caption = '') {
  let buffer;

  if (typeof file === 'string') {
    buffer = fs.readFileSync(file);
  } else {
    buffer = file;
  }

  return await client.sendMessage(jid, {
    document: buffer,
    fileName: filename,
    mimetype: mimetype || 'application/octet-stream',
    caption
  });
}

/**
 * Send reaction to a message
 * @param {string} jid
 * @param {Object} key - Message key to react to
 * @param {string} emoji - Reaction emoji
 */
async function sendReaction(jid, key, emoji = '👍') {
  await client.sendMessage(jid, {
    react: {
      text: emoji,
      key
    }
  });
}

/**
 * Edit a sent message (if supported)
 * @param {string} jid
 * @param {Object} key - Original message key
 * @param {string} newText
 */
async function editMessage(jid, key, newText) {
  try {
    await client.sendMessage(jid, { text: newText, edit: key });
    console.log('[Edit] Message edited successfully');
  } catch (err) {
    console.error('[Edit Failed]:', err.message);
    // Fallback: send new message
    await sendText(jid, `*(edited)* ${newText}`);
  }
}

/**
 * Send poll message
 * @param {string} jid
 * @param {string} question
 * @param {string[]} options
 * @param {number} [selectableCount=1]
 */
async function sendPoll(jid, question, options, selectableCount = 1) {
  return await client.sendMessage(jid, {
    poll: {
      name: question,
      values: options,
      selectableCount
    }
  });
}

/**
 * Send location message
 * @param {string} jid
 * @param {number} lat
 * @param {number} lon
 * @param {string} name
 * @param {string} address
 */
async function sendLocation(jid, lat, lon, name = '', address = '') {
  return await client.sendMessage(jid, {
    location: { degreesLatitude: lat, degreesLongitude: lon, name, address }
  });
}

// Export all utilities
module.exports = {
  sendText,
  sendImage,
  sendDocument,
  sendReaction,
  editMessage,
  sendPoll,
  sendLocation
};