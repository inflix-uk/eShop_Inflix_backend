const BookingPackage = require('../models/bookingPackage');
const BookingSettings = require('../models/bookingSettings');
const { toSeoSlug } = require('./slugUtils');

/** URL segment for booking package routes — prefers stored slug, then name, then id. */
function getPackageUrlKey(pkg) {
  const fromSlug = pkg?.slug != null ? String(pkg.slug).trim() : '';
  if (fromSlug) return fromSlug;
  const fromName = toSeoSlug(pkg?.name);
  return fromName || String(pkg?._id || '');
}

/**
 * Active public booking packages for sitemap (mirrors getPublicPackages filter).
 */
async function fetchBookingPackagesForSitemap() {
  return BookingPackage.find({
    isdeleted: false,
    isActive: true,
  })
    .select('slug name updatedAt')
    .lean();
}

/**
 * @param {Array} packages
 * @param {string} baseUrl
 * @returns {Array<{ loc: string, changefreq: string, priority: number, lastmod?: string }>}
 */
function bookingPackagesToSitemapEntries(packages, baseUrl) {
  const entries = [];
  const seen = new Set();

  const bookingIndex = `${baseUrl}/booking`;
  if (!seen.has(bookingIndex)) {
    seen.add(bookingIndex);
    entries.push({
      loc: bookingIndex,
      changefreq: 'weekly',
      priority: 0.8,
    });
  }

  for (const pkg of packages || []) {
    const key = getPackageUrlKey(pkg);
    if (!key) continue;

    const loc = `${baseUrl}/booking/details/${key}`;
    if (seen.has(loc)) continue;
    seen.add(loc);

    entries.push({
      loc,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : undefined,
    });
  }

  return entries;
}

/**
 * Append /booking and /booking/details/{slug} when booking is enabled.
 * Same shape as appendFooterPageSitemapEntries.
 */
async function appendBookingPackageSitemapEntries(urls, baseUrl) {
  const settings = await BookingSettings.getSettings();
  if (!settings?.isEnabled) return;

  const packages = await fetchBookingPackagesForSitemap();
  urls.push(...bookingPackagesToSitemapEntries(packages, baseUrl));
}

module.exports = {
  appendBookingPackageSitemapEntries,
  bookingPackagesToSitemapEntries,
  fetchBookingPackagesForSitemap,
  getPackageUrlKey,
};
