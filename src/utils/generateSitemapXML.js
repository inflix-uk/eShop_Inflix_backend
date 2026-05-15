function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Standard sitemap urlset namespaces (news, xhtml, image, video). */
const SITEMAP_URLSET_OPEN =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
  'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" ' +
  'xmlns:xhtml="http://www.w3.org/1999/xhtml" ' +
  'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" ' +
  'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';

const SITEMAP_URLSET_OPEN_FORMATTED =
  "<urlset\n" +
  '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n' +
  '  xmlns:xhtml="http://www.w3.org/1999/xhtml"\n' +
  '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n' +
  '  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

/** Storefront uses trailingSlash URLs — every sitemap <loc> must end with / (except redundant double slashes). */
function ensureTrailingSlashLoc(loc) {
  const raw = String(loc || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    let pathname = u.pathname || "/";
    if (pathname !== "/" && !pathname.endsWith("/")) {
      pathname = `${pathname}/`;
    }
    return `${u.origin}${pathname}${u.search}${u.hash}`;
  } catch {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
}

function generateSitemapXML(urls) {
  const body = (Array.isArray(urls) ? urls : [])
    .map((entry) => {
      const loc = escapeXml(ensureTrailingSlashLoc(entry?.loc || entry?.url || ""));
      if (!loc) return "";

      const lastmod = entry?.lastmod
        ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>`
        : "";
      const changefreq = entry?.changefreq
        ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>`
        : "";
      const priority =
        entry?.priority !== undefined && entry?.priority !== null
          ? `<priority>${escapeXml(entry.priority)}</priority>`
          : "";

      return `<url><loc>${loc}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .filter(Boolean)
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' + SITEMAP_URLSET_OPEN + body + "</urlset>"
  );
}

/**
 * Product-only image sitemap: loc → lastmod → changefreq → priority → image:image.
 * Entries without valid images are omitted.
 */
function generateSitemapProductImagesXML(urls) {
  const body = (Array.isArray(urls) ? urls : [])
    .map((entry) => {
      const rawLoc = ensureTrailingSlashLoc(entry?.loc || entry?.url || "");
      if (!rawLoc || !String(rawLoc).includes("/products/")) return "";
      const loc = escapeXml(rawLoc);

      const imageBlocks = (Array.isArray(entry?.images) ? entry.images : [])
        .map((imgUrl) => {
          const raw = String(imgUrl || "").trim();
          if (!raw || !/^https?:\/\//i.test(raw)) return "";
          const imageLoc = escapeXml(raw);
          if (!imageLoc) return "";
          return `  <image:image>\n    <image:loc>${imageLoc}</image:loc>\n  </image:image>\n`;
        })
        .filter(Boolean)
        .join("");

      if (!imageBlocks) return "";

      const lastmod = entry?.lastmod
        ? `  <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`
        : "";
      const changefreq = entry?.changefreq
        ? `  <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`
        : "";
      const priority =
        entry?.priority !== undefined && entry?.priority !== null
          ? `  <priority>${escapeXml(entry.priority)}</priority>\n`
          : "";

      return `<url>\n  <loc>${loc}</loc>\n${lastmod}${changefreq}${priority}${imageBlocks}</url>\n`;
    })
    .filter(Boolean)
    .join("");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    SITEMAP_URLSET_OPEN_FORMATTED +
    body +
    "</urlset>\n"
  );
}

module.exports = generateSitemapXML;
module.exports.generateSitemapProductImagesXML = generateSitemapProductImagesXML;
module.exports.SITEMAP_URLSET_OPEN = SITEMAP_URLSET_OPEN;
