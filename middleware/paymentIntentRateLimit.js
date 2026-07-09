const { serverConfig } = require('../config/server.config');

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const configuredWindowMs = serverConfig?.rateLimit?.windowMs || DEFAULT_WINDOW_MS;

const WINDOW_MS = parseInt(process.env.PI_RATE_LIMIT_WINDOW, 10)
  || Math.min(configuredWindowMs, DEFAULT_WINDOW_MS);
const MAX_REQUESTS = parseInt(process.env.PI_RATE_LIMIT_MAX, 10) || 30;

const buckets = new Map();

function paymentIntentRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const key = `pi:${ip}`;

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many payment requests. Please try again later.',
    });
  }

  return next();
}

module.exports = paymentIntentRateLimit;
