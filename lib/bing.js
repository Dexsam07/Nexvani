// lib/bing.js - DEX Nova version (cleaned & updated)
// Bing Image Creator API wrapper - generate AI images from text prompt

const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Bing Image Creator API endpoint
const BING_API_URL = 'https://www.bing.com/images/create';
const BING_COOKIE = config.BING_COOKIE || ''; // config.env से लेगा

// Temporary folder for generated images
const TEMP_DIR = path.join(__dirname, '../temp/images');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generate AI image from text prompt using Bing Image Creator
 * @param {string} prompt - Text description for image
 * @param {number} count - Number of images to generate (1-4 default 1)
 * @returns {Promise<string[]>} Array of image URLs or file paths
 */
async function generateImage(prompt, count = 1) {
  if (!BING_COOKIE) {
    throw new Error('[Bing] BING_COOKIE not set in config.env');
  }

  if (count < 1 || count > 4) count = 1;

  try {
    const response = await axios.post(
      BING_API_URL,
      {
        q: prompt,
        rt: '4',
        FORM: 'GENCRE',
        count: count
      },
      {
        headers: {
          'Cookie': BING_COOKIE,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.bing.com',
          'Referer': 'https://www.bing.com/images/create'
        },
        params: {
          q: prompt,
          rt: 4,
          FORM: 'GENCRE'
        },
        responseType: 'json'
      }
    );

    if (!response.data || !response.data.images || response.data.images.length === 0) {
      throw new Error('[Bing] No images generated');
    }

    const imageUrls = response.data.images.map(img => img.url);

    // Optional: Download images locally
    const localPaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const fileName = `bing_\( {Date.now()}_ \){i}.png`;
      const filePath = path.join(TEMP_DIR, fileName);

      const imgResponse = await axios.get(imageUrls[i], { responseType: 'stream' });
      imgResponse.data.pipe(fs.createWriteStream(filePath));

      await new Promise((resolve, reject) => {
        imgResponse.data.on('end', resolve);
        imgResponse.data.on('error', reject);
      });

      localPaths.push(filePath);
    }

    return localPaths.length > 0 ? localPaths : imageUrls;

  } catch (error) {
    console.error('[Bing Image Error]:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw new Error('Failed to generate image from Bing');
  }
}

module.exports = {
  generateImage
};