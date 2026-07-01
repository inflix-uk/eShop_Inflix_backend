/**
 * Public HTTP cache headers for storefront GET endpoints.
 *
 * These endpoints return the SAME data for every visitor (branding, CMS
 * content, widget flags, promo sections, etc.) and only change when an admin
 * edits them — so they are safe to cache at the CDN / Next.js fetch layer.
 *
 *   `s-maxage`               → how long a shared cache treats it as fresh.
 *   `stale-while-revalidate` → keep serving the (stale) cached copy while a
 *                              fresh one is fetched in the background, so users
 *                              never wait on a blocking revalidation.
 *
 * Only affects SHARED caches (CDN / reverse proxy / Next fetch cache) — browsers
 * are not told to cache (no `max-age`), so a hard refresh always hits origin.
 *
 * IMPORTANT: never attach these to endpoints whose response varies per user
 * (auth, cart, or pricing-scoped product lists) — that would leak one user's
 * data to another via the shared cache.
 */
function publicCache(maxAgeSeconds, staleWhileRevalidateSeconds) {
  const value = `public, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;
  return (req, res, next) => {
    // Only cache successful GETs; leave the header off if a handler later errors
    // by keying purely on method here (Express can't know the status yet, but
    // CDNs do not cache 4xx/5xx by default, so this is safe).
    if (req.method === 'GET') {
      res.set('Cache-Control', value);
    }
    next();
  };
}

// Presets. "long" = rarely changes (admin edits only); "medium" = time/stock
// sensitive but still shared across all visitors.
publicCache.long = publicCache(3600, 86400);    // 1 hour fresh, serve stale up to 1 day
publicCache.medium = publicCache(1800, 14400);  // 30 min fresh, serve stale up to 4 hours

module.exports = publicCache;
