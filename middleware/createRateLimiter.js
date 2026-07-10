const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const LOGIN_RATE_LIMIT_MESSAGE =
  'Too many login attempts. Please try again later.';

/**
 * Normalize login email for rate-limit keying.
 * Empty / missing email maps to __empty__ so anonymous attempts share one bucket per IP.
 */
function normalizeLoginEmail(email) {
  return String(email || '').trim().toLowerCase() || '__empty__';
}

/**
 * Rate-limit key: client IP + normalized email.
 * - Different emails on the same IP → separate buckets
 * - Same email from different IPs → separate buckets
 */
function buildLoginRateLimitKey(req) {
  const normalizedEmail = normalizeLoginEmail(req.body?.email);
  return `${ipKeyGenerator(req.ip)}:${normalizedEmail}`;
}

function buildIpRateLimitKey(req) {
  return ipKeyGenerator(req.ip);
}

/**
 * In-memory store per Node.js process — not shared across instances; resets on restart.
 */
function createEmailKeyedRateLimiter({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: buildLoginRateLimitKey,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

function createIpKeyedRateLimiter({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: buildIpRateLimitKey,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

/** Login: failed attempts only (HTTP 401/403), keyed by IP + email. */
function createLoginRateLimiter({ windowMs, max }) {
  return createEmailKeyedRateLimiter({
    windowMs,
    max,
    message: LOGIN_RATE_LIMIT_MESSAGE,
    skipSuccessfulRequests: true,
  });
}

module.exports = {
  LOGIN_RATE_LIMIT_MESSAGE,
  normalizeLoginEmail,
  buildLoginRateLimitKey,
  buildIpRateLimitKey,
  createEmailKeyedRateLimiter,
  createIpKeyedRateLimiter,
  createLoginRateLimiter,
};
