const Order = require('../../models/order');
const Product = require('../../models/product');
const MarketingAdSpend = require('../../models/marketingAdSpend');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');
const { resolvePlatformInJs } = require('./attributionPlatform');
const {
  resolveUnitCost,
  lineRevenue,
  isTradeInLine,
} = require('./profitabilityService');
const { computeRoas } = require('./adSpendRoasService');

const SPEND_PLATFORM_TO_SOURCE = {
  google_ads: 'Google Ads',
};

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function emptyBucket() {
  return {
    revenue: 0,
    grossProfit: 0,
    faRevenue: 0,
    faProfit: 0,
    excludedOrders: 0,
    orders: 0,
    lineItemsWithCost: 0,
  };
}

function orderGrossProfit(order, productMap) {
  const cart = Array.isArray(order.cart) ? order.cart : [];
  let revenueWithCost = 0;
  let cogs = 0;
  let lineItemsWithCost = 0;

  for (const item of cart) {
    if (isTradeInLine(item)) continue;

    const qty = Number(item?.qty) || 0;
    if (qty <= 0) continue;

    const productId = item?.productId;
    if (!productId || productId === 'trade-in') continue;

    const product = productMap.get(String(productId));
    const unitCost = resolveUnitCost(item, product);
    if (unitCost == null) continue;

    lineItemsWithCost += 1;
    revenueWithCost += lineRevenue(item);
    cogs += unitCost * qty;
  }

  return {
    grossProfit: round2(revenueWithCost - cogs),
    lineItemsWithCost,
  };
}

async function loadProductMap(orders) {
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

  if (productIds.size === 0) return new Map();

  const products = await Product.find({ _id: { $in: [...productIds] } })
    .select('variantValues')
    .lean();

  return new Map(products.map((product) => [product._id.toString(), product]));
}

async function aggregateSpendBySource(startDate, endDate) {
  const rows = await MarketingAdSpend.aggregate([
    {
      $match: {
        spendDate: { $gte: startDate, $lte: endDate },
        amount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$platform',
        spend: { $sum: '$amount' },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const source = SPEND_PLATFORM_TO_SOURCE[row._id] || row._id;
    if (!source) continue;
    map.set(source, round2((map.get(source) || 0) + (row.spend || 0)));
  }
  return map;
}

function computePoas(grossProfit, spend) {
  if (!spend || spend <= 0) return null;
  return round2(grossProfit / spend);
}

/**
 * Per-source ROAS vs POAS with fraud-adjusted columns for Marketing Overview.
 * Fraud-adjusted excludes orders with marketingFraud.flagged === true.
 */
async function getRoasVsPoasBySource(startDate, endDate, channel = 'all') {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const [orders, spendBySource] = await Promise.all([
    Order.find(revenueMatch)
      .select('cart totalOrderValue marketingAttribution marketingFraud')
      .lean(),
    aggregateSpendBySource(startDate, endDate),
  ]);

  if (!orders.length) {
    return {
      availability: 'unavailable',
      poasAvailability: 'unavailable',
      rows: [],
    };
  }

  const productMap = await loadProductMap(orders);
  const bySource = new Map();

  for (const order of orders) {
    const source = resolvePlatformInJs(order) || 'Direct';
    const bucket = bySource.get(source) || emptyBucket();
    const revenue = Number(order.totalOrderValue) || 0;
    const { grossProfit, lineItemsWithCost } = orderGrossProfit(order, productMap);
    const flagged = order?.marketingFraud?.flagged === true;

    bucket.orders += 1;
    bucket.revenue += revenue;
    bucket.grossProfit += grossProfit;
    bucket.lineItemsWithCost += lineItemsWithCost;

    if (flagged) {
      bucket.excludedOrders += 1;
    } else {
      bucket.faRevenue += revenue;
      bucket.faProfit += grossProfit;
    }

    bySource.set(source, bucket);
  }

  let anyCost = false;
  const rows = [...bySource.entries()]
    .map(([source, bucket]) => {
      const spend = spendBySource.get(source) || 0;
      const hasSpend = spend > 0;
      const hasCost = bucket.lineItemsWithCost > 0;
      if (hasCost) anyCost = true;

      const revenue = round2(bucket.revenue);
      const grossProfit = round2(bucket.grossProfit);
      const faRevenue = round2(bucket.faRevenue);
      const faProfit = round2(bucket.faProfit);
      const roas = hasSpend ? computeRoas(revenue, spend) : null;
      const poas = hasSpend && hasCost ? computePoas(grossProfit, spend) : null;
      const fraudAdjustedRoas = hasSpend ? computeRoas(faRevenue, spend) : null;
      const fraudAdjustedPoas = hasSpend && hasCost ? computePoas(faProfit, spend) : null;

      return {
        source,
        revenue,
        grossProfit,
        adSpend: round2(spend),
        roas,
        poas,
        faRevenue,
        faProfit,
        fraudAdjustedRoas,
        fraudAdjustedPoas,
        excludedOrders: bucket.excludedOrders,
        orders: bucket.orders,
        spendAvailability: hasSpend ? 'available' : 'unavailable',
        roasAvailability: roas != null ? 'available' : 'unavailable',
        poasAvailability: poas != null ? 'available' : 'unavailable',
        fraudAdjustedRoasAvailability:
          fraudAdjustedRoas != null ? 'available' : 'unavailable',
        fraudAdjustedPoasAvailability:
          fraudAdjustedPoas != null ? 'available' : 'unavailable',
        profitAvailability: hasCost ? 'available' : 'unavailable',
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.source.localeCompare(b.source));

  return {
    availability: 'available',
    poasAvailability: anyCost ? 'available' : 'unavailable',
    rows,
  };
}

module.exports = {
  getRoasVsPoasBySource,
  SPEND_PLATFORM_TO_SOURCE,
};
