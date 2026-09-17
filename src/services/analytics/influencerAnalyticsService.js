const Order = require('../../models/order');
const { buildNestedChannelRevenueMatch } = require('../../utils/analyticsOrderMatch');

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function influencerNameExpr() {
  return {
    $let: {
      vars: {
        content: { $ifNull: ['$marketingAttribution.normalized.content', ''] },
        campaign: { $ifNull: ['$marketingAttribution.normalized.campaign', ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$content' }, 0] },
          '$$content',
          {
            $cond: [{ $gt: [{ $strLenCP: '$$campaign' }, 0] }, '$$campaign', null],
          },
        ],
      },
    },
  };
}

async function aggregateInfluencerGroups(match) {
  const rows = await Order.aggregate([
    { $match: match },
    {
      $addFields: {
        influencerName: influencerNameExpr(),
      },
    },
    { $match: { influencerName: { $ne: null } } },
    {
      $group: {
        _id: '$influencerName',
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
 * Influencer orders: utm_source or utm_medium = influencer (grouped by utm_content / campaign).
 */
async function getInfluencerAnalyticsMetrics(startDate, endDate, selectedChannel = 'all') {
  const match = buildNestedChannelRevenueMatch(startDate, endDate, selectedChannel, 'influencer');

  const [summary, topInfluencers, topInfluencerCampaigns] = await Promise.all([
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
    aggregateInfluencerGroups(match),
    Order.aggregate([
      { $match: match },
      {
        $match: {
          'marketingAttribution.normalized.campaign': { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$marketingAttribution.normalized.campaign',
          orders: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  const orders = summary[0]?.orders || 0;
  const revenue = round2(summary[0]?.revenue || 0);
  const aov = orders > 0 ? round2(revenue / orders) : 0;

  const campaigns = topInfluencerCampaigns.map((row) => ({
    name: row._id,
    orders: row.orders,
    revenue: round2(row.revenue),
    aov: row.orders > 0 ? round2(row.revenue / row.orders) : 0,
  }));

  return {
    orders,
    revenue,
    aov,
    topInfluencers: topInfluencers.slice(0, 10),
    topInfluencerCampaigns: campaigns.slice(0, 10),
    availability: orders > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getInfluencerAnalyticsMetrics,
};
