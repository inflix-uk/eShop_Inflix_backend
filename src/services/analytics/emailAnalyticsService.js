const Order = require('../../models/order');
const Newsletter = require('../../models/newsletter');
const { buildNestedChannelRevenueMatch } = require('../../utils/analyticsOrderMatch');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function aggregateEmailGroups(match, groupField) {
  const rows = await Order.aggregate([
    { $match: match },
    {
      $match: {
        [groupField]: { $exists: true, $nin: [null, ''] },
      },
    },
    {
      $group: {
        _id: `$${groupField}`,
        orders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return rows.map((row) => ({
    name: row._id,
    orders: row.orders,
    revenue: round2(row.revenue),
    aov: row.orders > 0 ? round2(row.revenue / row.orders) : 0,
  }));
}

/**
 * Email-attributed orders (utm source/medium/channel email) + newsletter signups in range.
 */
async function getEmailAnalyticsMetrics(startDate, endDate, selectedChannel = 'all') {
  const match = buildNestedChannelRevenueMatch(startDate, endDate, selectedChannel, 'email');

  const [summary, bySource, byCampaign, newSubscribersInRange] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
        },
      },
    ]),
    aggregateEmailGroups(match, 'marketingAttribution.normalized.source'),
    aggregateEmailGroups(match, 'marketingAttribution.normalized.campaign'),
    Newsletter.countDocuments({
      subscribedAt: { $gte: startDate, $lte: endDate },
    }),
  ]);

  const orders = summary[0]?.orders || 0;
  const revenue = round2(summary[0]?.revenue || 0);
  const aov = orders > 0 ? round2(revenue / orders) : 0;

  return {
    orders,
    revenue,
    aov,
    newSubscribersInRange,
    bySource,
    byCampaign,
    availability: orders > 0 || newSubscribersInRange > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getEmailAnalyticsMetrics,
};
