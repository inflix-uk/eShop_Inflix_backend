const Order = require('../../models/order');
const MarketingVisitorSession = require('../../models/marketingVisitorSession');
const { buildRevenueMatch } = require('../../utils/analyticsOrderMatch');

const UNAVAILABLE = 'unavailable';
const NOT_SET = '(not set)';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizeKey(value) {
  if (value == null) return '';
  return String(value).trim();
}

function dimensionFieldPath(dimension) {
  const paths = {
    source: 'marketingAttribution.normalized.source',
    medium: 'marketingAttribution.normalized.medium',
    campaign: 'marketingAttribution.normalized.campaign',
    channel: 'marketingAttribution.normalized.channel',
  };
  return paths[dimension] || paths.source;
}

function isEmptyDimensionExpr(fieldPath) {
  return {
    $or: [
      { [fieldPath]: { $exists: false } },
      { [fieldPath]: null },
      { [fieldPath]: '' },
    ],
  };
}

async function getUnattributedBucket(revenueMatch, dimension) {
  const fieldPath = dimensionFieldPath(dimension);
  const [row] = await Order.aggregate([
    { $match: revenueMatch },
    { $match: isEmptyDimensionExpr(fieldPath) },
    {
      $group: {
        _id: null,
        revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
        orders: { $sum: 1 },
      },
    },
  ]);

  if (!row || row.orders === 0) return null;

  return {
    key: NOT_SET,
    revenue: round2(row.revenue),
    orders: row.orders,
  };
}

function appendNotSetRow(rows, bucket, keyField) {
  if (!bucket) return rows;
  if (rows.some((row) => normalizeKey(row[keyField]) === NOT_SET)) return rows;
  return [
    ...rows,
    {
      [keyField]: NOT_SET,
      revenue: bucket.revenue,
      orders: bucket.orders,
    },
  ].sort((a, b) => b.revenue - a.revenue);
}

async function getOrderDimensionMetrics(revenueMatch, dimension) {
  const fieldPath = dimensionFieldPath(dimension);

  const rows = await Order.aggregate([
    { $match: revenueMatch },
    {
      $addFields: {
        dimensionKey: {
          $let: {
            vars: { raw: `$${fieldPath}` },
            in: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$$raw', null] },
                    { $ne: [{ $trim: { input: { $toString: '$$raw' } } }, ''] },
                  ],
                },
                { $trim: { input: { $toString: '$$raw' } } },
                NOT_SET,
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$dimensionKey',
        revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
        orders: { $sum: 1 },
        visitorIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: ['$marketingAttribution.visitorId', null] },
                  { $ne: ['$marketingAttribution.visitorId', ''] },
                ],
              },
              '$marketingAttribution.visitorId',
              '$$REMOVE',
            ],
          },
        },
        fraudOrders: {
          $sum: {
            $cond: [{ $eq: ['$marketingFraud.flagged', true] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        key: '$_id',
        revenue: 1,
        orders: 1,
        visitors: { $size: '$visitorIds' },
        fraudOrders: 1,
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const key = normalizeKey(row.key) || NOT_SET;
    map.set(key, {
      key,
      revenue: round2(row.revenue),
      orders: row.orders,
      visitors: row.visitors,
      fraudOrders: row.fraudOrders || 0,
    });
  }
  return map;
}

async function getSessionVisitorsByTrafficSource(startDate, endDate) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $addFields: {
        sourceKey: {
          $cond: [
            {
              $and: [
                { $ne: ['$trafficSource', null] },
                { $ne: [{ $trim: { input: { $toString: '$trafficSource' } } }, ''] },
              ],
            },
            { $trim: { input: { $toString: '$trafficSource' } } },
            'direct',
          ],
        },
      },
    },
    {
      $group: {
        _id: '$sourceKey',
        sessions: { $sum: 1 },
        visitorIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: ['$visitorId', null] },
                  { $ne: ['$visitorId', ''] },
                ],
              },
              '$visitorId',
              '$$REMOVE',
            ],
          },
        },
      },
    },
    {
      $project: {
        key: '$_id',
        sessions: 1,
        visitors: { $size: '$visitorIds' },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const key = normalizeKey(row.key) || 'direct';
    map.set(key, {
      sessions: row.sessions,
      visitors: row.visitors,
    });
  }
  return map;
}

function resolveVisitorsForKey(key, orderMetrics, sessionMetrics) {
  let sessionRow = sessionMetrics.get(key);
  if (!sessionRow && key === NOT_SET) {
    sessionRow = sessionMetrics.get('direct');
  }
  if (sessionRow?.visitors > 0) return sessionRow.visitors;
  const orderRow = orderMetrics.get(key);
  if (orderRow?.visitors > 0) return orderRow.visitors;
  return 0;
}

function computeRowConversionRate(orders, visitors) {
  if (!visitors || visitors <= 0) return null;
  return round2((orders / visitors) * 100);
}

function computeFraudRate(orders, fraudOrders) {
  if (!orders || orders <= 0) return 0;
  return round2((fraudOrders / orders) * 100);
}

/**
 * Build enriched revenue rows for source/medium/campaign/channel tables.
 */
async function buildEnrichedRevenueRows({
  startDate,
  endDate,
  channel,
  dimension,
  baseRows,
  keyField,
}) {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);
  const bucket = await getUnattributedBucket(revenueMatch, dimension);
  const rowsWithNotSet = appendNotSetRow(baseRows, bucket, keyField);

  const orderMetrics = await getOrderDimensionMetrics(revenueMatch, dimension);
  const sessionMetrics =
    dimension === 'source' || dimension === 'campaign' || dimension === 'medium'
      ? await getSessionVisitorsByTrafficSource(startDate, endDate)
      : new Map();

  return rowsWithNotSet.map((row) => {
    const key = normalizeKey(row[keyField]) || NOT_SET;
    const orderRow = orderMetrics.get(key) || {
      revenue: row.revenue ?? 0,
      orders: row.orders ?? 0,
      visitors: 0,
      fraudOrders: 0,
    };
    const visitors = resolveVisitorsForKey(key, orderMetrics, sessionMetrics);
    const orders = orderRow.orders ?? row.orders ?? 0;
    const revenue = round2(orderRow.revenue ?? row.revenue ?? 0);
    const conversionRate = computeRowConversionRate(orders, visitors);
    const fraudRate = computeFraudRate(orders, orderRow.fraudOrders);

    return {
      [keyField]: key,
      revenue,
      orders,
      visitors,
      visitorsAvailability: visitors > 0 ? 'available' : UNAVAILABLE,
      conversionRate,
      conversionRateAvailability: conversionRate != null ? 'available' : UNAVAILABLE,
      fraudRate,
      fraudRateAvailability: 'available',
      fraudOrders: orderRow.fraudOrders || 0,
    };
  });
}

async function getFraudInsights(startDate, endDate, channel) {
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);

  const [bySource, byCampaign, totals, fraudOrders] = await Promise.all([
    Order.aggregate([
      { $match: revenueMatch },
      {
        $addFields: {
          sourceKey: {
            $let: {
              vars: { raw: '$marketingAttribution.normalized.source' },
              in: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$$raw', null] },
                      { $ne: [{ $trim: { input: { $toString: '$$raw' } } }, ''] },
                    ],
                  },
                  { $trim: { input: { $toString: '$$raw' } } },
                  NOT_SET,
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$sourceKey',
          orders: { $sum: 1 },
          fraudOrders: {
            $sum: { $cond: [{ $eq: ['$marketingFraud.flagged', true] }, 1, 0] },
          },
        },
      },
      { $sort: { orders: -1 } },
    ]),
    Order.aggregate([
      { $match: revenueMatch },
      {
        $addFields: {
          campaignKey: {
            $let: {
              vars: { raw: '$marketingAttribution.normalized.campaign' },
              in: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$$raw', null] },
                      { $ne: [{ $trim: { input: { $toString: '$$raw' } } }, ''] },
                    ],
                  },
                  { $trim: { input: { $toString: '$$raw' } } },
                  NOT_SET,
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$campaignKey',
          orders: { $sum: 1 },
          fraudOrders: {
            $sum: { $cond: [{ $eq: ['$marketingFraud.flagged', true] }, 1, 0] },
          },
        },
      },
      { $sort: { orders: -1 } },
    ]),
    Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
          fraudOrders: {
            $sum: { $cond: [{ $eq: ['$marketingFraud.flagged', true] }, 1, 0] },
          },
          fraudRevenue: {
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
    Order.find({ ...revenueMatch, 'marketingFraud.flagged': true })
      .select('cart totalOrderValue')
      .lean(),
  ]);

  const totalRow = totals[0] || { orders: 0, revenue: 0, fraudOrders: 0, fraudRevenue: 0 };

  let excludedProfit = 0;
  if (fraudOrders.length > 0) {
    const {
      resolveUnitCost,
      lineRevenue,
      isTradeInLine,
    } = require('./profitabilityService');
    const Product = require('../../models/product');
    const productIds = new Set();
    for (const order of fraudOrders) {
      for (const item of order.cart || []) {
        if (isTradeInLine(item)) continue;
        if (item?.productId) productIds.add(String(item.productId));
      }
    }
    const products = productIds.size
      ? await Product.find({ _id: { $in: [...productIds] } }).select('variantValues').lean()
      : [];
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    for (const order of fraudOrders) {
      for (const item of order.cart || []) {
        if (isTradeInLine(item)) continue;
        const qty = Number(item?.qty) || 0;
        if (qty <= 0) continue;
        const revenue = lineRevenue(item);
        const unitCost = resolveUnitCost(item, productMap.get(String(item.productId)));
        excludedProfit += unitCost != null ? revenue - unitCost * qty : revenue;
      }
    }
    excludedProfit = round2(excludedProfit);
  }

  return {
    bySource: bySource.map((row) => ({
      source: row._id,
      orders: row.orders,
      fraudOrders: row.fraudOrders,
      fraudRate: computeFraudRate(row.orders, row.fraudOrders),
    })),
    byCampaign: byCampaign.map((row) => ({
      campaign: row._id,
      orders: row.orders,
      fraudOrders: row.fraudOrders,
      fraudRate: computeFraudRate(row.orders, row.fraudOrders),
    })),
    totals: {
      orders: totalRow.orders,
      revenue: round2(totalRow.revenue),
      fraudOrders: totalRow.fraudOrders,
      excludedRevenue: round2(totalRow.fraudRevenue),
      excludedProfit,
      fraudRate: computeFraudRate(totalRow.orders, totalRow.fraudOrders),
    },
    availability: totalRow.orders > 0 ? 'available' : UNAVAILABLE,
  };
}

module.exports = {
  NOT_SET,
  appendNotSetRow,
  buildEnrichedRevenueRows,
  getFraudInsights,
  computeRowConversionRate,
  computeFraudRate,
};
