const Order = require('../../models/order');
const Product = require('../../models/product');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function parseNonNegativeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function lineRevenue(cartItem) {
  const qty = Number(cartItem?.qty) || 0;
  if (qty <= 0) return 0;
  const unitPrice = Number(cartItem?.salePrice ?? cartItem?.Price ?? 0);
  if (!Number.isFinite(unitPrice)) return 0;
  return qty * unitPrice;
}

function isTradeInLine(cartItem) {
  return cartItem?.isTradeIn === true || cartItem?.productId === 'trade-in';
}

/**
 * Match cart line to variant Cost using the same fallbacks as order stock reduction.
 */
function resolveVariantForLine(cartItem, product) {
  if (!product) return null;

  const variantValues = Array.isArray(product.variantValues) ? product.variantValues : [];
  const isSingleProduct = variantValues.length === 0;
  const isSingleVariantProduct = variantValues.length === 1;

  if (isSingleProduct) {
    return null;
  }

  if (isSingleVariantProduct) {
    return variantValues[0];
  }

  const variantId = cartItem.variantId || cartItem._id;
  let variantIndex = -1;

  if (variantId) {
    variantIndex = variantValues.findIndex(
      (variant) => variant._id && variant._id.toString() === String(variantId)
    );
  }

  if (variantIndex === -1 && cartItem.SKU) {
    variantIndex = variantValues.findIndex((variant) => variant.SKU === cartItem.SKU);
  }

  if (variantIndex === -1 && cartItem.EIN) {
    variantIndex = variantValues.findIndex((variant) => variant.EIN === cartItem.EIN);
  }

  if (variantIndex === -1 && cartItem.name) {
    variantIndex = variantValues.findIndex((variant) => variant.name === cartItem.name);
  }

  return variantIndex >= 0 ? variantValues[variantIndex] : null;
}

function resolveUnitCost(cartItem, product) {
  const variant = resolveVariantForLine(cartItem, product);
  if (!variant) return null;
  return parseNonNegativeNumber(variant.Cost);
}

/**
 * Gross margin from product variant Cost on revenue-eligible order lines.
 * Margin is computed on lines where a unit cost could be resolved.
 */
async function getProfitabilityMetrics(startDate, endDate, channel = 'all') {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const orders = await Order.find(revenueMatch).select('cart').lean();

  const productIds = new Set();

  for (const order of orders) {
    const cart = Array.isArray(order.cart) ? order.cart : [];
    for (const item of cart) {
      if (isTradeInLine(item)) continue;
      const productId = item?.productId;
      if (!productId || productId === 'trade-in') continue;
      productIds.add(String(productId));
    }
  }

  if (productIds.size === 0) {
    return {
      lineItemsInRange: 0,
      lineItemsWithCost: 0,
      lineItemsMissingCost: 0,
      totalLineRevenue: 0,
      revenueWithCost: 0,
      cogs: 0,
      grossProfit: 0,
      grossMarginPercent: null,
      costCoveragePercent: null,
      availability: 'unavailable',
    };
  }

  const products = await Product.find({ _id: { $in: [...productIds] } })
    .select('variantValues')
    .lean();

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  let lineItemsInRange = 0;
  let lineItemsWithCost = 0;
  let lineItemsMissingCost = 0;
  let totalLineRevenue = 0;
  let revenueWithCost = 0;
  let cogs = 0;

  for (const order of orders) {
    const cart = Array.isArray(order.cart) ? order.cart : [];
    for (const item of cart) {
      if (isTradeInLine(item)) continue;

      const qty = Number(item?.qty) || 0;
      if (qty <= 0) continue;

      const productId = item?.productId;
      if (!productId || productId === 'trade-in') continue;

      lineItemsInRange += 1;
      const revenue = lineRevenue(item);
      totalLineRevenue += revenue;

      const product = productMap.get(String(productId));
      const unitCost = resolveUnitCost(item, product);

      if (unitCost != null) {
        lineItemsWithCost += 1;
        revenueWithCost += revenue;
        cogs += unitCost * qty;
      } else {
        lineItemsMissingCost += 1;
      }
    }
  }

  const grossProfit = round2(revenueWithCost - cogs);
  const grossMarginPercent =
    revenueWithCost > 0 ? round2((grossProfit / revenueWithCost) * 100) : null;
  const costCoveragePercent =
    totalLineRevenue > 0 ? round2((revenueWithCost / totalLineRevenue) * 100) : null;

  return {
    lineItemsInRange,
    lineItemsWithCost,
    lineItemsMissingCost,
    totalLineRevenue: round2(totalLineRevenue),
    revenueWithCost: round2(revenueWithCost),
    cogs: round2(cogs),
    grossProfit,
    grossMarginPercent,
    costCoveragePercent,
    availability: lineItemsWithCost > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getProfitabilityMetrics,
  resolveUnitCost,
  resolveVariantForLine,
  lineRevenue,
  isTradeInLine,
};
