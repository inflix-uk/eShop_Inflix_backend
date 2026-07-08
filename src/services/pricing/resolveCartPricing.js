const mongoose = require('mongoose');
const Product = require('../../models/product');
const { normalizeId } = require('./normalizePricingIds');
const { loadPricingContext } = require('./loadPricingContext');
const {
  resolveVariantUnitPrice,
  resolveSingleProductUnitPrice,
} = require('./resolveUnitPrice');

function findVariantIndex(product, variantId) {
  const variants = Array.isArray(product?.variantValues) ? product.variantValues : [];
  const target = normalizeId(variantId);
  if (!target) return -1;

  let idx = variants.findIndex(
    (v) => v._id && normalizeId(v._id) === target
  );
  if (idx >= 0) return idx;

  idx = variants.findIndex((v) => normalizeId(v.variantId) === target);
  return idx;
}

/**
 * Resolve server-side unit prices for checkout cart lines.
 * @param {Array<{ productId: string, variantId: string, qty?: number, isTradeIn?: boolean }>} lines
 * @param {{ userId?: string|null, groupId?: string|null }} scope
 */
async function resolveCartPricing(lines, scope = {}) {
  const chargeable = (lines || []).filter((l) => !l.isTradeIn && l.productId !== 'trade-in');
  const productIds = [
    ...new Set(
      chargeable
        .map((l) => l.productId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const [products, ctx] = await Promise.all([
    productIds.length
      ? Product.find({ _id: { $in: productIds }, status: 'true' })
          .select('_id name price variantValues minSalePrice minPrice')
          .lean()
      : Promise.resolve([]),
    loadPricingContext(scope),
  ]);

  const productById = new Map(products.map((p) => [normalizeId(p._id), p]));
  const pricingVersion = new Date().toISOString();

  const resolvedLines = (lines || []).map((line) => {
    if (line.isTradeIn || line.productId === 'trade-in') {
      const qty = Number(line.qty) || 1;
      return {
        productId: line.productId,
        variantId: line.variantId || '',
        qty,
        unitPrice: 0,
        lineTotal: 0,
        priceSource: 'trade_in',
        found: true,
        error: null,
      };
    }

    const pid = normalizeId(line.productId);
    const product = productById.get(pid);
    const qty = Number(line.qty) || 1;

    if (!product) {
      return {
        productId: line.productId,
        variantId: line.variantId,
        qty,
        unitPrice: 0,
        lineTotal: 0,
        priceSource: 'catalog',
        found: false,
        error: 'PRODUCT_NOT_FOUND',
      };
    }

    const variants = Array.isArray(product.variantValues) ? product.variantValues : [];

    if (variants.length > 0) {
      const idx = findVariantIndex(product, line.variantId);
      if (idx < 0) {
        return {
          productId: line.productId,
          variantId: line.variantId,
          qty,
          unitPrice: 0,
          lineTotal: 0,
          priceSource: 'catalog',
          found: false,
          error: 'VARIANT_NOT_FOUND',
        };
      }
      const variant = variants[idx];
      const { unitPrice, priceSource } = resolveVariantUnitPrice(product, variant, idx, ctx);
      const safeUnit = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
      return {
        productId: line.productId,
        variantId: line.variantId,
        qty,
        unitPrice: safeUnit,
        lineTotal: Math.round(safeUnit * qty * 100) / 100,
        priceSource,
        found: true,
        error: null,
      };
    }

    const { unitPrice, priceSource } = resolveSingleProductUnitPrice(product, ctx);
    const safeUnit = Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0;
    return {
      productId: line.productId,
      variantId: line.variantId || normalizeId(product._id),
      qty,
      unitPrice: safeUnit,
      lineTotal: Math.round(safeUnit * qty * 100) / 100,
      priceSource,
      found: true,
      error: null,
    };
  });

  const subtotal = resolvedLines
    .filter((l) => l.found && l.priceSource !== 'trade_in')
    .reduce((sum, l) => sum + l.lineTotal, 0);

  return {
    lines: resolvedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    pricingVersion,
  };
}

module.exports = {
  resolveCartPricing,
  findVariantIndex,
};
