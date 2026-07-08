require('dotenv').config();

const TOKEN_COOKIE_NAME = 'token';

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim().length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set (min 16 chars) in production');
    }
    return 'dev-only-insecure-jwt-secret-change-me';
  }
  return String(secret).trim();
}

function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'lax' : 'lax',
    maxAge: parseCookieMaxAge(JWT_EXPIRES_IN),
    path: '/',
  };

  const domain = process.env.COOKIE_DOMAIN;
  if (domain && String(domain).trim()) {
    options.domain = String(domain).trim();
  }

  return options;
}

function parseCookieMaxAge(expiresIn) {
  const str = String(expiresIn || '7d').trim();
  const match = str.match(/^(\d+)([dhms])?$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'd').toLowerCase();
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return value * (multipliers[unit] || multipliers.d);
}

module.exports = {
  TOKEN_COOKIE_NAME,
  JWT_EXPIRES_IN,
  getJwtSecret,
  getCookieOptions,
};
