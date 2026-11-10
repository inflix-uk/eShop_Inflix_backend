function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Category and subcategory <loc> entries.
 * Subcategory paths are /categories/{category}/{subcategory}/ — the same URLs the storefront serves.
 */
function categorySitemapEntries(categories, baseUrl) {
  const urls = [];
  const origin = String(baseUrl || "").replace(/\/$/, "");

  for (const category of categories || []) {
    const categorySlug = category.slug || slugify(category.name || "");
    if (!categorySlug) continue;

    const lastmod = category.updatedAt
      ? new Date(category.updatedAt).toISOString()
      : undefined;

    urls.push({
      loc: `${origin}/categories/${categorySlug}`,
      changefreq: "monthly",
      priority: 0.6,
      lastmod,
    });

    const seen = new Set();
    const subs = Array.isArray(category.subCategory) ? category.subCategory : [];
    for (const sub of subs) {
      const subSlug = slugify(sub);
      if (!subSlug || seen.has(subSlug)) continue;
      seen.add(subSlug);
      urls.push({
        loc: `${origin}/categories/${categorySlug}/${subSlug}`,
        changefreq: "monthly",
        priority: 0.7,
        lastmod,
      });
    }
  }

  return urls;
}

module.exports = { slugify, categorySitemapEntries };
