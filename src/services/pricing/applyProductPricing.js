const { computeVariantKey } = require('../../utils/pricingVariantKey');
const { normalizeId } = require('./normalizePricingIds');
const { resolveOriginalPrice, variantOriginalUnit } = require('./resolveOriginalPrice');
const {
  resolveVariantUnitPrice,
  resolveSingleProductUnitPrice,
  getWholeProductOverridePrices,
} = require('./resolveUnitPrice');

/**
 * Apply listing-style pricing to a single product document (mutates variant salePrice strings).
 */
function applyPricingToProduct(product, ctx) {
  const pid = normalizeId(product._id);
  const { groupPrice: groupPriceWhole, userPrice: userPriceWhole } =
    getWholeProductOverridePrices(product, ctx);
  const variants = Array.isArray(product.variantValues) ? product.variantValues : [];

  if (variants.length > 0) {
    const nextVariants = variants.map((v, idx) => {
      const { unitPrice: resolved } = resolveVariantUnitPrice(product, v, idx, ctx);
      const out = { ...v };
      if (Number.isFinite(resolved) && resolved > 0) {
        out.salePrice = String(resolved);
      }
      return out;
    });

    const unitPrices = nextVariants.map(variantOriginalUnit).filter((n) => n > 0);
    const minResolved =
      unitPrices.length > 0 ? Math.min(...unitPrices) : resolveOriginalPrice(product);

    return {
      ...product,
      variantValues: nextVariants,
      price: minResolved,
      originalPrice: resolveOriginalPrice(product),
      groupPrice: groupPriceWhole,
      userPrice: userPriceWhole,
    };
  }

  const { unitPrice: resolvedPrice } = resolveSingleProductUnitPrice(product, ctx);
  const originalPrice = resolveOriginalPrice(product);

  return {
    ...product,
    price: resolvedPrice,
    originalPrice,
    groupPrice: groupPriceWhole,
    userPrice: userPriceWhole,
  };
}

function applyPricingToProducts(products, ctx) {
  return (products || []).map((product) => applyPricingToProduct(product, ctx));
}

module.exports = {
  applyPricingToProduct,
  applyPricingToProducts,
};
