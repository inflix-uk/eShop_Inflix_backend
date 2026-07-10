const { createEmailKeyedRateLimiter } = require('./createRateLimiter');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const REGISTER_RATE_LIMIT_MESSAGE =
  'Too many registration attempts. Please try again later.';

/** Every request counts — each may create an account and send email. Key: IP + normalized email. */
const registerRateLimit = createEmailKeyedRateLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 5,
  message: REGISTER_RATE_LIMIT_MESSAGE,
});

module.exports = {
  registerRateLimit,
  REGISTER_RATE_LIMIT_MESSAGE,
};
