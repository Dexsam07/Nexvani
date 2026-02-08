// lib/ss/insta.js - DEX Nova version (cleaned & updated)
// Instagram downloader (post, reel, story, profile pic, highlights)

const axios = require('axios');
const cheerio = require('cheerio');
const { getMIMEType } = require('node-mime-types');
const fs = require('fs');
const path = require('path');
const { sendDocument, sendImage } = require('../sendMessage');

/**
 * Download Instagram media (post/reel/story)
 * @param {string} url - Instagram URL
 * @returns {Promise<Object>} { type: 'image'|'video'|'carousel', urls: string[], caption?: string }
 */
async function downloadInstagram(url) {
  try {
    // Clean URL
    url = url.trim().split('?')[0];
    if (!url.includes('instagram.com')) throw new Error('Not an Instagram link');

    // Use a public API or scraper (here using a reliable third-party endpoint)
    const apiUrl = `https://api.akuari.my.id/downloader/ig?link=${encodeURIComponent(url)}`;
    const response = await axios.get(apiUrl, { timeout: 15000 });

    if (!response.data || !response.data.result) {
      throw new Error('API returned no result');
    }

    const data = response.data.result;

    // Format result
    const result = {
      type: data.type || 'unknown',
      urls: [],
      thumbnail: data.thumbnail || null,
      caption: data.caption || '',
      username: data.username || 'unknown',
      full_name: data.full_name || '',
      likes: data.likes || 0,
      comments: data.comments || 0
    };

    // Collect media URLs
    if (data.medias && Array.isArray(data.medias)) {
      result.urls = data.medias.map(m => m.url);
      result.type = data.medias.length > 1 ? 'carousel' : data.medias[0].type;
    } else if (data.url) {
      result.urls = [data.url];
      result.type = data.type;
    }

    return result;

  } catch (err) {
    console.error('[Insta Download Error]:', err.message);
    throw new Error('Failed to download from Instagram');
  }
}

/**
 * Download Instagram profile picture (high quality)
 * @param {string} username - Instagram username (without @)
 * @returns {Promise<string>} Direct image URL
 */
async function downloadProfilePic(username) {
  try {
    username = username.replace('@', '').trim();
    const response = await axios.get(`https://www.instagram.com/${username}/channel/?__a=1&__d=dis`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const data = response.data.graphql?.user;
    if (!data) throw new Error('Profile not found');

    return data.profile_pic_url_hd || data.profile_pic_url;
  } catch (err) {
    console.error('[Insta DP Error]:', err.message);
    throw new Error('Failed to fetch profile picture');
  }
}

/**
 * Send Instagram media to chat
 * @param {string} jid - Chat JID
 * @param {string} url - Instagram URL
 * @param {Object} m - Quoted message (optional)
 */
async function sendInstaMedia(jid, url, m = null) {
  try {
    const data = await downloadInstagram(url);

    if (data.urls.length === 0) {
      return await sock.sendMessage(jid, { text: '_No media found_' }, { quoted: m });
    }

    // Send first media as main
    const firstUrl = data.urls[0];
    const isVideo = firstUrl.endsWith('.mp4') || data.type === 'video';

    if (isVideo) {
      await sock.sendMessage(jid, {
        video: { url: firstUrl },
        caption: `From @\( {data.username}\n \){data.caption || ''}`,
        mimetype: 'video/mp4'
      }, { quoted: m });
    } else {
      await sendImage(jid, firstUrl, `From @\( {data.username}\n \){data.caption || ''}`, { quoted: m });
    }

    // Send remaining as documents if carousel
    if (data.urls.length > 1) {
      for (let i = 1; i < data.urls.length; i++) {
        const mediaUrl = data.urls[i];
        await sendDocument(jid, mediaUrl, `insta_\( {i}. \){mediaUrl.split('.').pop()}`, null, `Part ${i+1} of carousel`);
      }
    }

  } catch (err) {
    await sock.sendMessage(jid, { text: `Error: ${err.message}` }, { quoted: m });
  }
}

// Command handler example (add to your cmd handler)
async function instaCommand(sock, m, args) {
  const url = args.join(' ').trim();
  if (!url) return sock.sendMessage(m.key.remoteJid, { text: '_Provide Instagram link_' }, { quoted: m });

  await sendInstaMedia(m.key.remoteJid, url, m);
}

module.exports = {
  downloadInstagram,
  downloadProfilePic,
  sendInstaMedia,
  // For command registration
  instaCommand
};