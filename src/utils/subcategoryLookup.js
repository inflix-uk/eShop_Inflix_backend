/** Match URL slugs (e.g. vent-clip) to DB values (e.g. "Vent Clip", "Vent-Clip"). */
function normalizeSubcategorySlug(str) {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function categoryOwnsParentSlug(category, parentSlug) {
  const wanted = normalizeSubcategorySlug(parentSlug);
  if (!wanted) return true;
  return [category?.slug, category?.name].some(
    (value) => normalizeSubcategorySlug(value || "") === wanted
  );
}

/**
 * Find a real subcategory. Unknown names, and names that exist only under a
 * different parent, return null so the storefront can send a real 404.
 */
function findSubcategory(categories, name, parentSlug) {
  const wanted = normalizeSubcategorySlug(name);
  if (!wanted) return null;

  for (const category of categories || []) {
    if (parentSlug && !categoryOwnsParentSlug(category, parentSlug)) continue;
    const subs = Array.isArray(category.subCategory) ? category.subCategory : [];
    const index = subs.findIndex(
      (sub) => normalizeSubcategorySlug(sub) === wanted
    );
    if (index >= 0) {
      return { category, index, name: subs[index] };
    }
  }

  return null;
}

module.exports = {
  normalizeSubcategorySlug,
  categoryOwnsParentSlug,
  findSubcategory,
};
