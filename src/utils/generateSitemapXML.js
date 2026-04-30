function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateSitemapXML(urls) {
  const body = (Array.isArray(urls) ? urls : [])
    .map((entry) => {
      const loc = escapeXml(entry?.loc || entry?.url || "");
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

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

module.exports = generateSitemapXML;
