const {
  createEmailKeyedRateLimiter,
  createIpKeyedRateLimiter,
} = require('./createRateLimiter');

const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const FORGOT_PASSWORD_RATE_LIMIT_MESSAGE =
  'Too many password reset requests. Please try again later.';

const RESET_PASSWORD_RATE_LIMIT_MESSAGE =
  'Too many password reset attempts. Please try again later.';

/** Every request counts — each may trigger a reset email. Key: IP + normalized email. */
const forgotPasswordRateLimit = createEmailKeyedRateLimiter({
  windowMs: ONE_HOUR_MS,
  max: 3,
  message: FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
});

/** Failed token attempts count (HTTP 400); successful reset (HTTP 200) does not. Key: IP. */
const resetPasswordRateLimit = createIpKeyedRateLimiter({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 10,
  message: RESET_PASSWORD_RATE_LIMIT_MESSAGE,
  skipSuccessfulRequests: true,
});

module.exports = {
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
  FORGOT_PASSWORD_RATE_LIMIT_MESSAGE,
  RESET_PASSWORD_RATE_LIMIT_MESSAGE,
};
