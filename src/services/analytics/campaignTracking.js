const CampaignEvent = require('../../models/campaignEvent');
const Order = require('../../models/order');
const MarketingVisitorSession = require('../../models/marketingVisitorSession');
const { resolveAnalyticsDateRange } = require('../../utils/analyticsDateRange');
const { buildAdPerformanceOrderMatch } = require('./adPerformanceReport');

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function computeConversionRate(conversions, denominator) {
  if (!denominator || denominator <= 0) return null;
  return round2((conversions / denominator) * 100);
}

function sanitize(value, maxLen) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeMediumFilter(medium) {
  if (!medium) return '';
  return String(medium).trim();
}

function isEmailMediumFilter(medium) {
  return String(medium || '').trim().toLowerCase() === 'email';
}

/** Mongo: coalesce campaign/term/medium/source from Inflix attribution shape. */
function attrFieldExpr(field) {
  return {
    $let: {
      vars: {
        n: { $ifNull: [`$attribution.normalized.${field}`, ''] },
        o: { $ifNull: [`$attribution.orderTouch.${field}`, ''] },
        l: { $ifNull: [`$attribution.lastTouch.${field}`, ''] },
        f: { $ifNull: [`$attribution.firstTouch.${field}`, ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$n' }, 0] },
          '$$n',
          {
            $cond: [
              { $gt: [{ $strLenCP: '$$o' }, 0] },
              '$$o',
              {
                $cond: [
                  { $gt: [{ $strLenCP: '$$l' }, 0] },
                  '$$l',
                  {
                    $cond: [{ $gt: [{ $strLenCP: '$$f' }, 0] }, '$$f', ''],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

function orderAttrFieldExpr(field) {
  return {
    $let: {
      vars: {
        n: { $ifNull: [`$marketingAttribution.normalized.${field}`, ''] },
        o: { $ifNull: [`$marketingAttribution.orderTouch.${field}`, ''] },
        l: { $ifNull: [`$marketingAttribution.lastTouch.${field}`, ''] },
        f: { $ifNull: [`$marketingAttribution.firstTouch.${field}`, ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$n' }, 0] },
          '$$n',
          {
            $cond: [
              { $gt: [{ $strLenCP: '$$o' }, 0] },
              '$$o',
              {
                $cond: [
                  { $gt: [{ $strLenCP: '$$l' }, 0] },
                  '$$l',
                  {
                    $cond: [{ $gt: [{ $strLenCP: '$$f' }, 0] }, '$$f', ''],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

/** term is not on normalized — coalesce touches only. */
function attrTermExpr(root = 'attribution') {
  const prefix = root === 'order' ? 'marketingAttribution' : 'attribution';
  return {
    $let: {
      vars: {
        o: { $ifNull: [`$${prefix}.orderTouch.term`, ''] },
        l: { $ifNull: [`$${prefix}.lastTouch.term`, ''] },
        f: { $ifNull: [`$${prefix}.firstTouch.term`, ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$o' }, 0] },
          '$$o',
          {
            $cond: [
              { $gt: [{ $strLenCP: '$$l' }, 0] },
              '$$l',
              {
                $cond: [{ $gt: [{ $strLenCP: '$$f' }, 0] }, '$$f', ''],
              },
            ],
          },
        ],
      },
    },
  };
}

function emailMediumMatchExpr(mediumPath) {
  return {
    $in: [{ $toLower: { $ifNull: [mediumPath, ''] } }, ['email', 'newsletter']],
  };
}

/**
 * Guide §4.5.1 — record campaign click (public, consent-independent).
 * Requires at least one of: utmSource, utmMedium, utmCampaign, utmId.
 */
async function recordCampaignClick(payload = {}) {
  const utmSource = sanitize(payload.utmSource, 120);
  const utmMedium = sanitize(payload.utmMedium, 120);
  const utmCampaign = sanitize(payload.utmCampaign, 200);
  const utmTerm = sanitize(payload.utmTerm, 200);
  const utmContent = sanitize(payload.utmContent, 200);
  const utmId = sanitize(payload.utmId, 128);

  if (!utmSource && !utmMedium && !utmCampaign && !utmId) {
    return { ok: false, reason: 'missing_campaign_signal' };
  }

  const doc = await CampaignEvent.create({
    type: 'click',
    visitorId: sanitize(payload.visitorId, 128),
    sessionId: sanitize(payload.sessionId, 128),
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    utmId,
    landingPage: sanitize(payload.landingPage, 2048),
    referrer: sanitize(payload.referrer, 2048),
    deviceType: sanitize(payload.deviceType, 32),
    userAgent: sanitize(payload.userAgent, 512),
  });

  return { ok: true, id: doc._id };
}

async function resolveClickTrackingStartedAt() {
  const fromEnv = process.env.MARKETING_CLICK_TRACKING_STARTED_AT;
  if (fromEnv && String(fromEnv).trim()) {
    const d = new Date(fromEnv);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const earliest = await CampaignEvent.findOne()
    .sort({ createdAt: 1 })
    .select('createdAt')
    .lean();
  return earliest?.createdAt ? new Date(earliest.createdAt) : null;
}

async function aggregateClicks({ startDate, endDate, groupBy, medium }) {
  const match = {
    type: 'click',
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (isEmailMediumFilter(medium)) {
    match.$expr = emailMediumMatchExpr('$utmMedium');
  } else if (medium) {
    match.utmMedium = new RegExp(`^${escapeRegex(medium)}$`, 'i');
  }

  const dimField = groupBy === 'term' ? '$utmTerm' : '$utmCampaign';

  const rows = await CampaignEvent.aggregate([
    { $match: match },
    {
      $addFields: {
        dimValue: {
          $cond: [
            { $gt: [{ $strLenCP: { $ifNull: [dimField, ''] } }, 0] },
            dimField,
            null,
          ],
        },
      },
    },
    { $match: { dimValue: { $ne: null } } },
    {
      $group: {
        _id: '$dimValue',
        clicks: { $sum: 1 },
        clickVisitors: { $addToSet: '$visitorId' },
        source: { $last: '$utmSource' },
        medium: { $last: '$utmMedium' },
        firstClickAt: { $min: '$createdAt' },
        lastClickAt: { $max: '$createdAt' },
      },
    },
    {
      $project: {
        name: '$_id',
        clicks: 1,
        clickVisitors: {
          $size: {
            $filter: {
              input: '$clickVisitors',
              as: 'v',
              cond: {
                $and: [{ $ne: ['$$v', null] }, { $ne: ['$$v', ''] }],
              },
            },
          },
        },
        source: 1,
        medium: 1,
        firstClickAt: 1,
        lastClickAt: 1,
      },
    },
  ]);

  return rows;
}

async function aggregateSessionVisitors({ startDate, endDate, groupBy, medium }) {
  const match = {
    lastSeenAt: { $gte: startDate, $lte: endDate },
  };

  const dimExpr =
    groupBy === 'term' ? attrTermExpr('attribution') : attrFieldExpr('campaign');
  const mediumExpr = attrFieldExpr('medium');
  const sourceExpr = attrFieldExpr('source');

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        dimValue: dimExpr,
        attrMedium: mediumExpr,
        attrSource: sourceExpr,
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $strLenCP: { $ifNull: ['$dimValue', ''] } }, 0] },
      },
    },
  ];

  if (isEmailMediumFilter(medium)) {
    pipeline.push({
      $match: { $expr: emailMediumMatchExpr('$attrMedium') },
    });
  } else if (medium) {
    pipeline.push({
      $match: {
        $expr: {
          $eq: [{ $toLower: '$attrMedium' }, String(medium).toLowerCase()],
        },
      },
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$dimValue',
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
        source: { $last: '$attrSource' },
        medium: { $last: '$attrMedium' },
      },
    },
    {
      $project: {
        name: '$_id',
        sessions: 1,
        uniqueVisitors: {
          $size: {
            $filter: {
              input: '$visitors',
              as: 'v',
              cond: {
                $and: [{ $ne: ['$$v', null] }, { $ne: ['$$v', ''] }],
              },
            },
          },
        },
        source: 1,
        medium: 1,
      },
    }
  );

  return MarketingVisitorSession.aggregate(pipeline);
}

async function aggregateOrderConversions({ startDate, endDate, groupBy, medium }) {
  const orderMatch = buildAdPerformanceOrderMatch(startDate, endDate);
  const dimExpr =
    groupBy === 'term' ? attrTermExpr('order') : orderAttrFieldExpr('campaign');
  const mediumExpr = orderAttrFieldExpr('medium');
  const sourceExpr = orderAttrFieldExpr('source');

  const pipeline = [
    { $match: orderMatch },
    {
      $addFields: {
        dimValue: dimExpr,
        attrMedium: mediumExpr,
        attrSource: sourceExpr,
        orderRevenue: { $ifNull: ['$totalOrderValue', 0] },
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $strLenCP: { $ifNull: ['$dimValue', ''] } }, 0] },
      },
    },
  ];

  if (isEmailMediumFilter(medium)) {
    pipeline.push({
      $match: { $expr: emailMediumMatchExpr('$attrMedium') },
    });
  } else if (medium) {
    pipeline.push({
      $match: {
        $expr: {
          $eq: [{ $toLower: '$attrMedium' }, String(medium).toLowerCase()],
        },
      },
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$dimValue',
        conversions: { $sum: 1 },
        revenue: { $sum: '$orderRevenue' },
        source: { $last: '$attrSource' },
        medium: { $last: '$attrMedium' },
      },
    },
    {
      $project: {
        name: '$_id',
        conversions: 1,
        revenue: 1,
        source: 1,
        medium: 1,
      },
    }
  );

  return Order.aggregate(pipeline);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergeCampaignRows(clickRows, sessionRows, orderRows) {
  const byName = new Map();

  const ensure = (name) => {
    const key = String(name);
    if (!byName.has(key)) {
      byName.set(key, {
        name: key,
        source: null,
        medium: null,
        clicks: 0,
        clickVisitors: 0,
        visitors: 0,
        sessions: 0,
        conversions: 0,
        revenue: 0,
        lastClickAt: null,
        firstClickAt: null,
      });
    }
    return byName.get(key);
  };

  for (const row of clickRows) {
    const r = ensure(row.name);
    r.clicks = row.clicks || 0;
    r.clickVisitors = row.clickVisitors || 0;
    r.source = row.source || r.source;
    r.medium = row.medium || r.medium;
    r.firstClickAt = row.firstClickAt || null;
    r.lastClickAt = row.lastClickAt || null;
  }

  for (const row of sessionRows) {
    const r = ensure(row.name);
    r.sessions = row.sessions || 0;
    r.visitors = row.uniqueVisitors || 0;
    r.source = r.source || row.source || null;
    r.medium = r.medium || row.medium || null;
  }

  for (const row of orderRows) {
    const r = ensure(row.name);
    r.conversions = row.conversions || 0;
    r.revenue = round2(row.revenue || 0);
    r.source = r.source || row.source || null;
    r.medium = r.medium || row.medium || null;
  }

  const rows = [...byName.values()].map((r) => {
    const visitorsDenom = r.visitors > 0 ? r.visitors : r.clickVisitors;
    const conversionRate = computeConversionRate(r.conversions, visitorsDenom);
    const clickToPurchaseRate = computeConversionRate(r.conversions, r.clicks);
    const aov = r.conversions > 0 ? round2(r.revenue / r.conversions) : 0;

    return {
      name: r.name,
      source: r.source,
      medium: r.medium,
      clicks: r.clicks,
      visitors: visitorsDenom,
      conversions: r.conversions,
      conversionRate,
      clickToPurchaseRate,
      revenue: r.revenue,
      aov,
      lastClickAt: r.lastClickAt,
      firstClickAt: r.firstClickAt,
    };
  });

  rows.sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks || a.name.localeCompare(b.name));
  return rows;
}

/**
 * Guide §4.5.2 — GET /analytics/campaigns
 */
async function getCampaignAnalytics(query = {}) {
  const range = resolveAnalyticsDateRange({
    startDate: query.from || query.startDate,
    endDate: query.to || query.endDate,
  });
  const groupBy = query.groupBy === 'term' ? 'term' : 'campaign';
  const medium = normalizeMediumFilter(query.medium);

  const { startDate, endDate } = range;

  const [clickRows, sessionRows, orderRows, clickTrackingStartedAt] = await Promise.all([
    aggregateClicks({ startDate, endDate, groupBy, medium }),
    aggregateSessionVisitors({ startDate, endDate, groupBy, medium }),
    aggregateOrderConversions({ startDate, endDate, groupBy, medium }),
    resolveClickTrackingStartedAt(),
  ]);

  const rows = mergeCampaignRows(clickRows, sessionRows, orderRows);

  const totals = {
    campaigns: rows.length,
    clicks: rows.reduce((s, r) => s + (r.clicks || 0), 0),
    visitors: rows.reduce((s, r) => s + (r.visitors || 0), 0),
    conversions: rows.reduce((s, r) => s + (r.conversions || 0), 0),
    revenue: round2(rows.reduce((s, r) => s + (r.revenue || 0), 0)),
    conversionRate: null,
  };
  totals.conversionRate = computeConversionRate(totals.conversions, totals.visitors);

  let historicalOrdersWarning = null;
  if (clickTrackingStartedAt && clickTrackingStartedAt > startDate) {
    const preEnd =
      clickTrackingStartedAt < endDate ? clickTrackingStartedAt : endDate;
    const preClickOrders = await Order.countDocuments({
      isdeleted: { $ne: true },
      status: { $nin: ['Failed', 'deleted'] },
      createdAt: { $gte: startDate, $lt: preEnd },
      $or: [
        { 'marketingAttribution.normalized.campaign': { $exists: true, $nin: [null, ''] } },
        { 'marketingAttribution.orderTouch.campaign': { $exists: true, $nin: [null, ''] } },
        { 'marketingAttribution.lastTouch.campaign': { $exists: true, $nin: [null, ''] } },
      ],
    });
    if (preClickOrders > 0) {
      historicalOrdersWarning =
        `${preClickOrders} attributed order(s) in this range were placed before click tracking started. ` +
        'Link-click metrics may under-count for those campaigns.';
    }
  }

  return {
    success: true,
    stats: {
      totals,
      rows,
      clickTrackingStartedAt: clickTrackingStartedAt
        ? clickTrackingStartedAt.toISOString()
        : null,
      historicalOrdersWarning,
      meta: {
        from: range.queryStartDate,
        to: range.queryEndDate,
        groupBy,
        medium: medium || '',
        timezone: range.timezone,
      },
    },
  };
}

function orderMatchesDimension(order, groupBy, value) {
  const attr = order.marketingAttribution || {};
  if (groupBy === 'term') {
    const term =
      attr.orderTouch?.term || attr.lastTouch?.term || attr.firstTouch?.term || '';
    return String(term) === String(value);
  }
  const campaign =
    attr.normalized?.campaign ||
    attr.orderTouch?.campaign ||
    attr.lastTouch?.campaign ||
    attr.firstTouch?.campaign ||
    '';
  return String(campaign) === String(value);
}

function orderMatchesMedium(order, medium) {
  if (!medium) return true;
  const attr = order.marketingAttribution || {};
  const m = (
    attr.normalized?.medium ||
    attr.orderTouch?.medium ||
    attr.lastTouch?.medium ||
    attr.firstTouch?.medium ||
    ''
  ).toLowerCase();
  if (isEmailMediumFilter(medium)) {
    return m === 'email' || m === 'newsletter';
  }
  return m === String(medium).toLowerCase();
}

function mapOrderProducts(order) {
  const cart = Array.isArray(order.cart) ? order.cart : [];
  return cart
    .filter((item) => item && !item.isTradeIn && item.productId !== 'trade-in')
    .map((item) => ({
      name: item.productName || item.name || 'Product',
      quantity: item.qty || 1,
      price: Number(item.salePrice ?? item.Price ?? 0) || 0,
      image: item.image || item.productImage || item.img || null,
    }));
}

function customerDisplay(order) {
  const contact = order.contactDetails || {};
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (contact.name) return String(contact.name);
  if (contact.email) return String(contact.email);
  return null;
}

/**
 * Guide §4.5.3 — GET /analytics/campaigns/orders
 */
async function getCampaignOrders(query = {}) {
  const range = resolveAnalyticsDateRange({
    startDate: query.from || query.startDate,
    endDate: query.to || query.endDate,
  });
  const groupBy = query.groupBy === 'term' ? 'term' : 'campaign';
  const value = String(query.value || '').trim();
  const medium = normalizeMediumFilter(query.medium);

  if (!value) {
    return {
      success: false,
      status: 400,
      message: 'value is required',
    };
  }

  const orderMatch = buildAdPerformanceOrderMatch(range.startDate, range.endDate);
  const candidates = await Order.find(orderMatch)
    .select(
      'orderNumber totalOrderValue createdAt status contactDetails marketingAttribution cart'
    )
    .sort({ createdAt: -1 })
    .lean();

  const matched = candidates.filter(
    (order) => orderMatchesDimension(order, groupBy, value) && orderMatchesMedium(order, medium)
  );

  let revenue = 0;
  const orders = matched.map((order) => {
    const total = round2(order.totalOrderValue || 0);
    revenue = round2(revenue + total);
    return {
      _id: order._id,
      orderNumber: order.orderNumber || String(order._id),
      customerName: customerDisplay(order),
      customerEmail: order.contactDetails?.email || null,
      createdAt: order.createdAt,
      status: order.status,
      total,
      products: mapOrderProducts(order),
    };
  });

  return {
    success: true,
    stats: {
      value,
      groupBy,
      orderCount: orders.length,
      revenue,
      orders,
      meta: {
        from: range.queryStartDate,
        to: range.queryEndDate,
        medium: medium || '',
      },
    },
  };
}

module.exports = {
  recordCampaignClick,
  getCampaignAnalytics,
  getCampaignOrders,
  resolveClickTrackingStartedAt,
};
