// lib/youtube.js - DEX Nova version (deobfuscated & updated)
// YouTube video/audio downloader + search + metadata fetch

const axios = require('axios');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { fromBuffer } = require('file-type');
const ffmpeg = require('fluent-ffmpeg');

// Default download folder
const downloadDir = path.join(__dirname, '../downloads/youtube');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

/**
 * Search YouTube videos
 * @param {string} query - Search term
 * @param {number} limit - Number of results (default 5)
 * @returns {Promise<Array>} Video metadata
 */
async function searchYouTube(query, limit = 5) {
  try {
    const result = await yts(query);
    const videos = result.videos.slice(0, limit);
    
    return videos.map(v => ({
      title: v.title,
      url: v.url,
      duration: v.duration,
      views: v.views,
      timestamp: v.timestamp,
      ago: v.ago,
      author: v.author.name,
      thumbnail: v.thumbnail,
      description: v.description || ''
    }));
  } catch (error) {
    console.error('[DEX Nova] YouTube search error:', error.message);
    return [];
  }
}

/**
 * Get video info from URL
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} Video details
 */
async function getVideoInfo(url) {
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });
    
    return {
      title: info.videoDetails.title,
      description: info.videoDetails.description,
      thumbnail: info.videoDetails.thumbnails[0]?.url || '',
      author: info.videoDetails.author.name,
      views: info.videoDetails.viewCount,
      uploadDate: info.videoDetails.uploadDate,
      duration: info.videoDetails.lengthSeconds,
      url: info.videoDetails.video_url,
      formats: info.formats
    };
  } catch (error) {
    console.error('[DEX Nova] YouTube info error:', error.message);
    throw new Error('Invalid YouTube URL or video unavailable');
  }
}

/**
 * Download YouTube video/audio
 * @param {string} url - YouTube URL
 * @param {string} type - 'video' or 'audio'
 * @param {string} quality - 'highest' or specific itag
 * @returns {Promise<string>} Path to downloaded file
 */
async function downloadYouTube(url, type = 'video', quality = 'highest') {
  try {
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    const fileName = `\( {videoTitle}_ \){Date.now()}.${type === 'audio' ? 'mp3' : 'mp4'}`;
    const filePath = path.join(downloadDir, fileName);

    let formatOptions = { quality: quality === 'highest' ? 'highest' : quality };
    if (type === 'audio') {
      formatOptions = { filter: 'audioonly', quality: 'highestaudio' };
    }

    return new Promise((resolve, reject) => {
      ytdl(url, formatOptions)
        .pipe(fs.createWriteStream(filePath))
        .on('finish', () => resolve(filePath))
        .on('error', (err) => reject(err));
    });
  } catch (error) {
    console.error('[DEX Nova] YouTube download error:', error.message);
    throw new Error('Failed to download video/audio');
  }
}

/**
 * Convert video to audio (MP3) using ffmpeg
 * @param {string} videoPath - Path to downloaded video
 * @returns {Promise<string>} Path to MP3 file
 */
async function convertToAudio(videoPath) {
  const audioPath = videoPath.replace('.mp4', '.mp3');
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .audioBitrate(128)
      .output(audioPath)
      .on('end', () => {
        // Optional: delete original video
        fs.unlinkSync(videoPath);
        resolve(audioPath);
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

module.exports = {
  searchYouTube,
  getVideoInfo,
  downloadYouTube,
  convertToAudio
};