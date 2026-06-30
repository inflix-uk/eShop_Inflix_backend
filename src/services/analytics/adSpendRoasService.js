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
    map.set(campaign, {
      spend: round2(row.spend),
      recordCount: row.recordCount,
    });
  }
  return map;
}

/**
 * Join Google Ads spend with attributed campaign revenue for ROAS / ROI.
 */
function buildCampaignRoasRows(revenueByCampaign, spendByCampaign) {
  const campaignNames = new Set([
    ...(revenueByCampaign || []).map((row) => normalizeCampaign(row.campaign)),
    ...[...spendByCampaign.keys()],
  ]);

  const revenueMap = new Map(
    (revenueByCampaign || []).map((row) => [normalizeCampaign(row.campaign), row])
  );

  const rows = [];

  for (const campaign of campaignNames) {
    if (!campaign) continue;

    const revenueRow = revenueMap.get(campaign) || { revenue: 0, orders: 0 };
    const spendRow = spendByCampaign.get(campaign);
    const spend = spendRow?.spend ?? 0;
    const revenue = round2(revenueRow.revenue || 0);
    const orders = revenueRow.orders || 0;
    const hasSpend = spend > 0;

    rows.push({
      name: campaign,
      orders,
      revenue,
      aov: orders > 0 ? round2(revenue / orders) : 0,
      spend: hasSpend ? spend : null,
      roas: hasSpend ? computeRoas(revenue, spend) : null,
      roi: hasSpend ? computeRoiPercent(revenue, spend) : null,
      cac: hasSpend ? computeCac(spend, orders) : null,
      spendAvailability: hasSpend ? 'available' : UNAVAILABLE,
      roasAvailability: hasSpend ? 'available' : UNAVAILABLE,
      roiAvailability: hasSpend ? 'available' : UNAVAILABLE,
      cacAvailability: hasSpend && orders > 0 ? 'available' : UNAVAILABLE,
    });
  }

  return rows.sort((a, b) => (b.spend || 0) - (a.spend || 0) || b.revenue - a.revenue);
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
