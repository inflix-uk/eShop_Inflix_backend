const Order = require('../../models/order');
const MarketingAdSpend = require('../../models/marketingAdSpend');
const MarketingVisitorSession = require('../../models/marketingVisitorSession');
const CampaignEvent = require('../../models/campaignEvent');
const { resolveAnalyticsDateRange } = require('../../utils/analyticsDateRange');
const {
  resolvePlatformExpression,
  resolveCampaignExpression,
  resolvePlatformInJs,
  resolveCampaignInJs,
  isOrganicOrDirectPlatform,
  buildSpendJoinKey,
} = require('./attributionPlatform');

function round2(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function computeRoas(revenue, spend) {
  if (!spend || spend <= 0) return null;
  return round2(revenue / spend);
}

function computeCpa(spend, orders) {
  if (!orders || orders <= 0) return null;
  return round2(spend / orders);
}

function computeConversionRate(conversions, denominator) {
  if (!denominator || denominator <= 0) return null;
  return round2((conversions / denominator) * 100);
}

/**
 * Guide §3.4 order match:
 * isdeleted ≠ true, status ∉ Failed/deleted, createdAt in range.
 */
function buildAdPerformanceOrderMatch(startDate, endDate) {
  return {
    isdeleted: { $ne: true },
    status: { $nin: ['Failed', 'deleted'] },
    createdAt: { $gte: startDate, $lte: endDate },
  };
}

function hasConsentedTracking(order) {
  const consent = order?.marketingAttribution?.consent;
  return Boolean(consent?.analytics || consent?.marketing);
}

function hasMeaningfulAttribution(order) {
  const attr = order?.marketingAttribution;
  if (!attr || typeof attr !== 'object') return false;
  if (attr.attributionStatus === 'missing' || attr.attributionStatus === 'consent_denied') {
    return false;
  }
  const platform = resolvePlatformInJs(order);
  if (platform === 'Direct') {
    const clickIds = attr.clickIds || {};
    const hasClick = Object.values(clickIds).some((v) => v);
    const hasUtm = Boolean(
      attr.normalized?.source ||
        attr.normalized?.medium ||
        attr.normalized?.campaign ||
        attr.orderTouch?.source ||
        attr.lastTouch?.source
    );
    return hasClick || hasUtm;
  }
  return true;
}

function summarizeOrdersForAdReport(orders) {
  let totalOrders = 0;
  let totalRevenue = 0;
  let consentedRevenue = 0;
  let unattributedRevenue = 0;
  let googleRevenue = 0;
  let metaRevenue = 0;
  let tiktokRevenue = 0;
  let organicDirectRevenue = 0;

  for (const order of orders) {
    const revenue = round2(order.totalOrderValue || 0);
    totalOrders += 1;
    totalRevenue = round2(totalRevenue + revenue);

    if (hasConsentedTracking(order)) {
      consentedRevenue = round2(consentedRevenue + revenue);
    }

    if (!hasMeaningfulAttribution(order)) {
      unattributedRevenue = round2(unattributedRevenue + revenue);
    }

    const platform = resolvePlatformInJs(order);
    if (platform === 'Google Ads') {
      googleRevenue = round2(googleRevenue + revenue);
    } else if (platform === 'Meta Ads') {
      metaRevenue = round2(metaRevenue + revenue);
    } else if (platform === 'TikTok Ads') {
      tiktokRevenue = round2(tiktokRevenue + revenue);
    } else if (isOrganicOrDirectPlatform(platform)) {
      organicDirectRevenue = round2(organicDirectRevenue + revenue);
    }
  }

  return {
    totalOrders,
    totalRevenue,
    consentedRevenue,
    unattributedRevenue,
    googleRevenue,
    metaRevenue,
    tiktokRevenue,
    organicDirectRevenue,
    averageOrderValue: totalOrders > 0 ? round2(totalRevenue / totalOrders) : 0,
  };
}

/**
 * Spend by source+campaign. Current spend model is google_ads-only;
 * join key uses display source "Google Ads".
 */
async function aggregateSpendRowsForAdReport(startDate, endDate) {
  const rows = await MarketingAdSpend.aggregate([
    {
      $match: {
        spendDate: { $gte: startDate, $lte: endDate },
        amount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: {
          platform: '$platform',
          campaign: '$campaign',
          currency: { $ifNull: ['$currency', 'GBP'] },
        },
        spend: { $sum: '$amount' },
      },
    },
  ]);

  const currencies = new Set();
  const spendByKey = new Map();
  let totalSpend = 0;
  let gbpSpend = 0;

  for (const row of rows) {
    const campaign = String(row._id?.campaign || '').trim();
    if (!campaign) continue;

    const platformRaw = String(row._id?.platform || 'google_ads');
    const source =
      platformRaw === 'google_ads' || platformRaw === 'google'
        ? 'Google Ads'
        : platformRaw;

    const currency = String(row._id?.currency || 'GBP').toUpperCase();
    currencies.add(currency);

    const spend = round2(row.spend || 0);
    totalSpend = round2(totalSpend + spend);
    if (currency === 'GBP') {
      gbpSpend = round2(gbpSpend + spend);
    }

    const key = buildSpendJoinKey(source, campaign);
    const existing = spendByKey.get(key) || { source, campaign, spend: 0 };
    existing.spend = round2(existing.spend + spend);
    spendByKey.set(key, existing);
  }

  return {
    spendByKey,
    totalSpend,
    gbpSpend,
    currencyWarning: currencies.size > 1,
  };
}

async function aggregateCampaignRowsFromOrders(orderMatch) {
  const platformExpr = resolvePlatformExpression();
  const campaignExpr = resolveCampaignExpression();

  return Order.aggregate([
    { $match: orderMatch },
    {
      $addFields: {
        resolvedPlatform: platformExpr,
        resolvedCampaign: campaignExpr,
        orderRevenue: { $ifNull: ['$totalOrderValue', 0] },
        isConsented: {
          $or: [
            { $eq: ['$marketingAttribution.consent.analytics', true] },
            { $eq: ['$marketingAttribution.consent.marketing', true] },
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          source: '$resolvedPlatform',
          campaign: '$resolvedCampaign',
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$orderRevenue' },
        consentedOrders: {
          $sum: { $cond: ['$isConsented', 1, 0] },
        },
        consentedRevenue: {
          $sum: { $cond: ['$isConsented', '$orderRevenue', 0] },
        },
        firstOrderAt: { $min: '$createdAt' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);
}

/**
 * Guide §3.4: VisitorSession grouped by resolved platform + campaign.
 * Session.attribution is projected to marketingAttribution so platform
 * expressions (order-shaped) can be reused.
 */
async function aggregateSessionsByCampaign(startDate, endDate) {
  const match = {
    lastSeenAt: { $gte: startDate, $lte: endDate },
  };

  const platformExpr = resolvePlatformExpression();
  const campaignExpr = resolveCampaignExpression();

  const rows = await MarketingVisitorSession.aggregate([
    { $match: match },
    {
      $addFields: {
        marketingAttribution: { $ifNull: ['$attribution', {}] },
      },
    },
    {
      $addFields: {
        resolvedPlatform: platformExpr,
        resolvedCampaign: campaignExpr,
      },
    },
    {
      $group: {
        _id: {
          source: '$resolvedPlatform',
          campaign: '$resolvedCampaign',
        },
        sessions: { $sum: 1 },
        visitors: { $addToSet: '$visitorId' },
      },
    },
    {
      $project: {
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
      },
    },
  ]);

  const byKey = new Map();
  let totalSessions = 0;
  let totalUniqueVisitors = 0;
  const allVisitors = new Set();

  for (const row of rows) {
    const source = row._id?.source || 'Direct';
    const campaign = row._id?.campaign || '(unassigned)';
    const key = buildSpendJoinKey(source, campaign);
    const sessions = row.sessions || 0;
    const uniqueVisitors = row.uniqueVisitors || 0;
    totalSessions += sessions;
    byKey.set(key, { source, campaign, sessions, uniqueVisitors, clicks: 0 });
  }

  // Re-count unique visitors globally from grouped sets is lossy; keep sum of
  // per-bucket uniques as an upper bound for summary display only.
  for (const row of byKey.values()) {
    totalUniqueVisitors += row.uniqueVisitors;
  }
  void allVisitors;

  return {
    byKey,
    totals: {
      sessions: totalSessions,
      uniqueVisitors: totalUniqueVisitors,
    },
  };
}

/**
 * Guide §3.4 — CampaignEvent clicks grouped by resolved platform + campaign.
 * Project UTMs into marketingAttribution so platform expressions reuse order logic.
 */
async function aggregateClicksByCampaign(startDate, endDate) {
  const platformExpr = resolvePlatformExpression();
  const campaignExpr = resolveCampaignExpression();

  const rows = await CampaignEvent.aggregate([
    {
      $match: {
        type: 'click',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $addFields: {
        marketingAttribution: {
          normalized: {
            source: { $ifNull: ['$utmSource', ''] },
            medium: { $ifNull: ['$utmMedium', ''] },
            campaign: { $ifNull: ['$utmCampaign', ''] },
          },
          orderTouch: {
            source: { $ifNull: ['$utmSource', ''] },
            medium: { $ifNull: ['$utmMedium', ''] },
            campaign: { $ifNull: ['$utmCampaign', ''] },
          },
        },
      },
    },
    {
      $addFields: {
        resolvedPlatform: platformExpr,
        resolvedCampaign: campaignExpr,
      },
    },
    {
      $group: {
        _id: {
          source: '$resolvedPlatform',
          campaign: '$resolvedCampaign',
        },
        clicks: { $sum: 1 },
      },
    },
  ]);

  const byKey = new Map();
  let totalClicks = 0;

  for (const row of rows) {
    const source = row._id?.source || 'Direct';
    const campaign = row._id?.campaign || '(unassigned)';
    const key = buildSpendJoinKey(source, campaign);
    const clicks = row.clicks || 0;
    totalClicks += clicks;
    byKey.set(key, { source, campaign, clicks });
  }

  return { byKey, totals: { clicks: totalClicks } };
}

/** Merge CampaignEvent click counts into session buckets (conv. rate prefers clicks). */
function mergeClicksIntoSessions(sessionByCampaign, clicksByCampaign) {
  const byKey = new Map(sessionByCampaign?.byKey || []);
  const clickMap = clicksByCampaign?.byKey || new Map();

  for (const [key, clickRow] of clickMap.entries()) {
    const existing = byKey.get(key);
    if (existing) {
      existing.clicks = (existing.clicks || 0) + (clickRow.clicks || 0);
    } else {
      byKey.set(key, {
        source: clickRow.source,
        campaign: clickRow.campaign,
        sessions: 0,
        uniqueVisitors: 0,
        clicks: clickRow.clicks || 0,
      });
    }
  }

  return {
    byKey,
    totals: {
      sessions: sessionByCampaign?.totals?.sessions || 0,
      uniqueVisitors: sessionByCampaign?.totals?.uniqueVisitors || 0,
      clicks: clicksByCampaign?.totals?.clicks || 0,
    },
  };
}

function mergeCampaignRows(orderRows, spendByKey, sessionByCampaign) {
  const byKey = new Map();
  const sessionMap = sessionByCampaign?.byKey || new Map();

  for (const row of orderRows) {
    const source = row._id?.source || 'Direct';
    const campaign = row._id?.campaign || '(unassigned)';
    const key = buildSpendJoinKey(source, campaign);
    const spend = spendByKey.get(key)?.spend || 0;
    const orders = row.orders || 0;
    const revenue = round2(row.revenue || 0);
    const aov = orders > 0 ? round2(revenue / orders) : 0;
    const sessionRow = sessionMap.get(key);
    const clicks = sessionRow?.clicks || 0;
    const sessions = sessionRow?.sessions || 0;
    const uniqueVisitors = sessionRow?.uniqueVisitors || 0;

    // Prefer click conversion when clicks > 0, else sessions/visitors (guide §3.4).
    let conversionRate = null;
    if (clicks > 0) {
      conversionRate = computeConversionRate(orders, clicks);
    } else if (uniqueVisitors > 0) {
      conversionRate = computeConversionRate(orders, uniqueVisitors);
    } else if (sessions > 0) {
      conversionRate = computeConversionRate(orders, sessions);
    }

    byKey.set(key, {
      source,
      campaign,
      orders,
      revenue,
      spend,
      roas: computeRoas(revenue, spend),
      cpa: computeCpa(spend, orders),
      aov,
      conversionRate,
      sessions,
      uniqueVisitors,
      clicks,
      consentedRevenue: round2(row.consentedRevenue || 0),
      firstOrderAt: row.firstOrderAt || null,
      lastOrderAt: row.lastOrderAt || null,
    });
  }

  for (const [key, spendRow] of spendByKey.entries()) {
    if (byKey.has(key)) continue;
    const sessionRow = sessionMap.get(key);
    const clicks = sessionRow?.clicks || 0;
    byKey.set(key, {
      source: spendRow.source,
      campaign: spendRow.campaign,
      orders: 0,
      revenue: 0,
      spend: spendRow.spend,
      roas: null,
      cpa: null,
      aov: 0,
      conversionRate:
        clicks > 0 || sessionRow?.uniqueVisitors > 0 || sessionRow?.sessions > 0
          ? 0
          : null,
      sessions: sessionRow?.sessions || 0,
      uniqueVisitors: sessionRow?.uniqueVisitors || 0,
      clicks,
      consentedRevenue: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    });
  }

  // Session/click-only rows (visitors or clicks, no orders/spend yet)
  for (const [key, sessionRow] of sessionMap.entries()) {
    if (byKey.has(key)) continue;
    byKey.set(key, {
      source: sessionRow.source,
      campaign: sessionRow.campaign,
      orders: 0,
      revenue: 0,
      spend: 0,
      roas: null,
      cpa: null,
      aov: 0,
      conversionRate: 0,
      sessions: sessionRow.sessions || 0,
      uniqueVisitors: sessionRow.uniqueVisitors || 0,
      clicks: sessionRow.clicks || 0,
      consentedRevenue: 0,
      firstOrderAt: null,
      lastOrderAt: null,
    });
  }

  const campaigns = [...byKey.values()].sort(
    (a, b) => b.revenue - a.revenue || b.spend - a.spend
  );

  const revenueBySourceMap = new Map();
  for (const row of campaigns) {
    const existing = revenueBySourceMap.get(row.source) || {
      source: row.source,
      orders: 0,
      revenue: 0,
      spend: 0,
    };
    existing.orders += row.orders;
    existing.revenue = round2(existing.revenue + row.revenue);
    existing.spend = round2(existing.spend + row.spend);
    revenueBySourceMap.set(row.source, existing);
  }

  const revenueBySource = [...revenueBySourceMap.values()].sort(
    (a, b) => b.revenue - a.revenue || b.spend - a.spend
  );

  return { campaigns, revenueBySource };
}

/**
 * @param {{ from?: string, to?: string, startDate?: string, endDate?: string }} query
 */
async function getAdPerformanceReport(query = {}) {
  const range = resolveAnalyticsDateRange({
    startDate: query.from || query.startDate,
    endDate: query.to || query.endDate,
  });

  const { startDate, endDate } = range;
  const orderMatch = buildAdPerformanceOrderMatch(startDate, endDate);

  const [orderRows, summaryOrders, sessionByCampaign, clicksByCampaign, spendResult] =
    await Promise.all([
      aggregateCampaignRowsFromOrders(orderMatch),
      Order.find(orderMatch)
        .select('totalOrderValue marketingAttribution createdAt status')
        .lean(),
      aggregateSessionsByCampaign(startDate, endDate),
      aggregateClicksByCampaign(startDate, endDate),
      aggregateSpendRowsForAdReport(startDate, endDate),
    ]);

  const sessionsWithClicks = mergeClicksIntoSessions(sessionByCampaign, clicksByCampaign);

  const orderSummary = summarizeOrdersForAdReport(summaryOrders);
  const { campaigns, revenueBySource } = mergeCampaignRows(
    orderRows,
    spendResult.spendByKey,
    sessionsWithClicks
  );

  // ROAS uses GBP-only spend when multi-currency warning is set (guide §3.1).
  const spendForRoas = spendResult.currencyWarning
    ? spendResult.gbpSpend
    : spendResult.totalSpend;

  const summary = {
    ...orderSummary,
    totalSpend: spendResult.totalSpend,
    blendedRoas: computeRoas(orderSummary.totalRevenue, spendForRoas),
    blendedCpa: computeCpa(spendResult.totalSpend, orderSummary.totalOrders),
    currencyWarning: spendResult.currencyWarning,
    sessions: sessionsWithClicks.totals.sessions,
    uniqueVisitors: sessionsWithClicks.totals.uniqueVisitors,
    clicks: sessionsWithClicks.totals.clicks,
  };

  return {
    success: true,
    report: {
      summary,
      revenueBySource,
      campaigns,
      meta: {
        from: range.queryStartDate,
        to: range.queryEndDate,
        timezone: range.timezone,
        selectedRangeLabel: range.selectedRangeLabel,
      },
    },
  };
}

module.exports = {
  getAdPerformanceReport,
  buildAdPerformanceOrderMatch,
  summarizeOrdersForAdReport,
  resolvePlatformInJs,
  resolveCampaignInJs,
};
