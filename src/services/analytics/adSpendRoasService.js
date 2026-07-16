const MarketingAdSpend = require('../../models/marketingAdSpend');
const { resolveAnalyticsDateRange } = require('../../utils/analyticsDateRange');

const UNAVAILABLE = 'unavailable';
const DEFAULT_PLATFORM = 'google_ads';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function normalizeCampaign(value) {
  if (value == null) return '';
  return String(value).trim();
}

function campaignKey(value) {
  return normalizeCampaign(value).toLowerCase();
}

function computeRoas(revenue, spend) {
  if (!spend || spend <= 0) return null;
  return round2(revenue / spend);
}

function computeRoiPercent(revenue, spend) {
  if (!spend || spend <= 0) return null;
  return round2(((revenue - spend) / spend) * 100);
}

function computeCac(spend, orders) {
  if (!orders || orders <= 0) return null;
  return round2(spend / orders);
}

async function aggregateSpendByCampaign(startDate, endDate, platform = DEFAULT_PLATFORM) {
  const rows = await MarketingAdSpend.aggregate([
    {
      $match: {
        platform,
        spendDate: { $gte: startDate, $lte: endDate },
        amount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$campaign',
        spend: { $sum: '$amount' },
        recordCount: { $sum: 1 },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const campaign = normalizeCampaign(row._id);
    if (!campaign) continue;
    const key = campaignKey(campaign);
    const existing = map.get(key);
    map.set(key, {
      campaign: existing?.campaign || campaign,
      spend: round2((existing?.spend || 0) + (row.spend || 0)),
      recordCount: (existing?.recordCount || 0) + (row.recordCount || 0),
    });
  }
  return map;
}

/**
 * Join Google Ads spend with attributed campaign revenue for ROAS / ROI.
 * Spend-only campaigns (no orders yet) are included — matches Campaign ROAS & CPA table.
 */
function buildCampaignRoasRows(revenueByCampaign, spendByCampaign) {
  const revenueMap = new Map();
  for (const row of revenueByCampaign || []) {
    const name = normalizeCampaign(row.campaign);
    if (!name) continue;
    const key = campaignKey(name);
    const existing = revenueMap.get(key);
    if (existing) {
      existing.revenue += Number(row.revenue) || 0;
      existing.orders += Number(row.orders) || 0;
    } else {
      revenueMap.set(key, {
        campaign: name,
        revenue: Number(row.revenue) || 0,
        orders: Number(row.orders) || 0,
      });
    }
  }

  const keys = new Set([...revenueMap.keys(), ...spendByCampaign.keys()]);
  const rows = [];

  for (const key of keys) {
    if (!key) continue;

    const revenueRow = revenueMap.get(key) || { campaign: null, revenue: 0, orders: 0 };
    const spendRow = spendByCampaign.get(key);
    const campaign = spendRow?.campaign || revenueRow.campaign;
    if (!campaign) continue;

    const spend = spendRow?.spend ?? 0;
    const revenue = round2(revenueRow.revenue || 0);
    const orders = revenueRow.orders || 0;
    const hasSpend = spend > 0;
    // Image parity: with spend and 0 orders, CPA shows £0.00 (not N/A).
    const cac = hasSpend ? (orders > 0 ? computeCac(spend, orders) : 0) : null;
    const roas = hasSpend ? computeRoas(revenue, spend) : null;

    rows.push({
      source: 'Google Ads',
      name: campaign,
      orders,
      revenue,
      aov: orders > 0 ? round2(revenue / orders) : 0,
      spend: hasSpend ? spend : null,
      roas,
      roi: hasSpend ? computeRoiPercent(revenue, spend) : null,
      cac,
      spendAvailability: hasSpend ? 'available' : UNAVAILABLE,
      roasAvailability: hasSpend ? 'available' : UNAVAILABLE,
      roiAvailability: hasSpend ? 'available' : UNAVAILABLE,
      cacAvailability: hasSpend ? 'available' : UNAVAILABLE,
    });
  }

  return rows.sort(
    (a, b) =>
      (b.spend || 0) - (a.spend || 0) ||
      b.revenue - a.revenue ||
      String(a.name).localeCompare(String(b.name))
  );
}

async function getAdvertisingPerformance(startDate, endDate, platform = DEFAULT_PLATFORM) {
  const [summary] = await MarketingAdSpend.aggregate([
    {
      $match: {
        platform,
        spendDate: { $gte: startDate, $lte: endDate },
        amount: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: '$amount' },
        recordCount: { $sum: 1 },
        campaigns: { $addToSet: '$campaign' },
      },
    },
  ]);

  const totalSpend = round2(summary?.totalSpend || 0);
  const spendRecordCount = summary?.recordCount || 0;
  const campaignCount = (summary?.campaigns || []).filter(Boolean).length;

  return {
    platform,
    totalSpend,
    spendRecordCount,
    campaignCount,
    availability: totalSpend > 0 ? 'available' : UNAVAILABLE,
  };
}

async function getAdSpendRoasMetrics(startDate, endDate, revenueByCampaign) {
  const spendByCampaign = await aggregateSpendByCampaign(startDate, endDate);
  const campaignRoasRoi = buildCampaignRoasRows(revenueByCampaign, spendByCampaign);
  const advertisingPerformance = await getAdvertisingPerformance(startDate, endDate);

  const campaignsWithSpend = campaignRoasRoi.filter((row) => row.spend != null && row.spend > 0);
  const attributedRevenue = round2(
    campaignsWithSpend.reduce((sum, row) => sum + (row.revenue || 0), 0)
  );
  const attributedOrders = campaignsWithSpend.reduce((sum, row) => sum + (row.orders || 0), 0);
  const blendedRoas = computeRoas(attributedRevenue, advertisingPerformance.totalSpend);
  const blendedRoi = computeRoiPercent(attributedRevenue, advertisingPerformance.totalSpend);
  const blendedCac = computeCac(advertisingPerformance.totalSpend, attributedOrders);

  /** Rows for Overview "Campaign ROAS & CPA" — spend campaigns only. */
  const campaignRoasCpa = campaignsWithSpend.map((row) => ({
    source: row.source || 'Google Ads',
    campaign: row.name,
    name: row.name,
    spend: row.spend,
    revenue: row.revenue,
    orders: row.orders,
    roas: row.roas ?? 0,
    cpa: row.cac ?? 0,
    cac: row.cac ?? 0,
    spendAvailability: 'available',
    roasAvailability: 'available',
    cacAvailability: 'available',
  }));

  return {
    advertisingPerformance: {
      ...advertisingPerformance,
      attributedRevenue,
      attributedOrders,
      blendedRoas,
      blendedRoi,
      blendedCac,
    },
    campaignRoasRoi,
    campaignRoasCpa,
    campaignPerformance: campaignRoasRoi,
  };
}

/**
 * Upsert a daily spend row (import script / admin API).
 */
async function upsertMarketingAdSpend({
  platform = DEFAULT_PLATFORM,
  campaign,
  spendDate,
  amount,
  currency = 'GBP',
  source = 'manual',
  externalCampaignId,
}) {
  const campaignName = normalizeCampaign(campaign);
  if (!campaignName) {
    return { ok: false, reason: 'campaign is required' };
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return { ok: false, reason: 'amount must be a non-negative number' };
  }

  let spendInstant;
  if (spendDate instanceof Date) {
    spendInstant = spendDate;
  } else {
    const resolved = resolveAnalyticsDateRange({
      startDate: String(spendDate).slice(0, 10),
      endDate: String(spendDate).slice(0, 10),
    });
    spendInstant = resolved.startDate;
  }

  if (!spendInstant || Number.isNaN(spendInstant.getTime())) {
    return { ok: false, reason: 'spendDate is invalid' };
  }

  const doc = await MarketingAdSpend.findOneAndUpdate(
    { platform, campaign: campaignName, spendDate: spendInstant },
    {
      $set: {
        amount: round2(parsedAmount),
        currency: currency || 'GBP',
        source: source || 'manual',
        externalCampaignId: externalCampaignId || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { ok: true, id: doc._id };
}

module.exports = {
  getAdSpendRoasMetrics,
  upsertMarketingAdSpend,
  aggregateSpendByCampaign,
  buildCampaignRoasRows,
  computeRoas,
  computeRoiPercent,
  computeCac,
  DEFAULT_PLATFORM,
};
