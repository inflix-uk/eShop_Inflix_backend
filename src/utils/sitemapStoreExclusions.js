/** Normalize sitemap path segment for comparison (leading slash, no trailing slash). */
function normalizeSitemapPath(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  let path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

/**
 * Store-level sitemap opt-outs (per-tenant). Set on the Store document in MongoDB.
 *
 * Example for podcast (no shop categories):
 *   sitemapExcludePaths: ["/categories"]
 *
 * Example to hide booking URLs on a store that does not use booking:
 *   sitemapExcludePaths: ["/booking"]
 *
 * Excludes the /categories index and all /categories/{slug} URLs for that store only.
 * For /booking, storefront sitemap skips /booking and /booking/details/* when listed.
 */
function storeSkipsSitemapCategories(store) {
  const excludes = Array.isArray(store?.sitemapExcludePaths)
    ? store.sitemapExcludePaths
    : [];
  return excludes.some((entry) => normalizeSitemapPath(entry) === "/categories");
}

function storeSkipsSitemapPath(store, path) {
  const target = normalizeSitemapPath(path);
  if (!target) return false;
  const excludes = Array.isArray(store?.sitemapExcludePaths)
    ? store.sitemapExcludePaths
    : [];
  return excludes.some((entry) => normalizeSitemapPath(entry) === target);
}

module.exports = {
  normalizeSitemapPath,
  storeSkipsSitemapCategories,
  storeSkipsSitemapPath,
};
