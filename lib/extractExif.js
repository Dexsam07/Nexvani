// lib/extractExif.js - DEX Nova version (cleaned & updated)
// Extract EXIF metadata from images (especially WhatsApp stickers)

const ExifReader = require('exifreader');
const fs = require('fs');
const path = require('path');

/**
 * Extract EXIF data from image buffer or file path
 * @param {Buffer|string} input - Image buffer or file path
 * @returns {Promise<Object|null>} Extracted EXIF data or null
 */
async function extractExif(input) {
  try {
    let buffer;

    // Handle input as file path or buffer
    if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error('File not found');
      }
      buffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      buffer = input;
    } else {
      throw new Error('Invalid input: must be Buffer or file path');
    }

    // Read EXIF tags
    const tags = await ExifReader.load(buffer, { expanded: true });

    // Clean and format useful data
    const exifData = {
      make: tags.exif?.Make?.description || null,
      model: tags.exif?.Model?.description || null,
      software: tags.exif?.Software?.description || null,
      dateTime: tags.exif?.DateTimeOriginal?.description || null,
      latitude: tags.gps?.Latitude || null,
      longitude: tags.gps?.Longitude || null,
      altitude: tags.gps?.Altitude || null,
      orientation: tags.exif?.Orientation?.description || null,
      width: tags.image?.ImageWidth?.value || null,
      height: tags.image?.ImageHeight?.value || null,
      // WhatsApp/Sticker specific (if present)
      stickerPack: tags.xmp?.['XMP-xmpMM:InstanceID']?.value || null,
      stickerId: tags.xmp?.['XMP-xmp:Identifier']?.value || null,
      // Raw tags for advanced use
      raw: tags
    };

    // Remove null/undefined fields
    Object.keys(exifData).forEach(key => {
      if (exifData[key] === null || exifData[key] === undefined) {
        delete exifData[key];
      }
    });

    return Object.keys(exifData).length > 0 ? exifData : null;

  } catch (err) {
    console.error('[EXIF Extract Error]:', err.message);
    return null;
  }
}

/**
 * Extract EXIF from WhatsApp sticker (common use-case)
 * @param {Buffer} stickerBuffer - Sticker buffer
 * @returns {Promise<Object|null>}
 */
async function extractStickerExif(stickerBuffer) {
  const exif = await extractExif(stickerBuffer);
  if (!exif) return null;

  return {
    packName: exif.stickerPack || 'Unknown Pack',
    author: exif.stickerAuthor || 'Unknown',
    categories: exif.stickerCategories || [],
    isAnimated: exif.isAnimated || false,
    width: exif.width,
    height: exif.height
  };
}

/**
 * Add or modify EXIF in image buffer (for stickers)
 * @param {Buffer} imageBuffer
 * @param {Object} metadata - { packName, author, categories }
 * @returns {Promise<Buffer>} Modified buffer
 */
async function addExifToSticker(imageBuffer, metadata) {
  // This requires a library like 'sharp' + 'exiftool' or custom implementation
  // For simplicity, we'll return original buffer (full implementation needs exiftool)
  console.warn('[EXIF] Adding EXIF not implemented yet - requires exiftool');
  return imageBuffer;
}

module.exports = {
  extractExif,
  extractStickerExif,
  addExifToSticker
};