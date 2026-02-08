// lib/antilink.js (deobfuscated, cleaned & branded for DEX Nova)

const { getAntiLink } = require('../lib/functions'); // या जो भी path है

const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|ftp:\/\/[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;

const isSuspiciousLink = (text) => {
  const urls = text.match(urlRegex) || [];
  if (urls.length === 0) return false;

  for (const url of urls) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
      const domain = parsed.hostname.replace(/^www\./, '');
      
      // अगर domain allowed list में है तो skip
      const allowed = getAntiLink()?.allowedUrls || [];
      if (allowed.some(a => domain.includes(a) || a.includes(domain))) {
        continue;
      }

      // Suspicious check (shortener, ip-based, etc.)
      if (domain.match(/bit\.ly|tinyurl\.com|goo\.gl|is\.gd|ow\.ly|bitly\.com/) ||
          domain.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) ||
          domain.length < 5) {
        return true;
      }
    } catch (e) {
      // Invalid URL → suspicious
      return true;
    }
  }
  return false;
};

const handleAntiLink = async (client, message, groupId) => {
  const settings = await getAntiLink(groupId);
  if (!settings || !settings.enabled) return false;

  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  if (!text) return false;

  if (isSuspiciousLink(text)) {
    const action = settings.action || 'delete'; // kick, delete, warn

    if (action === 'delete') {
      await client.sendMessage(message.key.remoteJid, { delete: message.key });
    } else if (action === 'kick') {
      await client.groupParticipantsUpdate(message.key.remoteJid, [message.key.participant], 'remove');
    } else if (action === 'warn') {
      // warn logic (warn count increase)
      await client.sendMessage(message.key.remoteJid, { text: `⚠️ Anti-Link Detected! Warning issued.` });
    }

    return true; // action लिया गया
  }

  return false;
};

module.exports = {
  handleAntiLink,
  isSuspiciousLink
};