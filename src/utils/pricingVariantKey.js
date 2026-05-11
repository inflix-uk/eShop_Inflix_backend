/**
 * Stable key for matching a product variant to GroupProductPrice.variantKey.
 * Prefer variantId, then slug, then array index (last resort).
 */
function computeVariantKey(variant, idx = 0) {
  if (!variant) return "";
  const id = String(variant.variantId || "").trim();
  if (id) return id;
  const slug = String(variant.slug || "").trim();
  if (slug) return slug;
  return `__idx_${idx}`;
}

module.exports = { computeVariantKey };
