const crypto = require('crypto');

/**
 * Normalize email per Google Enhanced Conversions / Meta CAPI recommendations.
 */
function normalizeEmail(email) {
  if (email == null) return undefined;
  const trimmed = String(email).trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return undefined;
  return trimmed;
}

/**
 * Normalize phone to digits with UK default country code (44).
 */
function normalizePhone(phone, defaultCountryCode = '44') {
  if (phone == null) return undefined;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (defaultCountryCode === '44') {
    if (digits.startsWith('44')) {
      // already international UK
    } else if (digits.startsWith('0')) {
      digits = `44${digits.slice(1)}`;
    } else if (digits.length === 10) {
      digits = `44${digits}`;
    }
  }

  return digits || undefined;
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hashNormalizedEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

function hashNormalizedPhone(phone, defaultCountryCode = '44') {
  const normalized = normalizePhone(phone, defaultCountryCode);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

/**
 * Build stored conversion user data — hashes only, never raw PII.
 */
function buildMarketingUserDataHashes({ email, phone, defaultCountryCode = '44' } = {}) {
  const emailSha256 = hashNormalizedEmail(email);
  const phoneSha256 = hashNormalizedPhone(phone, defaultCountryCode);

  if (!emailSha256 && !phoneSha256) return undefined;

  const result = {};
  if (emailSha256) result.emailSha256 = emailSha256;
  if (phoneSha256) result.phoneSha256 = phoneSha256;
  return result;
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  sha256Hex,
  hashNormalizedEmail,
  hashNormalizedPhone,
  buildMarketingUserDataHashes,
};
