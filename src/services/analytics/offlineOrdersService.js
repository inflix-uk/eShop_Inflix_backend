const MarketingOfflineOrder = require('../../models/marketingOfflineOrder');
const { resolveAnalyticsDateRange } = require('../../utils/analyticsDateRange');

const CHANNEL_LABELS = {
  phone: 'Phone',
  in_store: 'In store',
  marketplace: 'Marketplace',
  wholesale: 'Wholesale',
  other: 'Other',
};

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function getOfflineOrdersMetrics(startDate, endDate) {
  const [summary, byChannel, recentOrders] = await Promise.all([
    MarketingOfflineOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          totalValue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: '$totalValue' },
        },
      },
    ]),
    MarketingOfflineOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: startDate, $lte: endDate },
          totalValue: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$channel',
          orders: { $sum: 1 },
          revenue: { $sum: '$totalValue' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    MarketingOfflineOrder.find({
      orderDate: { $gte: startDate, $lte: endDate },
      totalValue: { $gt: 0 },
    })
      .sort({ orderDate: -1 })
      .limit(20)
      .select('orderNumber orderDate totalValue channel customerName notes')
      .lean(),
  ]);

  const orders = summary[0]?.orders || 0;
  const revenue = round2(summary[0]?.revenue || 0);
  const aov = orders > 0 ? round2(revenue / orders) : 0;

  return {
    orders,
    revenue,
    aov,
    byChannel: byChannel.map((row) => ({
      channel: row._id || 'other',
      channelLabel: CHANNEL_LABELS[row._id] || CHANNEL_LABELS.other,
      orders: row.orders,
      revenue: round2(row.revenue),
    })),
    recentOrders: recentOrders.map((row) => ({
      orderNumber: row.orderNumber || null,
      orderDate: row.orderDate,
      totalValue: round2(row.totalValue),
      channel: row.channel || 'other',
      channelLabel: CHANNEL_LABELS[row.channel] || CHANNEL_LABELS.other,
      customerName: row.customerName || null,
      notes: row.notes || null,
    })),
    availability: orders > 0 ? 'available' : 'unavailable',
  };
}

async function upsertOfflineOrder({
  orderNumber,
  orderDate,
  totalValue,
  channel = 'other',
  customerName,
  customerEmail,
  notes,
  source = 'manual',
}) {
  const parsedValue = Number(totalValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return { ok: false, reason: 'totalValue must be a positive number' };
  }

  let orderInstant;
  if (orderDate instanceof Date) {
    orderInstant = orderDate;
  } else {
    const resolved = resolveAnalyticsDateRange({
      startDate: String(orderDate).slice(0, 10),
      endDate: String(orderDate).slice(0, 10),
    });
    orderInstant = resolved.startDate;
  }

  if (!orderInstant || Number.isNaN(orderInstant.getTime())) {
    return { ok: false, reason: 'orderDate is invalid' };
  }

  const allowedChannels = ['phone', 'in_store', 'marketplace', 'wholesale', 'other'];
  const normalizedChannel = allowedChannels.includes(channel) ? channel : 'other';

  const payload = {
    orderDate: orderInstant,
    totalValue: round2(parsedValue),
    channel: normalizedChannel,
    customerName: customerName || null,
    customerEmail: customerEmail || null,
    notes: notes || null,
    source: source || 'manual',
  };

  if (orderNumber && String(orderNumber).trim()) {
    const doc = await MarketingOfflineOrder.findOneAndUpdate(
      { orderNumber: String(orderNumber).trim() },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { ok: true, id: doc._id };
  }

  const doc = await MarketingOfflineOrder.create(payload);
  return { ok: true, id: doc._id };
}

module.exports = {
  getOfflineOrdersMetrics,
  upsertOfflineOrder,
  CHANNEL_LABELS,
};
