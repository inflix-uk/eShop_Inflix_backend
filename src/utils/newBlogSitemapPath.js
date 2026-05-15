/**
 * Mirrors Next.js `blogs/[slug]/page.tsx` (`toCategorySlug` + primary category for canonical URL).
 * @param {string} value
 */
function toCategorySlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Public path segment for a published NewBlog (no leading slash): `blogs/{category}/{postSlug}`.
 * @param {{ slug?: string, categories?: Array<{ name?: string } | null> }} blog — `categories` should be populated with `name`.
 * @returns {string} empty if no post slug
 */
function getNewBlogSitemapPathSegment(blog) {
  const slug = String(blog?.slug || "").trim();
  if (!slug) return "";
  const cats = Array.isArray(blog.categories) ? blog.categories : [];
  for (const c of cats) {
    if (c && typeof c === "object" && c.name != null) {
      const s = toCategorySlug(String(c.name));
      if (s) return `blogs/${s}/${slug}`;
    }
  }
  return `blogs/general/${slug}`;
}

module.exports = { toCategorySlug, getNewBlogSitemapPathSegment };
