const Order = require('../../models/order');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');
const {
  resolvePlatformExpression,
  resolveCampaignExpression,
} = require('./attributionPlatform');

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function computeFraudRate(fraudOrders, orders) {
  if (!orders || orders <= 0) return 0;
  return round2((fraudOrders / orders) * 100);
}

async function aggregateFraudByDimension(revenueMatch, groupFieldExpr, nameKey) {
  const rows = await Order.aggregate([
    { $match: revenueMatch },
    {
      $addFields: {
        dimName: groupFieldExpr,
        isFlagged: { $eq: ['$marketingFraud.flagged', true] },
        orderRevenue: { $ifNull: ['$totalOrderValue', 0] },
      },
    },
    {
      $group: {
        _id: '$dimName',
        orders: { $sum: 1 },
        fraudOrders: { $sum: { $cond: ['$isFlagged', 1, 0] } },
        revenue: { $sum: '$orderRevenue' },
        excludedRevenue: {
          $sum: { $cond: ['$isFlagged', '$orderRevenue', 0] },
        },
      },
    },
    { $sort: { orders: -1, excludedRevenue: -1 } },
  ]);

  return rows.map((row) => ({
    [nameKey]: row._id || (nameKey === 'campaign' ? '(unassigned)' : 'Direct'),
    orders: row.orders || 0,
    fraudOrders: row.fraudOrders || 0,
    fraudRate: computeFraudRate(row.fraudOrders || 0, row.orders || 0),
    revenue: round2(row.revenue || 0),
    excludedRevenue: round2(row.excludedRevenue || 0),
  }));
}

/**
 * Fraud rate by source / campaign for Marketing Analytics overview.
 * Uses revenue-eligible orders + marketingFraud.flagged.
 */
async function getFraudInsights(startDate, endDate, channel = 'all') {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const revenueOrders = await Order.countDocuments(revenueMatch);
  if (revenueOrders === 0) {
    return {
      availability: 'unavailable',
      bySource: [],
      byCampaign: [],
      totals: {
        fraudOrders: 0,
        fraudRate: 0,
        excludedRevenue: 0,
        excludedProfit: 0,
      },
    };
  }

  const platformExpr = resolvePlatformExpression();
  const campaignExpr = resolveCampaignExpression();

  const [bySource, byCampaign, flaggedAgg] = await Promise.all([
    aggregateFraudByDimension(revenueMatch, platformExpr, 'source'),
    aggregateFraudByDimension(revenueMatch, campaignExpr, 'campaign'),
    Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          fraudOrders: {
            $sum: { $cond: [{ $eq: ['$marketingFraud.flagged', true] }, 1, 0] },
          },
          excludedRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$marketingFraud.flagged', true] },
                { $ifNull: ['$totalOrderValue', 0] },
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const totalsRow = flaggedAgg[0] || { orders: 0, fraudOrders: 0, excludedRevenue: 0 };
  const fraudOrders = totalsRow.fraudOrders || 0;
  const orders = totalsRow.orders || revenueOrders;

  return {
    availability: 'available',
    bySource,
    byCampaign,
    totals: {
      fraudOrders,
      fraudRate: computeFraudRate(fraudOrders, orders),
      excludedRevenue: round2(totalsRow.excludedRevenue || 0),
      // Profit exclusion requires cost join; surface 0 until fraud-adjusted POAS wires costs.
      excludedProfit: 0,
    },
  };
}

/**
 * Flag / unflag an order for marketing fraud analytics.
 */
async function setOrderMarketingFraud(orderId, { flagged, reason, flaggedBy } = {}) {
  const order = await Order.findById(orderId);
  if (!order || order.isdeleted) {
    return { ok: false, status: 404, message: 'Order not found' };
  }

  const nextFlagged = Boolean(flagged);
  if (nextFlagged && !String(reason || '').trim()) {
    return { ok: false, status: 400, message: 'Reason is required to flag an order' };
  }

  order.marketingFraud = {
    flagged: nextFlagged,
    reason: nextFlagged ? String(reason).trim().slice(0, 500) : null,
    flaggedAt: nextFlagged ? new Date() : null,
    flaggedBy: nextFlagged ? sanitizeActor(flaggedBy) : null,
  };
  order.updatedAt = new Date();
  await order.save();

  return {
    ok: true,
    order: order.toObject(),
    message: nextFlagged ? 'Order flagged as fraud' : 'Fraud flag removed',
  };
}

function sanitizeActor(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.slice(0, 128) : null;
}

module.exports = {
  getFraudInsights,
  setOrderMarketingFraud,
};
