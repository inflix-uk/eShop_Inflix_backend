const Order = require('../../models/order');
const Product = require('../../models/product');
const MarketingAdSpend = require('../../models/marketingAdSpend');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');
const {
  resolvePlatformInJs,
  resolveCampaignInJs,
} = require('./attributionPlatform');
const {
  resolveUnitCost,
  lineRevenue,
  isTradeInLine,
} = require('./profitabilityService');
const { computeRoas, aggregateSpendByCampaign } = require('./adSpendRoasService');
const { SPEND_PLATFORM_TO_SOURCE } = require('./roasVsPoasService');

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function emptyBucket() {
  return {
    orders: 0,
    revenue: 0,
    cogs: 0,
    revenueWithCost: 0,
    grossProfit: 0,
    faRevenue: 0,
    faProfit: 0,
    excludedRevenue: 0,
    excludedProfit: 0,
    lineItemsWithCost: 0,
  };
}

function orderLineEconomics(order, productMap) {
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
    cogs: round2(cogs),
    revenueWithCost: round2(revenueWithCost),
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

function computeMargin(grossProfit, revenueWithCost) {
  if (!revenueWithCost || revenueWithCost <= 0) return null;
  return round2((grossProfit / revenueWithCost) * 100);
}

function accumulateOrder(bucket, revenue, economics, flagged) {
  bucket.orders += 1;
  bucket.revenue += revenue;
  bucket.cogs += economics.cogs;
  bucket.revenueWithCost += economics.revenueWithCost;
  bucket.grossProfit += economics.grossProfit;
  bucket.lineItemsWithCost += economics.lineItemsWithCost;

  if (flagged) {
    bucket.excludedRevenue += revenue;
    bucket.excludedProfit += economics.grossProfit;
  } else {
    bucket.faRevenue += revenue;
    bucket.faProfit += economics.grossProfit;
  }
}

function finalizeSourceRow(source, bucket, spend) {
  const hasSpend = spend > 0;
  const hasCost = bucket.lineItemsWithCost > 0;
  const revenue = round2(bucket.revenue);
  const cogs = round2(bucket.cogs);
  const grossProfit = round2(bucket.grossProfit);
  const faRevenue = round2(bucket.faRevenue);
  const faProfit = round2(bucket.faProfit);
  const margin = computeMargin(grossProfit, bucket.revenueWithCost);
  const roas = hasSpend ? computeRoas(revenue, spend) : null;
  const poas = hasSpend && hasCost ? computePoas(grossProfit, spend) : null;
  const fraudAdjustedRoas = hasSpend ? computeRoas(faRevenue, spend) : null;
  const fraudAdjustedPoas = hasSpend && hasCost ? computePoas(faProfit, spend) : null;

  return {
    source,
    orders: bucket.orders,
    revenue,
    cogs,
    grossProfit,
    margin,
    spend: round2(spend),
    roas,
    poas,
    fraudAdjustedRoas,
    fraudAdjustedPoas,
    marginAvailability: margin != null ? 'available' : 'unavailable',
    roasAvailability: roas != null ? 'available' : 'unavailable',
    poasAvailability: poas != null ? 'available' : 'unavailable',
    fraudAdjustedRoasAvailability:
      fraudAdjustedRoas != null ? 'available' : 'unavailable',
    fraudAdjustedPoasAvailability:
      fraudAdjustedPoas != null ? 'available' : 'unavailable',
    spendAvailability: hasSpend ? 'available' : 'unavailable',
    profitAvailability: hasCost ? 'available' : 'unavailable',
  };
}

function finalizeCampaignRow(campaign, bucket, spend) {
  const hasSpend = spend > 0;
  const hasCost = bucket.lineItemsWithCost > 0;
  const revenue = round2(bucket.revenue);
  const cogs = round2(bucket.cogs);
  const grossProfit = round2(bucket.grossProfit);
  const margin = computeMargin(grossProfit, bucket.revenueWithCost);
  const roas = hasSpend ? computeRoas(revenue, spend) : null;
  const poas = hasSpend && hasCost ? computePoas(grossProfit, spend) : null;

  return {
    campaign,
    orders: bucket.orders,
    revenue,
    cogs,
    grossProfit,
    margin,
    spend: round2(spend),
    roas,
    poas,
    excludedRevenue: round2(bucket.excludedRevenue),
    excludedProfit: round2(bucket.excludedProfit),
    marginAvailability: margin != null ? 'available' : 'unavailable',
    roasAvailability: roas != null ? 'available' : 'unavailable',
    poasAvailability: poas != null ? 'available' : 'unavailable',
    spendAvailability: hasSpend ? 'available' : 'unavailable',
    profitAvailability: hasCost ? 'available' : 'unavailable',
  };
}

/**
 * Profit by source / campaign for Marketing Overview tables.
 */
async function getProfitBreakdowns(startDate, endDate, channel = 'all') {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const [orders, spendBySource, spendByCampaign] = await Promise.all([
    Order.find(revenueMatch)
      .select('cart totalOrderValue marketingAttribution marketingFraud')
      .lean(),
    aggregateSpendBySource(startDate, endDate),
    aggregateSpendByCampaign(startDate, endDate),
  ]);

  if (!orders.length) {
    return {
      profitBySource: { availability: 'unavailable', rows: [] },
      profitByCampaign: { availability: 'unavailable', rows: [] },
    };
  }

  const productMap = await loadProductMap(orders);
  const bySource = new Map();
  const byCampaign = new Map();

  for (const order of orders) {
    const source = resolvePlatformInJs(order) || 'Direct';
    const campaign = resolveCampaignInJs(order) || '(unassigned)';
    const revenue = Number(order.totalOrderValue) || 0;
    const economics = orderLineEconomics(order, productMap);
    const flagged = order?.marketingFraud?.flagged === true;

    const sourceBucket = bySource.get(source) || emptyBucket();
    accumulateOrder(sourceBucket, revenue, economics, flagged);
    bySource.set(source, sourceBucket);

    const campaignBucket = byCampaign.get(campaign) || emptyBucket();
    accumulateOrder(campaignBucket, revenue, economics, flagged);
    byCampaign.set(campaign, campaignBucket);
  }

  const profitBySourceRows = [...bySource.entries()]
    .map(([source, bucket]) =>
      finalizeSourceRow(source, bucket, spendBySource.get(source) || 0)
    )
    .sort((a, b) => b.revenue - a.revenue || a.source.localeCompare(b.source));

  const profitByCampaignRows = [...byCampaign.entries()]
    .map(([campaign, bucket]) => {
      const spendRow = spendByCampaign.get(String(campaign || '').trim().toLowerCase());
      return finalizeCampaignRow(campaign, bucket, spendRow?.spend || 0);
    })
    .sort((a, b) => b.revenue - a.revenue || a.campaign.localeCompare(b.campaign));

  return {
    profitBySource: {
      availability: 'available',
      rows: profitBySourceRows,
    },
    profitByCampaign: {
      availability: 'available',
      rows: profitByCampaignRows,
    },
  };
}

module.exports = {
  getProfitBreakdowns,
};
