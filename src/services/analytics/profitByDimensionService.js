const Order = require('../../models/order');
const Product = require('../../models/product');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');
const {
  aggregateSpendByCampaign,
  aggregateSpendBySource,
  computeRoas,
  computeCac,
} = require('./adSpendRoasService');
const {
  resolveMeaningfulUnitCost,
  lineRevenue,
  isTradeInLine,
} = require('./profitabilityService');

const UNAVAILABLE = 'unavailable';
const NOT_SET = '(not set)';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function computePoas(grossProfit, spend) {
  if (!spend || spend <= 0) return null;
  return round2(grossProfit / spend);
}

function dimensionValue(order, dimension) {
  const normalized = order?.marketingAttribution?.normalized || {};
  const raw =
    dimension === 'source'
      ? normalized.source
      : dimension === 'campaign'
        ? normalized.campaign
        : normalized.source;
  const key = raw == null ? '' : String(raw).trim();
  return key || NOT_SET;
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

function accumulateOrderLineProfit(order, productMap, groups, dimension) {
  const key = dimensionValue(order, dimension);
  if (!groups.has(key)) {
    groups.set(key, {
      key,
      orders: 0,
      revenue: 0,
      grossProfit: 0,
      cogs: 0,
      fraudOrders: 0,
      fraudRevenue: 0,
      fraudProfit: 0,
    });
  }

  const group = groups.get(key);
  const isFraud = order?.marketingFraud?.flagged === true;
  group.orders += 1;

  const cart = Array.isArray(order.cart) ? order.cart : [];
  let orderRevenue = 0;
  let orderProfit = 0;

  for (const item of cart) {
    if (isTradeInLine(item)) continue;
    const qty = Number(item?.qty) || 0;
    if (qty <= 0) continue;

    const productId = item?.productId;
    if (!productId || productId === 'trade-in') continue;

    const revenue = lineRevenue(item);
    orderRevenue += revenue;

    const product = productMap.get(String(productId));
    const unitCost = resolveMeaningfulUnitCost(item, product);
    if (unitCost != null) {
      const lineCogs = unitCost * qty;
      group.cogs += lineCogs;
      orderProfit += revenue - lineCogs;
    }
  }

  group.revenue = round2(group.revenue + orderRevenue);
  group.grossProfit = round2(group.grossProfit + orderProfit);

  if (isFraud) {
    group.fraudOrders += 1;
    group.fraudRevenue = round2(group.fraudRevenue + orderRevenue);
    group.fraudProfit = round2(group.fraudProfit + orderProfit);
  }
}

async function getProfitBySource(startDate, endDate, channel) {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);
  const [orders, spendBySource] = await Promise.all([
    Order.find(revenueMatch)
      .select('cart marketingAttribution marketingFraud totalOrderValue')
      .lean(),
    aggregateSpendBySource(startDate, endDate),
  ]);

  if (orders.length === 0) {
    return { rows: [], availability: UNAVAILABLE };
  }

  const productMap = await loadProductMap(orders);
  const groups = new Map();

  for (const order of orders) {
    accumulateOrderLineProfit(order, productMap, groups, 'source');
  }

  const rows = [...groups.values()]
    .map((row) => {
      const sourceKey = String(row.key || '').trim().toLowerCase();
      const spendRow = spendBySource.get(sourceKey);
      const spend = spendRow?.spend ?? 0;
      const hasSpend = spend > 0;
      const cleanRevenue = round2(row.revenue - row.fraudRevenue);
      const cleanProfit = round2(row.grossProfit - row.fraudProfit);

      return {
        source: row.key,
        orders: row.orders,
        revenue: row.revenue,
        grossProfit: row.grossProfit,
        cogs: round2(row.cogs),
        margin: row.revenue > 0 ? round2((row.grossProfit / row.revenue) * 100) : null,
        fraudOrders: row.fraudOrders,
        excludedRevenue: row.fraudRevenue,
        excludedProfit: row.fraudProfit,
        cleanRevenue,
        cleanProfit,
        spend: hasSpend ? spend : null,
        roas: hasSpend ? computeRoas(cleanRevenue, spend) : null,
        poas: hasSpend ? computePoas(cleanProfit, spend) : null,
        spendAvailability: hasSpend ? 'available' : UNAVAILABLE,
        roasAvailability: hasSpend ? 'available' : UNAVAILABLE,
        poasAvailability: hasSpend && cleanProfit > 0 ? 'available' : UNAVAILABLE,
      };
    })
    .sort((a, b) => (b.spend || 0) - (a.spend || 0) || b.revenue - a.revenue);

  return {
    rows,
    availability: rows.some((row) => row.grossProfit > 0 || row.revenue > 0)
      ? 'available'
      : UNAVAILABLE,
  };
}

async function getProfitByCampaign(startDate, endDate, channel) {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);
  const [orders, spendByCampaign] = await Promise.all([
    Order.find(revenueMatch)
      .select('cart marketingAttribution marketingFraud totalOrderValue')
      .lean(),
    aggregateSpendByCampaign(startDate, endDate),
  ]);

  if (orders.length === 0) {
    return { rows: [], availability: UNAVAILABLE };
  }

  const productMap = await loadProductMap(orders);
  const groups = new Map();

  for (const order of orders) {
    accumulateOrderLineProfit(order, productMap, groups, 'campaign');
  }

  const rows = [...groups.values()]
    .map((row) => {
      const spendRow = spendByCampaign.get(row.key);
      const spend = spendRow?.spend ?? 0;
      const hasSpend = spend > 0;
      const cleanRevenue = round2(row.revenue - row.fraudRevenue);
      const cleanProfit = round2(row.grossProfit - row.fraudProfit);

      return {
        campaign: row.key,
        orders: row.orders,
        revenue: row.revenue,
        grossProfit: row.grossProfit,
        cogs: round2(row.cogs),
        margin: row.revenue > 0 ? round2((row.grossProfit / row.revenue) * 100) : null,
        fraudOrders: row.fraudOrders,
        excludedRevenue: row.fraudRevenue,
        excludedProfit: row.fraudProfit,
        cleanRevenue,
        cleanProfit,
        spend: hasSpend ? spend : null,
        roas: hasSpend ? computeRoas(cleanRevenue, spend) : null,
        poas: hasSpend ? computePoas(cleanProfit, spend) : null,
        cpa: hasSpend ? computeCac(spend, row.orders) : null,
        spendAvailability: hasSpend ? 'available' : UNAVAILABLE,
        roasAvailability: hasSpend ? 'available' : UNAVAILABLE,
        poasAvailability: hasSpend && cleanProfit > 0 ? 'available' : UNAVAILABLE,
      };
    })
    .sort((a, b) => (b.spend || 0) - (a.spend || 0) || b.revenue - a.revenue);

  return {
    rows,
    availability: rows.length > 0 ? 'available' : UNAVAILABLE,
  };
}

module.exports = {
  getProfitBySource,
  getProfitByCampaign,
  computePoas,
};
