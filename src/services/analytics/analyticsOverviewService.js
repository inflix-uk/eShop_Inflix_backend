const Order = require('../../models/order');
const MarketingVisitorSession = require('../../models/marketingVisitorSession');
const {
  countVisitorSessionsInRange,
  countUniqueVisitorsInRange,
  getSessionPopulationInRange,
} = require('./recordVisitorSession');
const {
  ANALYTICS_TIMEZONE,
  resolveAnalyticsDateRange,
  getUkCalendarDateString,
} = require('../../utils/analyticsDateRange');
const {
  REVENUE_STATUSES,
  buildBaseMatch,
  buildRevenueMatch,
} = require('../../utils/analyticsOrderMatch');
const { computeConversionMetrics } = require('../../utils/analyticsConversionMetrics');
const { computeConvertedInPopulation } = require('../../utils/analyticsConversionPopulation');
const { getAbandonedCheckoutMetrics } = require('./abandonedCheckoutService');
const { getCustomerProfileMetrics } = require('./customerProfileService');
const { getProfitabilityMetrics } = require('./profitabilityService');
const { getAdSpendRoasMetrics } = require('./adSpendRoasService');
const { getFraudInsights } = require('./fraudInsightsService');
const { getRoasVsPoasBySource } = require('./roasVsPoasService');
const { getProfitBreakdowns } = require('./profitBreakdownService');
const {
  resolvePlatformExpression,
  resolveCampaignExpression,
  coalesceTouchField,
} = require('./attributionPlatform');

const DONUT_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#64748b',
];

const UNAVAILABLE = 'unavailable';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function computeRowConversionRate(orders, visitors, sessions) {
  if (visitors > 0) return round2((orders / visitors) * 100);
  if (sessions > 0) return round2((orders / sessions) * 100);
  return 0;
}

/**
 * Unique visitors + sessions grouped by a resolved attribution dimension.
 * Uses startedAt to match overview session KPIs.
 */
async function aggregateSessionsByDimension(startDate, endDate, dimensionExpr, defaultLabel) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $addFields: {
        marketingAttribution: { $ifNull: ['$attribution', {}] },
      },
    },
    {
      $addFields: {
        dimLabel: {
          $let: {
            vars: { label: dimensionExpr },
            in: {
              $cond: [
                {
                  $gt: [
                    {
                      $strLenCP: {
                        $trim: { input: { $toString: { $ifNull: ['$$label', ''] } } },
                      },
                    },
                    0,
                  ],
                },
                '$$label',
                defaultLabel,
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$dimLabel',
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        sessions: 1,
        visitors: {
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
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const label = row._id || defaultLabel;
    map.set(String(label), {
      sessions: row.sessions || 0,
      visitors: row.visitors || 0,
    });
  }
  return map;
}

function nonEmptyAttrStr(fieldPath) {
  return {
    $gt: [{ $strLenCP: { $ifNull: [fieldPath, ''] } }, 0],
  };
}

/**
 * utm_medium (touch coalesce) → click-id heuristics → channel → (direct).
 * Matches common analytics medium labels (cpc, social, Email, (direct)).
 */
function resolveMediumDimensionExpression() {
  return {
    $let: {
      vars: {
        medium: coalesceTouchField('medium'),
        channel: {
          $toLower: {
            $trim: {
              input: {
                $toString: {
                  $ifNull: ['$marketingAttribution.normalized.channel', ''],
                },
              },
            },
          },
        },
      },
      in: {
        $switch: {
          branches: [
            {
              case: { $gt: [{ $strLenCP: '$$medium' }, 0] },
              then: '$$medium',
            },
            {
              case: {
                $or: [
                  nonEmptyAttrStr('$marketingAttribution.clickIds.gclid'),
                  nonEmptyAttrStr('$marketingAttribution.clickIds.gbraid'),
                  nonEmptyAttrStr('$marketingAttribution.clickIds.wbraid'),
                ],
              },
              then: 'cpc',
            },
            {
              case: {
                $or: [
                  nonEmptyAttrStr('$marketingAttribution.clickIds.fbclid'),
                  nonEmptyAttrStr('$marketingAttribution.clickIds.ttclid'),
                ],
              },
              then: 'social',
            },
            {
              case: { $in: ['$$channel', ['email', 'newsletter']] },
              then: 'Email',
            },
            {
              case: { $in: ['$$channel', ['paid_search', 'cpc', 'ppc']] },
              then: 'cpc',
            },
            {
              case: {
                $in: ['$$channel', ['paid_social', 'social', 'facebook', 'instagram']],
              },
              then: 'social',
            },
            {
              case: {
                $and: [
                  { $gt: [{ $strLenCP: '$$channel' }, 0] },
                  { $not: { $in: ['$$channel', ['direct', 'none', 'organic']] } },
                ],
              },
              then: '$$channel',
            },
          ],
          default: '(direct)',
        },
      },
    },
  };
}

/** Add session-only mediums (visitors, no orders yet) so the table is not empty. */
function mergeSessionOnlyDimensionRows(rows, nameKey, sessionMap, defaultLabel) {
  const merged = [...(rows || [])];
  const seen = new Set(merged.map((row) => String(row[nameKey] || defaultLabel)));

  for (const [label, session] of sessionMap.entries()) {
    const key = String(label || defaultLabel);
    if (seen.has(key)) continue;
    const visitors = session.visitors || 0;
    const sessions = session.sessions || 0;
    if (visitors <= 0 && sessions <= 0) continue;

    merged.push({
      [nameKey]: key,
      revenue: 0,
      orders: 0,
      visitors,
      sessions,
      conversionRate: 0,
      visitorsAvailability: 'available',
      conversionRateAvailability: 'available',
    });
    seen.add(key);
  }

  return merged.sort(
    (a, b) => b.revenue - a.revenue || b.orders - a.orders || b.visitors - a.visitors
  );
}

function enrichRevenueRowsWithSessions(rows, nameKey, sessionMap, defaultLabel) {
  return (rows || []).map((row) => {
    const rawLabel = row[nameKey];
    const label =
      rawLabel == null || String(rawLabel).trim() === ''
        ? defaultLabel
        : String(rawLabel);
    const session = sessionMap.get(label) || { sessions: 0, visitors: 0 };
    const visitors = session.visitors || 0;
    const sessions = session.sessions || 0;
    const orders = row.orders || 0;
    const conversionRate = computeRowConversionRate(orders, visitors, sessions);

    return {
      ...row,
      [nameKey]: label,
      visitors,
      sessions,
      conversionRate,
      visitorsAvailability: 'available',
      conversionRateAvailability: 'available',
    };
  });
}

function parseTrackingStartedAt() {
  const raw = process.env.MARKETING_TRACKING_STARTED_AT;
  if (!raw || !String(raw).trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Env first; else earliest visitor session (dev fallback when env is unset). */
async function resolveTrackingStartedAt() {
  const fromEnv = parseTrackingStartedAt();
  if (fromEnv) return fromEnv;

  const earliest = await MarketingVisitorSession.findOne()
    .sort({ startedAt: 1 })
    .select('startedAt')
    .lean();
  if (!earliest?.startedAt) return null;

  const d = new Date(earliest.startedAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolvePreTrackingMeta({ queryStartDate, trackingStartedAt, rangePreset }) {
  if (!trackingStartedAt) {
    return {
      rangeIncludesPreTrackingPeriod: false,
      preTrackingNote: null,
    };
  }

  const trackingStartYmd = getUkCalendarDateString(trackingStartedAt);

  if (rangePreset === 'sinceTracking') {
    return {
      rangeIncludesPreTrackingPeriod: false,
      preTrackingNote: 'Starts on tracking start date',
    };
  }

  return {
    rangeIncludesPreTrackingPeriod: queryStartDate < trackingStartYmd,
    preTrackingNote: null,
  };
}

function nonEmptyIdExpr(fieldPath) {
  return {
    $gt: [{ $strLenCP: { $ifNull: [fieldPath, ''] } }, 0],
  };
}

function resolveAttributionAvailability(withAttr, total) {
  if (!total || total === 0) return 'none';
  if (withAttr >= total) return 'available';
  if (withAttr > 0) return 'partial';
  return 'none';
}

/** Normalize full URL or path to pathname for Top landing pages (Zextons-style). */
function normalizeLandingPath(raw) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;

  try {
    if (/^https?:\/\//i.test(value)) {
      const pathname = new URL(value).pathname || '/';
      return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    }
  } catch {
    /* fall through */
  }

  let path = value.split('?')[0].split('#')[0].trim();
  if (!path) return '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

/**
 * Top landing pages by session count in range (MarketingVisitorSession.landingPage).
 */
async function getVisitorsByDevice(startDate, endDate) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          $cond: [
            {
              $in: [
                { $ifNull: ['$deviceType', 'unknown'] },
                ['mobile', 'desktop', 'tablet', 'unknown'],
              ],
            },
            { $ifNull: ['$deviceType', 'unknown'] },
            'unknown',
          ],
        },
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
        device: '$_id',
        sessions: 1,
        visitors: {
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
      },
    },
    { $sort: { sessions: -1 } },
  ]);

  const labelMap = {
    mobile: 'Mobile',
    desktop: 'Desktop',
    tablet: 'Tablet',
    unknown: 'Unknown',
  };

  const devices = rows.map((row) => ({
    device: row.device || 'unknown',
    label: labelMap[row.device] || 'Unknown',
    sessions: row.sessions || 0,
    visitors: row.visitors || 0,
  }));

  const totalSessions = devices.reduce((sum, row) => sum + row.sessions, 0);

  return {
    availability: totalSessions > 0 ? 'available' : UNAVAILABLE,
    devices,
  };
}

async function getTopLandingPages(startDate, endDate, limit = 10) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $addFields: {
        rawLanding: {
          $let: {
            vars: {
              sessionLp: { $ifNull: ['$landingPage', ''] },
              firstLp: { $ifNull: ['$attribution.firstTouch.landingPage', ''] },
              orderLp: { $ifNull: ['$attribution.orderTouch.landingPage', ''] },
            },
            in: {
              $cond: [
                { $gt: [{ $strLenCP: '$$sessionLp' }, 0] },
                '$$sessionLp',
                {
                  $cond: [
                    { $gt: [{ $strLenCP: '$$firstLp' }, 0] },
                    '$$firstLp',
                    '$$orderLp',
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $strLenCP: { $ifNull: ['$rawLanding', ''] } }, 0] },
      },
    },
    {
      $group: {
        _id: '$rawLanding',
        sessions: { $sum: 1 },
      },
    },
  ]);

  const byPath = new Map();
  for (const row of rows) {
    const path = normalizeLandingPath(row._id) || '/';
    const sessions = row.sessions || 0;
    byPath.set(path, (byPath.get(path) || 0) + sessions);
  }

  const pages = [...byPath.entries()]
    .map(([landingPage, sessions]) => ({ landingPage, sessions }))
    .sort((a, b) => b.sessions - a.sessions || a.landingPage.localeCompare(b.landingPage))
    .slice(0, limit);

  return {
    availability: pages.length > 0 ? 'available' : UNAVAILABLE,
    pages,
  };
}

function toDonutSegments(rows, valueKey = 'value') {
  const total = rows.reduce((sum, r) => sum + (r[valueKey] || 0), 0);
  if (total <= 0) return [];
  return rows.map((row, i) => ({
    label: row.label,
    value: round2(row[valueKey]),
    percentage: round2(((row[valueKey] || 0) / total) * 100),
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
}

function lineItemNameExpr() {
  return {
    $let: {
      vars: {
        pn: { $ifNull: ['$cartItems.productName', ''] },
        nm: { $ifNull: ['$cartItems.name', ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$pn' }, 0] },
          '$$pn',
          {
            $cond: [{ $gt: [{ $strLenCP: '$$nm' }, 0] }, '$$nm', null],
          },
        ],
      },
    },
  };
}

function lineItemRevenueExpr() {
  return {
    $multiply: [
      { $ifNull: ['$cartItems.qty', 0] },
      {
        $ifNull: [
          { $toDouble: { $ifNull: ['$cartItems.salePrice', null] } },
          { $toDouble: { $ifNull: ['$cartItems.Price', 0] } },
        ],
      },
    ],
  };
}

function isTradeInLineExpr() {
  return {
    $or: [
      { $eq: ['$cartItems.isTradeIn', true] },
      { $eq: ['$cartItems.productId', 'trade-in'] },
    ],
  };
}

function hasReferrerExpr() {
  return {
    $or: [
      { $gt: [{ $strLenCP: { $ifNull: ['$marketingAttribution.firstTouch.referrer', ''] } }, 0] },
      { $gt: [{ $strLenCP: { $ifNull: ['$marketingAttribution.lastTouch.referrer', ''] } }, 0] },
      { $gt: [{ $strLenCP: { $ifNull: ['$marketingAttribution.orderTouch.referrer', ''] } }, 0] },
    ],
  };
}

function hasMarketingAttributionExpr() {
  return {
    $and: [
      { $ne: ['$marketingAttribution', null] },
      {
        $ne: [
          { $ifNull: ['$marketingAttribution.attributionStatus', 'missing'] },
          'missing',
        ],
      },
    ],
  };
}

function sourceLabelExpr() {
  return {
    $let: {
      vars: {
        src: { $ifNull: ['$marketingAttribution.normalized.source', ''] },
        ch: { $ifNull: ['$marketingAttribution.normalized.channel', ''] },
      },
      in: {
        $cond: [
          { $gt: [{ $strLenCP: '$$src' }, 0] },
          '$$src',
          {
            $cond: [{ $gt: [{ $strLenCP: '$$ch' }, 0] }, '$$ch', null],
          },
        ],
      },
    },
  };
}

async function getAnalyticsOverview(query = {}) {
  const {
    startDate,
    endDate,
    startDateLocal,
    endDateLocal,
    selectedRangeLabel,
    timezone,
    queryStartDate,
  } = resolveAnalyticsDateRange(query);
  const channel = query.channel || 'all';
  const rangePreset = query.rangePreset || query.preset || null;
  const baseMatch = buildBaseMatch(startDate, endDate, channel);
  const revenueMatch = buildRevenueMatch(startDate, endDate, channel);
  const trackingStartedAt = await resolveTrackingStartedAt();
  const preTracking = resolvePreTrackingMeta({
    queryStartDate,
    trackingStartedAt,
    rangePreset,
  });

  const [facetResult] = await Order.aggregate([
    { $facet: {
      dataQuality: [
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            ordersInRange: { $sum: 1 },
            ordersWithMarketingAttribution: {
              $sum: { $cond: [hasMarketingAttributionExpr(), 1, 0] },
            },
            ordersWithUtmSource: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      { $strLenCP: { $ifNull: ['$marketingAttribution.normalized.source', ''] } },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            ordersWithGclid: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      { $strLenCP: { $ifNull: ['$marketingAttribution.clickIds.gclid', ''] } },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            ordersWithFbclid: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      { $strLenCP: { $ifNull: ['$marketingAttribution.clickIds.fbclid', ''] } },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            ordersWithReferrer: {
              $sum: { $cond: [hasReferrerExpr(), 1, 0] },
            },
          },
        },
      ],
      revenueKpis: [
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
          },
        },
      ],
      salesUnits: [
        { $match: revenueMatch },
        {
          $addFields: {
            cartItems: {
              $cond: [{ $isArray: '$cart' }, '$cart', []],
            },
          },
        },
        { $unwind: '$cartItems' },
        { $match: { $expr: { $not: isTradeInLineExpr() } } },
        {
          $group: {
            _id: null,
            units: { $sum: { $ifNull: ['$cartItems.qty', 0] } },
          },
        },
      ],
      revenueBySource: [
        { $match: revenueMatch },
        {
          $addFields: {
            sourceLabel: resolvePlatformExpression(),
          },
        },
        {
          $group: {
            _id: '$sourceLabel',
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ],
      revenueByMedium: [
        { $match: revenueMatch },
        {
          $addFields: {
            mediumLabel: resolveMediumDimensionExpression(),
          },
        },
        {
          $group: {
            _id: '$mediumLabel',
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ],
      revenueByCampaign: [
        { $match: revenueMatch },
        {
          $addFields: {
            campaignLabel: resolveCampaignExpression(),
          },
        },
        {
          $group: {
            _id: '$campaignLabel',
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ],
      revenueByChannel: [
        { $match: revenueMatch },
        {
          $match: {
            'marketingAttribution.normalized.channel': {
              $exists: true,
              $nin: [null, ''],
            },
          },
        },
        {
          $group: {
            _id: '$marketingAttribution.normalized.channel',
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ],
      convertedVisitors: [
        { $match: revenueMatch },
        { $match: { $expr: nonEmptyIdExpr('$marketingAttribution.visitorId') } },
        { $group: { _id: '$marketingAttribution.visitorId' } },
      ],
      convertedSessions: [
        { $match: revenueMatch },
        { $match: { $expr: nonEmptyIdExpr('$marketingAttribution.sessionId') } },
        { $group: { _id: '$marketingAttribution.sessionId' } },
      ],
      ordersMissingVisitorSession: [
        { $match: revenueMatch },
        {
          $match: {
            $expr: {
              $and: [
                { $not: [nonEmptyIdExpr('$marketingAttribution.visitorId')] },
                { $not: [nonEmptyIdExpr('$marketingAttribution.sessionId')] },
              ],
            },
          },
        },
        { $count: 'count' },
      ],
      ordersBySource: [
        { $match: baseMatch },
        {
          $addFields: {
            sourceLabel: sourceLabelExpr(),
          },
        },
        { $match: { sourceLabel: { $ne: null } } },
        {
          $group: {
            _id: '$sourceLabel',
            orders: { $sum: 1 },
          },
        },
        { $sort: { orders: -1 } },
      ],
      dailyOrdersRevenue: [
        { $match: revenueMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: ANALYTICS_TIMEZONE,
              },
            },
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ],
      productLines: [
        { $match: revenueMatch },
        {
          $addFields: {
            cartItems: {
              $cond: [{ $isArray: '$cart' }, '$cart', []],
            },
          },
        },
        { $unwind: '$cartItems' },
        { $match: { $expr: { $not: isTradeInLineExpr() } } },
        {
          $addFields: {
            productName: lineItemNameExpr(),
            lineRevenue: lineItemRevenueExpr(),
          },
        },
        { $match: { productName: { $ne: null } } },
        {
          $group: {
            _id: '$productName',
            unitsSold: { $sum: { $ifNull: ['$cartItems.qty', 0] } },
            revenue: { $sum: '$lineRevenue' },
            orderIds: { $addToSet: '$_id' },
          },
        },
        {
          $addFields: {
            orders: { $size: '$orderIds' },
          },
        },
        { $sort: { revenue: -1 } },
      ],
    } },
  ]);

  const dqRow = facetResult.dataQuality[0] || {
    ordersInRange: 0,
    ordersWithMarketingAttribution: 0,
    ordersWithUtmSource: 0,
    ordersWithGclid: 0,
    ordersWithFbclid: 0,
    ordersWithReferrer: 0,
  };

  const ordersInRange = dqRow.ordersInRange || 0;
  const allOrdersInRange = ordersInRange;
  const ordersWithMarketingAttribution = dqRow.ordersWithMarketingAttribution || 0;
  const ordersWithoutMarketingAttribution = Math.max(
    0,
    ordersInRange - ordersWithMarketingAttribution
  );

  const visitorSessionsInRange = await countVisitorSessionsInRange(startDate, endDate);
  const uniqueVisitorsInRange = await countUniqueVisitorsInRange(startDate, endDate);
  const sessionPopulation = await getSessionPopulationInRange(startDate, endDate);

  const orderVisitorIds = (facetResult.convertedVisitors || [])
    .map((row) => row._id)
    .filter(Boolean);
  const orderSessionIds = (facetResult.convertedSessions || [])
    .map((row) => row._id)
    .filter(Boolean);

  const convertedPopulation = computeConvertedInPopulation(
    orderVisitorIds,
    orderSessionIds,
    sessionPopulation
  );

  const kpiRow = facetResult.revenueKpis[0] || { orders: 0, revenue: 0 };
  const orders = kpiRow.orders || 0;
  const revenueOrdersInRange = orders;
  const revenue = round2(kpiRow.revenue || 0);
  const aov = orders > 0 ? round2(revenue / orders) : 0;
  const salesUnits = facetResult.salesUnits[0]?.units || 0;

  const convertedVisitorsInRange = convertedPopulation.convertedVisitorsInRange;
  const convertedSessionsInRange = convertedPopulation.convertedSessionsInRange;
  const ordersMissingVisitorSessionInRange =
    facetResult.ordersMissingVisitorSession[0]?.count || 0;

  const {
    conversionRate,
    conversionRateDenominator,
    trafficKpiDenominator,
  } = computeConversionMetrics({
    convertedVisitorsInRange,
    convertedSessionsInRange,
    uniqueVisitorsInRange,
    visitorSessionsInRange,
  });

  const [sessionsBySource, sessionsByCampaign, sessionsByMedium] = await Promise.all([
    aggregateSessionsByDimension(
      startDate,
      endDate,
      resolvePlatformExpression(),
      'Direct'
    ),
    aggregateSessionsByDimension(
      startDate,
      endDate,
      resolveCampaignExpression(),
      '(unassigned)'
    ),
    aggregateSessionsByDimension(
      startDate,
      endDate,
      resolveMediumDimensionExpression(),
      '(direct)'
    ),
  ]);

  const revenueBySource = enrichRevenueRowsWithSessions(
    (facetResult.revenueBySource || []).map((row) => ({
      source: row._id || 'Direct',
      revenue: round2(row.revenue),
      orders: row.orders,
    })),
    'source',
    sessionsBySource,
    'Direct'
  );

  const revenueByMedium = mergeSessionOnlyDimensionRows(
    enrichRevenueRowsWithSessions(
      (facetResult.revenueByMedium || []).map((row) => ({
        medium: row._id || '(direct)',
        revenue: round2(row.revenue),
        orders: row.orders,
      })),
      'medium',
      sessionsByMedium,
      '(direct)'
    ),
    'medium',
    sessionsByMedium,
    '(direct)'
  );

  const revenueByCampaign = enrichRevenueRowsWithSessions(
    (facetResult.revenueByCampaign || []).map((row) => ({
      campaign: row._id || '(unassigned)',
      revenue: round2(row.revenue),
      orders: row.orders,
    })),
    'campaign',
    sessionsByCampaign,
    '(unassigned)'
  );

  const revenueByChannel = (facetResult.revenueByChannel || []).map((row) => ({
    channel: row._id,
    revenue: round2(row.revenue),
    orders: row.orders,
    aov: row.orders > 0 ? round2(row.revenue / row.orders) : 0,
  }));

  const campaignPerformance = revenueByCampaign.map((row) => ({
    name: row.campaign,
    orders: row.orders,
    revenue: row.revenue,
    aov: row.orders > 0 ? round2(row.revenue / row.orders) : 0,
    spend: null,
    roas: null,
    roi: null,
    cac: null,
    spendAvailability: UNAVAILABLE,
    roasAvailability: UNAVAILABLE,
    roiAvailability: UNAVAILABLE,
    cacAvailability: UNAVAILABLE,
  }));

  const adSpendMetrics = await getAdSpendRoasMetrics(startDate, endDate, revenueByCampaign);
  const { advertisingPerformance, campaignRoasRoi, campaignRoasCpa } = adSpendMetrics;
  const campaignPerformanceWithSpend = adSpendMetrics.campaignPerformance;

  const dailyOrdersRevenue = (facetResult.dailyOrdersRevenue || []).map((row) => ({
    date: row._id,
    orders: row.orders,
    revenue: round2(row.revenue),
  }));

  const ordersBySourceRows = (facetResult.ordersBySource || []).map((row) => ({
    label: row._id,
    value: row.orders,
  }));

  const productRows = (facetResult.productLines || []).map((row) => ({
    name: row._id,
    unitsSold: row.unitsSold,
    revenue: round2(row.revenue),
    orders: row.orders,
  }));

  const topSellingProducts = [...productRows]
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, 10)
    .map((row) => ({
      name: row.name,
      unitsSold: row.unitsSold,
      revenue: row.revenue,
      orders: row.orders,
    }));

  const topRevenueProducts = productRows.slice(0, 10).map((row) => ({
    name: row.name,
    revenue: row.revenue,
    unitsSold: row.unitsSold,
    orders: row.orders,
  }));

  const productPerformance = productRows.slice(0, 20).map((row) => ({
    name: row.name,
    orders: row.orders,
    unitsSold: row.unitsSold,
    revenue: row.revenue,
    visitors: null,
    visitorsAvailability: UNAVAILABLE,
    grossProfit: null,
    grossProfitAvailability: UNAVAILABLE,
    margin: null,
    marginAvailability: UNAVAILABLE,
    conversionRate: null,
    conversionRateAvailability: UNAVAILABLE,
  }));

  const productRevenueSegments = toDonutSegments(
    productRows.slice(0, 8).map((row) => ({
      label: row.name,
      value: row.revenue,
    }))
  );

  const attributionAvailability = resolveAttributionAvailability(
    ordersWithMarketingAttribution,
    ordersInRange
  );

  const rangeIncludesPreTrackingPeriod = preTracking.rangeIncludesPreTrackingPeriod;

  const abandonedCheckout = await getAbandonedCheckoutMetrics(startDate, endDate);

  const customerProfileRaw = await getCustomerProfileMetrics(startDate, endDate, channel);
  const customerProfile = {
    ...customerProfileRaw,
    revenueByCustomerType: toDonutSegments([
      { label: 'New customers', value: customerProfileRaw.revenueFromNewCustomers },
      { label: 'Returning customers', value: customerProfileRaw.revenueFromReturningCustomers },
    ]),
  };

  const [
    profitability,
    fraudInsights,
    topLandingPages,
    visitorsByDevice,
    roasVsPoas,
    profitBreakdowns,
  ] = await Promise.all([
    getProfitabilityMetrics(startDate, endDate, channel),
    getFraudInsights(startDate, endDate, channel),
    getTopLandingPages(startDate, endDate, 10),
    getVisitorsByDevice(startDate, endDate),
    getRoasVsPoasBySource(startDate, endDate, channel),
    getProfitBreakdowns(startDate, endDate, channel),
  ]);

  const { profitBySource, profitByCampaign } = profitBreakdowns;

  const fraudBySourceMap = new Map(
    (fraudInsights?.bySource || []).map((row) => [String(row.source || 'Direct'), row])
  );
  for (const row of revenueBySource) {
    const fraud = fraudBySourceMap.get(String(row.source || 'Direct'));
    row.fraudOrders = fraud?.fraudOrders || 0;
    row.fraudRate = fraud?.fraudRate ?? 0;
  }

  const grossMargin = profitability.grossMarginPercent;
  const grossMarginAvailability =
    profitability.availability === 'available' ? 'available' : UNAVAILABLE;

  return {
    meta: {
      timezone,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateLocal,
      endDateLocal,
      selectedRangeLabel,
      channel: channel === 'all' ? null : channel,
      rangePreset: rangePreset || null,
      trackingStartedAt: trackingStartedAt ? trackingStartedAt.toISOString() : null,
      rangeIncludesPreTrackingPeriod,
      preTrackingNote: preTracking.preTrackingNote,
      currency: 'GBP',
      revenueStatusFilter: REVENUE_STATUSES,
      revenueMetricsNote:
        'Revenue metrics only include Pending, Approved, Shipped, and Delivered orders.',
      conversionRateDenominator,
      trafficKpiDenominator,
      dataAvailability: {
        attribution: attributionAvailability,
        visitors: uniqueVisitorsInRange > 0 ? 'available' : UNAVAILABLE,
        sessions: 'available',
        adSpend: advertisingPerformance.availability,
        profit: profitability.availability,
        email: UNAVAILABLE,
        influencer: UNAVAILABLE,
        abandonedCheckout: abandonedCheckout.availability,
        customerProfile: customerProfile.availability,
      },
    },
    dataQuality: {
      allOrdersInRange,
      ordersInRange: allOrdersInRange,
      revenueOrdersInRange,
      ordersWithMarketingAttribution,
      ordersWithoutMarketingAttribution,
      ordersWithUtmSource: dqRow.ordersWithUtmSource || 0,
      ordersWithGclid: dqRow.ordersWithGclid || 0,
      ordersWithFbclid: dqRow.ordersWithFbclid || 0,
      ordersWithReferrer: dqRow.ordersWithReferrer || 0,
      visitorSessionsInRange,
      uniqueVisitorsInRange,
      visitorSessionsAvailability: 'available',
      convertedVisitorsOutsideSessionPopulation:
        convertedPopulation.convertedVisitorsOutsideSessionPopulation,
      convertedSessionsOutsideSessionPopulation:
        convertedPopulation.convertedSessionsOutsideSessionPopulation,
      conversionPopulationMismatch: convertedPopulation.conversionPopulationMismatch,
    },
    kpis: {
      orders,
      revenue,
      aov,
      salesUnits,
      visitorSessionsInRange,
      uniqueVisitorsInRange,
      convertedVisitorsInRange,
      convertedSessionsInRange,
      ordersMissingVisitorSessionInRange,
      visitors: uniqueVisitorsInRange > 0 ? uniqueVisitorsInRange : null,
      visitorsAvailability: uniqueVisitorsInRange > 0 ? 'available' : UNAVAILABLE,
      conversionRate,
      conversionRateAvailability: conversionRate != null ? 'available' : UNAVAILABLE,
      grossMargin,
      grossMarginAvailability,
    },
    revenueBySource,
    revenueByMedium,
    revenueByCampaign,
    revenueByChannel,
    campaignPerformance: campaignPerformanceWithSpend,
    advertisingPerformance,
    campaignRoasRoi,
    campaignRoasCpa,
    dailyOrdersRevenue,
    ordersBySource: toDonutSegments(ordersBySourceRows),
    productRevenueSegments,
    topSellingProducts,
    topRevenueProducts,
    productPerformance,
    abandonedCheckout,
    customerProfile,
    profitability,
    profitBySource,
    profitByCampaign,
    fraudInsights,
    roasVsPoas,
    topLandingPages,
    visitorsByDevice,
    unsupportedSections: {
      advertisingPerformance:
        advertisingPerformance.availability === 'available' ? 'available' : UNAVAILABLE,
      campaignRoasRoi:
        campaignRoasRoi.some((row) => row.spendAvailability === 'available')
          ? 'available'
          : UNAVAILABLE,
      profitability: profitability.availability === 'available' ? 'available' : UNAVAILABLE,
      customerProfile:
        customerProfile.availability === 'available' ? 'available' : UNAVAILABLE,
      influencers: UNAVAILABLE,
      offlineOrders: UNAVAILABLE,
      emailAnalytics: UNAVAILABLE,
      abandonedCheckout:
        abandonedCheckout.availability === 'available' ? 'available' : UNAVAILABLE,
      topLandingPages: topLandingPages.availability,
    },
  };
}

module.exports = {
  getAnalyticsOverview,
};
