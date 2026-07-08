const { computeVariantKey } = require('../../utils/pricingVariantKey');
const { normalizeId } = require('./normalizePricingIds');
const { resolveOriginalPrice, variantOriginalUnit } = require('./resolveOriginalPrice');

/**
 * Resolve unit price for one variant (user > group variant-specific > catalog).
 * Product-level group/user rows are NOT applied to variants (matches listing API).
 */
function resolveVariantUnitPrice(product, variant, variantIndex, ctx) {
  const pid = normalizeId(product._id);
  const groupExcluded = ctx.excludedFromGroup.has(pid);
  const userExcluded = ctx.excludedFromUser.has(pid);
  const vk = computeVariantKey(variant, variantIndex);
  const composite = `${pid}::${vk}`;

  const groupSpecific = groupExcluded ? undefined : ctx.groupOverrideMap.get(composite);
  const groupPrice =
    !groupExcluded && Number.isFinite(groupSpecific) && groupSpecific > 0 ? groupSpecific : null;

  const userSpecific = userExcluded ? undefined : ctx.userOverrideMap.get(composite);
  const userPrice =
    !userExcluded && Number.isFinite(userSpecific) && userSpecific > 0 ? userSpecific : null;

  const catalog = variantOriginalUnit(variant);

  if (Number.isFinite(userPrice) && userPrice > 0) {
    return { unitPrice: userPrice, priceSource: 'user' };
  }
  if (Number.isFinite(groupPrice) && groupPrice > 0) {
    return { unitPrice: groupPrice, priceSource: 'group' };
  }
  return { unitPrice: catalog, priceSource: 'catalog' };
}

/**
 * Resolve unit price for a product without variants (user whole > group whole > catalog).
 */
function resolveSingleProductUnitPrice(product, ctx) {
  const pid = normalizeId(product._id);
  const groupExcluded = ctx.excludedFromGroup.has(pid);
  const userExcluded = ctx.excludedFromUser.has(pid);
  const userPriceWhole = userExcluded ? undefined : ctx.userOverrideMap.get(pid);
  const groupPriceWhole = groupExcluded ? undefined : ctx.groupOverrideMap.get(pid);
  const originalPrice = resolveOriginalPrice(product);

  const userPrice =
    Number.isFinite(userPriceWhole) && userPriceWhole > 0 ? userPriceWhole : null;
  const groupPrice =
    Number.isFinite(groupPriceWhole) && groupPriceWhole > 0 ? groupPriceWhole : null;

  if (Number.isFinite(userPrice) && userPrice > 0) {
    return { unitPrice: userPrice, priceSource: 'user' };
  }
  if (Number.isFinite(groupPrice) && groupPrice > 0) {
    return { unitPrice: groupPrice, priceSource: 'group' };
  }
  return { unitPrice: originalPrice, priceSource: 'catalog' };
}

function getWholeProductOverridePrices(product, ctx) {
  const pid = normalizeId(product._id);
  const groupExcluded = ctx.excludedFromGroup.has(pid);
  const userExcluded = ctx.excludedFromUser.has(pid);
  const userPriceWhole = userExcluded ? undefined : ctx.userOverrideMap.get(pid);
  const groupPriceWhole = groupExcluded ? undefined : ctx.groupOverrideMap.get(pid);

  return {
    groupPrice:
      Number.isFinite(groupPriceWhole) && groupPriceWhole > 0 ? groupPriceWhole : null,
    userPrice: Number.isFinite(userPriceWhole) && userPriceWhole > 0 ? userPriceWhole : null,
  };
}

module.exports = {
  resolveVariantUnitPrice,
  resolveSingleProductUnitPrice,
  getWholeProductOverridePrices,
};
