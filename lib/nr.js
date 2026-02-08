// lib/nr.js - DEX Nova version (deobfuscated, cleaned & updated)
// Number formatting, abbreviations, phone number utils, currency formatting

/**
 * Format large numbers with abbreviations (K, M, B, T)
 * @param {number} num - Number to format
 * @param {number} [decimals=1] - Decimal places
 * @returns {string} Formatted number (e.g. 1.2K, 3.4M)
 */
function formatNumber(num, decimals = 1) {
  if (!num) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum < 1000) {
    return sign + absNum.toFixed(decimals).replace(/\.0+$/, '');
  }

  const units = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const exponent = Math.floor(Math.log10(absNum) / 3);
  const unit = units[exponent] || `e${exponent * 3}`;

  const scaled = absNum / Math.pow(10, exponent * 3);
  return sign + scaled.toFixed(decimals) + unit;
}

/**
 * Format Indian Rupee currency (with commas)
 * @param {number} amount - Amount in INR
 * @param {boolean} [withSymbol=true] - Show ₹ symbol
 * @returns {string} Formatted currency (e.g. ₹1,23,456.78)
 */
function formatINR(amount, withSymbol = true) {
  if (isNaN(amount)) return '₹0';
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let formatted = formatter.format(Math.abs(amount));
  if (!withSymbol) {
    formatted = formatted.replace('₹', '').trim();
  }

  return amount < 0 ? '-' + formatted : formatted;
}

/**
 * Convert phone number to WhatsApp JID
 * @param {string} number - Phone number (with or without +)
 * @returns {string} WhatsApp JID (e.g. 919876543210@s.whatsapp.net)
 */
function numToJid(number) {
  let cleaned = number.toString().replace(/[^0-9]/g, '');
  
  if (!cleaned.startsWith('91')) {
    cleaned = '91' + cleaned;
  }

  if (cleaned.length !== 12) {
    throw new Error('Invalid Indian phone number');
  }

  return cleaned + '@s.whatsapp.net';
}

/**
 * Convert WhatsApp JID to clean phone number
 * @param {string} jid - WhatsApp JID
 * @returns {string} Clean phone number (e.g. +919876543210)
 */
function jidToNum(jid) {
  if (!jid.includes('@s.whatsapp.net')) return jid;
  
  let num = jid.split('@')[0];
  if (num.startsWith('91')) {
    num = '+' + num;
  }
  
  return num;
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} [decimals=2]
 * @returns {string} e.g. 1.23 MB
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Abbreviate large number (short version)
 * @param {number} value
 * @returns {string} e.g. 1.2k, 3.4m
 */
function abbreviateNumber(value) {
  let newValue = value;
  const suffixes = ["", "k", "m", "b", "t"];
  
  let suffixNum = 0;
  while (newValue >= 1000) {
    newValue /= 1000;
    suffixNum++;
  }

  newValue = newValue.toPrecision(3);
  newValue += suffixes[suffixNum];
  
  return newValue;
}

module.exports = {
  formatNumber,
  formatINR,
  numToJid,
  jidToNum,
  formatBytes,
  abbreviateNumber
};