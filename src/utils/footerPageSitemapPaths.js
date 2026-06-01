const FooterPage = require('../models/footerPage');
const mongoose = require('mongoose');

function hasPublishedBlocks(page) {
  return Array.isArray(page?.blocks) && page.blocks.length > 0;
}

function resolveParentSlug(parentPageId) {
  if (!parentPageId) return '';
  if (typeof parentPageId === 'object' && parentPageId.slug) {
    return String(parentPageId.slug).trim();
  }
  return '';
}

/**
 * Published footer CMS pages for sitemap (per-store when storeId is set on documents).
 */
async function fetchFooterPagesForSitemap(storeId) {
  const storeFilter = mongoose.Types.ObjectId.isValid(String(storeId || ''))
    ? {
        $or: [
          { storeId: new mongoose.Types.ObjectId(String(storeId)) },
          { storeId: null },
          { storeId: { $exists: false } },
        ],
      }
    : {};

  return FooterPage.find({
    publishStatus: 'published',
    ...storeFilter,
  })
    .select('slug parentPageId updatedAt blocks')
    .populate('parentPageId', 'slug')
    .lean();
}

/**
 * @param {Array} footerPages
 * @param {string} baseUrl
 * @returns {Array<{ loc: string, changefreq: string, priority: number, lastmod?: string }>}
 */
function footerPagesToSitemapEntries(footerPages, baseUrl) {
  const entries = [];
  const seen = new Set();

  for (const page of footerPages || []) {
    if (!hasPublishedBlocks(page)) continue;

    const slug = String(page.slug || '').trim();
    if (!slug) continue;

    const parentSlug = resolveParentSlug(page.parentPageId);
    const path = parentSlug ? `${parentSlug}/${slug}` : slug;
    const loc = `${baseUrl}/${path}`;

    if (seen.has(loc)) continue;
    seen.add(loc);

    entries.push({
      loc,
      changefreq: 'yearly',
      priority: 0.4,
      lastmod: page.updatedAt ? new Date(page.updatedAt).toISOString() : undefined,
    });
  }

  return entries;
}

async function appendFooterPageSitemapEntries(urls, storeId, baseUrl) {
  const pages = await fetchFooterPagesForSitemap(storeId);
  urls.push(...footerPagesToSitemapEntries(pages, baseUrl));
}

module.exports = {
  appendFooterPageSitemapEntries,
  footerPagesToSitemapEntries,
  fetchFooterPagesForSitemap,
  hasPublishedBlocks,
};
