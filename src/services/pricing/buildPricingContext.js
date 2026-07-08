const { normalizeId } = require('./normalizePricingIds');

function buildOverrideMap(overrideRows) {
  const map = new Map();
  for (const item of overrideRows || []) {
    const pid = normalizeId(item.productId);
    const numericPrice = Number(item.price);
    if (!pid || !Number.isFinite(numericPrice) || numericPrice <= 0) continue;
    const vk =
      item.variantKey != null && String(item.variantKey).trim() !== ''
        ? String(item.variantKey).trim()
        : '';
    const mapKey = vk ? `${pid}::${vk}` : pid;
    map.set(mapKey, numericPrice);
  }
  return map;
}

function buildExclusionSet(doc) {
  return new Set((doc?.excludedProductIds || []).map((id) => normalizeId(id)));
}

/**
 * Build in-memory pricing context from override rows (pure — used in tests and after DB load).
 * @param {{ groupOverrides?: object[], userOverrides?: object[], groupDoc?: object|null, userDoc?: object|null }} data
 */
function buildPricingContextFromData(data = {}) {
  const groupOverrideMap = buildOverrideMap(data.groupOverrides);
  const userOverrideMap = buildOverrideMap(data.userOverrides);
  const excludedFromGroup = buildExclusionSet(data.groupDoc);
  const excludedFromUser = buildExclusionSet(data.userDoc);

  return {
    groupOverrideMap,
    userOverrideMap,
    excludedFromGroup,
    excludedFromUser,
  };
}

module.exports = {
  buildOverrideMap,
  buildExclusionSet,
  buildPricingContextFromData,
};
