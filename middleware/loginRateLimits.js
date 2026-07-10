const { createLoginRateLimiter } = require('./createRateLimiter');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

const userLoginRateLimit = createLoginRateLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 5,
});

const superadminLoginRateLimit = createLoginRateLimiter({
  windowMs: THIRTY_MINUTES_MS,
  max: 3,
});

module.exports = {
  userLoginRateLimit,
  superadminLoginRateLimit,
};
