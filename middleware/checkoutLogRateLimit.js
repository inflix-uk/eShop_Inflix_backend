/**
 * Rate limit for the public checkout-log ingest endpoint.
 *
 * The endpoint has to stay open — checkout is anonymous — so it is a free
 * write path into the database. A genuine checkout emits maybe 15-30 events,
 * so the ceiling is set well above that but low enough that a script cannot
 * fill the collection.
 *
 * Over the limit we answer 200, not 429: this is telemetry, and a logging
 * endpoint must never make a customer's checkout look broken. The event is
 * simply dropped.
 */

const WINDOW_MS = parseInt(process.env.CHECKOUT_LOG_RATE_WINDOW, 10) || 60 * 1000;
const MAX_EVENTS = parseInt(process.env.CHECKOUT_LOG_RATE_MAX, 10) || 120;

const buckets = new Map();
let lastSweep = Date.now();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now) {
  if (now - lastSweep < WINDOW_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= WINDOW_MS) buckets.delete(key);
  }
}

function checkoutLogRateLimit(req, res, next) {
  const now = Date.now();
  sweep(now);

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  const key = `clog:${ip}`;

  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0, warned: false };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  if (bucket.count > MAX_EVENTS) {
    if (!bucket.warned) {
      bucket.warned = true;
      console.warn(`[checkoutLog] rate limit hit for ${ip} (${bucket.count} events)`);
    }
    // Silently drop — never surface a logging problem to a paying customer.
    return res.status(200).json({ ok: false, reason: 'rate_limited' });
  }

  return next();
}

module.exports = checkoutLogRateLimit;
