const UNASSIGNED_BRAND_KEY = '__unassigned__';

function unassignedBrandQuery() {
  return {
    $or: [
      { brand: null },
      { brand: '' },
      { brand: { $exists: false } },
      { brand: { $regex: /^\s*$/ } },
    ],
  };
}

function isUnassignedBrandFilter(brandFilter) {
  return String(brandFilter || '').trim() === UNASSIGNED_BRAND_KEY;
}

function applyBrandFilterToQuery(filterQuery, brandFilter) {
  if (!brandFilter) return filterQuery;

  if (isUnassignedBrandFilter(brandFilter)) {
    return { ...filterQuery, ...unassignedBrandQuery() };
  }

  return {
    ...filterQuery,
    brand: { $regex: new RegExp(`^${String(brandFilter).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  };
}

async function countUnassignedProducts(Product) {
  return Product.countDocuments({
    isdeleted: { $ne: true },
    ...unassignedBrandQuery(),
  });
}

module.exports = {
  UNASSIGNED_BRAND_KEY,
  unassignedBrandQuery,
  isUnassignedBrandFilter,
  applyBrandFilterToQuery,
  countUnassignedProducts,
};
