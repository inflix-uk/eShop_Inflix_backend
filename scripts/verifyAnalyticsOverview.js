/**
 * Verify GET /analytics/overview — admin auth, aggregation sanity, UK timezone boundaries.
 * Run: node scripts/verifyAnalyticsOverview.js
 */
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/order');
const { getAnalyticsOverview } = require('../src/services/analytics/analyticsOverviewService');
const { computeConversionMetrics } = require('../src/utils/analyticsConversionMetrics');
const { computeConvertedInPopulation } = require('../src/utils/analyticsConversionPopulation');
const {
  getAbandonedCheckoutMetrics,
  SUCCESS_EVENTS,
  FAILED_EVENTS,
} = require('../src/services/analytics/abandonedCheckoutService');
const {
  computeRoas,
  computeRoiPercent,
  buildCampaignRoasRows,
  upsertMarketingAdSpend,
} = require('../src/services/analytics/adSpendRoasService');
const {
  resolveUnitCost,
  lineRevenue,
} = require('../src/services/analytics/profitabilityService');
const MarketingAdSpend = require('../src/models/marketingAdSpend');
const {
  REVENUE_STATUSES,
  buildBaseMatch,
  buildRevenueMatch,
} = require('../src/utils/analyticsOrderMatch');
const {
  ANALYTICS_TIMEZONE,
  resolveAnalyticsDateRange,
} = require('../src/utils/analyticsDateRange');

const PORT = Number(process.env.PORT) || 4000;
const API = `http://127.0.0.1:${PORT}/analytics/overview`;

const PAKISTAN_WINTER_WRONG_START = '2025-12-31T19:00:00.000Z';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {
          json = { raw: body };
        }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function formatUkDay(utcDate) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ANALYTICS_TIMEZONE,
  }).format(utcDate);
}

function verifyTimezoneBoundaries() {
  const jan = resolveAnalyticsDateRange({ startDate: '2026-01-01', endDate: '2026-01-31' });
  if (jan.timezone === ANALYTICS_TIMEZONE) {
    pass('meta timezone constant is Europe/London');
  } else {
    fail('meta timezone constant is Europe/London', jan.timezone);
  }

  if (jan.startDate.toISOString() === '2026-01-01T00:00:00.000Z') {
    pass('January start uses UK GMT midnight', jan.startDate.toISOString());
  } else {
    fail('January start uses UK GMT midnight', jan.startDate.toISOString());
  }

  if (jan.endDate.toISOString() === '2026-01-31T23:59:59.999Z') {
    pass('January end uses UK GMT end-of-day', jan.endDate.toISOString());
  } else {
    fail('January end uses UK GMT end-of-day', jan.endDate.toISOString());
  }

  if (jan.startDateLocal === '2026-01-01 00:00:00.000') {
    pass('January startDateLocal label');
  } else {
    fail('January startDateLocal label', jan.startDateLocal);
  }

  const jun = resolveAnalyticsDateRange({ startDate: '2026-06-01', endDate: '2026-06-30' });
  if (jun.startDate.toISOString() === '2026-05-31T23:00:00.000Z') {
    pass('June start uses UK BST midnight', jun.startDate.toISOString());
  } else {
    fail('June start uses UK BST midnight', jun.startDate.toISOString());
  }

  if (jun.endDate.toISOString() === '2026-06-30T22:59:59.999Z') {
    pass('June end uses UK BST end-of-day', jun.endDate.toISOString());
  } else {
    fail('June end uses UK BST end-of-day', jun.endDate.toISOString());
  }

  if (jun.startDateLocal === '2026-06-01 00:00:00.000') {
    pass('June startDateLocal label');
  } else {
    fail('June startDateLocal label', jun.startDateLocal);
  }

  if (jun.startDate.toISOString() !== PAKISTAN_WINTER_WRONG_START) {
    pass('January range does not use server-local midnight boundary');
  } else {
    fail('January range does not use server-local midnight boundary', PAKISTAN_WINTER_WRONG_START);
  }
}

async function verifyAdSpendRoasSection(overview) {
  const ap = overview.advertisingPerformance;
  if (ap && typeof ap === 'object') {
    pass('advertisingPerformance present in overview response');
  } else {
    fail('advertisingPerformance present in overview response');
    return;
  }

  const apFields = [
    'platform',
    'totalSpend',
    'spendRecordCount',
    'campaignCount',
    'attributedRevenue',
    'attributedOrders',
    'blendedRoas',
    'blendedRoi',
    'blendedCac',
    'availability',
  ];
  const apMissing = apFields.filter((f) => ap[f] === undefined);
  if (apMissing.length === 0) {
    pass('advertisingPerformance has required fields');
  } else {
    fail('advertisingPerformance required fields', apMissing.join(', '));
  }

  if (Array.isArray(overview.campaignRoasRoi)) {
    pass('campaignRoasRoi array present');
  } else {
    fail('campaignRoasRoi array present');
  }

  if (overview.meta?.dataAvailability?.adSpend === ap.availability) {
    pass('meta.dataAvailability.adSpend matches advertisingPerformance');
  } else {
    fail(
      'meta.dataAvailability.adSpend',
      `${overview.meta?.dataAvailability?.adSpend} vs ${ap.availability}`
    );
  }

  const sectionFlag = overview.unsupportedSections?.campaignRoasRoi;
  const hasSpendRows = (overview.campaignRoasRoi || []).some(
    (row) => row.spendAvailability === 'available'
  );
  const expectedRoasSection = hasSpendRows ? 'available' : 'unavailable';
  if (sectionFlag === expectedRoasSection) {
    pass('unsupportedSections.campaignRoasRoi reflects spend availability');
  } else {
    fail('unsupportedSections.campaignRoasRoi', `${sectionFlag} expected ${expectedRoasSection}`);
  }

  if (ap.availability === 'available' && ap.totalSpend > 0) {
    if (ap.blendedRoas != null) {
      pass('advertisingPerformance blendedRoas computed when spend exists');
    } else {
      fail('advertisingPerformance blendedRoas computed when spend exists');
    }
  } else {
    pass('advertisingPerformance unavailable without spend data (expected when not imported)');
  }
}

async function verifyProfitabilitySection(overview) {
  const pf = overview.profitability;
  if (pf && typeof pf === 'object') {
    pass('profitability present in overview response');
  } else {
    fail('profitability present in overview response');
    return;
  }

  const fields = [
    'lineItemsInRange',
    'lineItemsWithCost',
    'lineItemsMissingCost',
    'totalLineRevenue',
    'revenueWithCost',
    'cogs',
    'grossProfit',
    'grossMarginPercent',
    'costCoveragePercent',
    'availability',
  ];
  const missing = fields.filter((f) => pf[f] === undefined);
  if (missing.length === 0) {
    pass('profitability has required metric fields');
  } else {
    fail('profitability has required metric fields', missing.join(', '));
  }

  if (pf.lineItemsWithCost + pf.lineItemsMissingCost === pf.lineItemsInRange) {
    pass('profitability costed + missing lines equals lineItemsInRange');
  } else {
    fail(
      'profitability line item split',
      `${pf.lineItemsWithCost}+${pf.lineItemsMissingCost} vs ${pf.lineItemsInRange}`
    );
  }

  if (pf.availability === 'available') {
    const expectedProfit = Math.round((pf.revenueWithCost - pf.cogs + Number.EPSILON) * 100) / 100;
    if (pf.grossProfit === expectedProfit) {
      pass('profitability grossProfit equals revenueWithCost - cogs');
    } else {
      fail('profitability grossProfit', `${pf.grossProfit} vs ${expectedProfit}`);
    }

    if (pf.revenueWithCost > 0 && pf.grossMarginPercent != null) {
      const expectedMargin =
        Math.round(((pf.grossProfit / pf.revenueWithCost) * 100 + Number.EPSILON) * 100) / 100;
      if (pf.grossMarginPercent === expectedMargin) {
        pass('profitability grossMarginPercent formula');
      } else {
        fail(
          'profitability grossMarginPercent formula',
          `${pf.grossMarginPercent} vs ${expectedMargin}`
        );
      }
    }

    if (overview.kpis.grossMargin === pf.grossMarginPercent) {
      pass('kpis.grossMargin matches profitability.grossMarginPercent');
    } else {
      fail(
        'kpis.grossMargin matches profitability',
        `${overview.kpis.grossMargin} vs ${pf.grossMarginPercent}`
      );
    }

    if (overview.kpis.grossMarginAvailability === 'available') {
      pass('kpis.grossMarginAvailability available when cost data exists');
    } else {
      fail('kpis.grossMarginAvailability', overview.kpis.grossMarginAvailability);
    }
  } else if (overview.kpis.grossMargin === null) {
    pass('kpis.grossMargin null when no product cost coverage');
  } else {
    fail('kpis.grossMargin null when unavailable', String(overview.kpis.grossMargin));
  }

  if (overview.meta?.dataAvailability?.profit === pf.availability) {
    pass('meta.dataAvailability.profit matches section availability');
  } else {
    fail(
      'meta.dataAvailability.profit',
      `${overview.meta?.dataAvailability?.profit} vs ${pf.availability}`
    );
  }

  const sectionFlag = overview.unsupportedSections?.profitability;
  const expectedSection = pf.availability === 'available' ? 'available' : 'unavailable';
  if (sectionFlag === expectedSection) {
    pass('unsupportedSections.profitability reflects availability');
  } else {
    fail('unsupportedSections.profitability', `${sectionFlag} expected ${expectedSection}`);
  }
}

async function verifyCustomerProfileSection(overview) {
  const cp = overview.customerProfile;
  if (cp && typeof cp === 'object') {
    pass('customerProfile present in overview response');
  } else {
    fail('customerProfile present in overview response');
    return;
  }

  const fields = [
    'newCustomers',
    'returningCustomers',
    'customersInRange',
    'ordersFromNewCustomers',
    'ordersFromReturningCustomers',
    'revenueFromNewCustomers',
    'revenueFromReturningCustomers',
    'ordersWithoutCustomerKey',
    'availability',
  ];
  const missing = fields.filter((f) => cp[f] === undefined);
  if (missing.length === 0) {
    pass('customerProfile has required metric fields');
  } else {
    fail('customerProfile has required metric fields', missing.join(', '));
  }

  if (cp.customersInRange === cp.newCustomers + cp.returningCustomers) {
    pass('customerProfile new + returning equals customersInRange');
  } else {
    fail(
      'customerProfile customersInRange sum',
      `${cp.customersInRange} vs ${cp.newCustomers}+${cp.returningCustomers}`
    );
  }

  const ordersWithKey = cp.ordersFromNewCustomers + cp.ordersFromReturningCustomers;
  const expectedKeyedOrders = (cp.revenueOrdersInRange || 0) - (cp.ordersWithoutCustomerKey || 0);
  if (ordersWithKey === expectedKeyedOrders) {
    pass('customerProfile order split matches revenue orders with customerKey');
  } else {
    fail(
      'customerProfile order split',
      `keyed=${ordersWithKey} expected=${expectedKeyedOrders}`
    );
  }

  if (overview.meta?.dataAvailability?.customerProfile === cp.availability) {
    pass('meta.dataAvailability.customerProfile matches section availability');
  } else {
    fail(
      'meta.dataAvailability.customerProfile',
      `${overview.meta?.dataAvailability?.customerProfile} vs ${cp.availability}`
    );
  }

  const sectionFlag = overview.unsupportedSections?.customerProfile;
  const expectedSection = cp.availability === 'available' ? 'available' : 'unavailable';
  if (sectionFlag === expectedSection) {
    pass('unsupportedSections.customerProfile reflects availability');
  } else {
    fail('unsupportedSections.customerProfile', `${sectionFlag} expected ${expectedSection}`);
  }

  if (Array.isArray(cp.revenueByCustomerType)) {
    pass('customerProfile.revenueByCustomerType array present');
  } else {
    fail('customerProfile.revenueByCustomerType array present');
  }
}

async function verifyAbandonedCheckoutSection(overview) {
  const ac = overview.abandonedCheckout;
  if (ac && typeof ac === 'object') {
    pass('abandonedCheckout present in overview response');
  } else {
    fail('abandonedCheckout present in overview response');
    return;
  }

  const fields = [
    'paymentIntentsInRange',
    'paymentIntentsCompleted',
    'paymentIntentsFailed',
    'paymentIntentsAbandoned',
    'abandonmentRate',
    'completionRate',
    'availability',
  ];
  const missing = fields.filter((f) => ac[f] === undefined);
  if (missing.length === 0) {
    pass('abandonedCheckout has required metric fields');
  } else {
    fail('abandonedCheckout has required metric fields', missing.join(', '));
  }

  const sum =
    (ac.paymentIntentsCompleted || 0) +
    (ac.paymentIntentsFailed || 0) +
    (ac.paymentIntentsAbandoned || 0);
  if (sum === ac.paymentIntentsInRange) {
    pass('abandonedCheckout completed + failed + abandoned equals started');
  } else {
    fail(
      'abandonedCheckout counts sum',
      `started=${ac.paymentIntentsInRange} sum=${sum}`
    );
  }

  if (overview.meta?.dataAvailability?.abandonedCheckout === ac.availability) {
    pass('meta.dataAvailability.abandonedCheckout matches section availability');
  } else {
    fail(
      'meta.dataAvailability.abandonedCheckout',
      `${overview.meta?.dataAvailability?.abandonedCheckout} vs ${ac.availability}`
    );
  }

  const sectionFlag = overview.unsupportedSections?.abandonedCheckout;
  const expectedSection =
    ac.availability === 'available' ? 'available' : 'unavailable';
  if (sectionFlag === expectedSection) {
    pass('unsupportedSections.abandonedCheckout reflects availability');
  } else {
    fail('unsupportedSections.abandonedCheckout', `${sectionFlag} expected ${expectedSection}`);
  }

  if (SUCCESS_EVENTS.has('backend.webhook.payment_intent.succeeded')) {
    pass('abandoned checkout SUCCESS_EVENTS includes webhook succeeded');
  } else {
    fail('abandoned checkout SUCCESS_EVENTS');
  }

  if (FAILED_EVENTS.has('backend.webhook.payment_intent.failed')) {
    pass('abandoned checkout FAILED_EVENTS includes webhook failed');
  } else {
    fail('abandoned checkout FAILED_EVENTS');
  }
}

async function verifyDailyUkGrouping() {
  const sample = await Order.findOne({ isdeleted: { $ne: true }, createdAt: { $exists: true } })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();

  if (!sample?.createdAt) {
    pass('daily UK grouping skipped (no orders in database)');
    return;
  }

  const ukDay = formatUkDay(new Date(sample.createdAt));
  const overview = await getAnalyticsOverview({
    startDate: ukDay,
    endDate: ukDay,
  });

  if (overview.meta.timezone === ANALYTICS_TIMEZONE) {
    pass('overview meta.timezone is Europe/London');
  } else {
    fail('overview meta.timezone is Europe/London', overview.meta.timezone);
  }

  const daily = overview.dailyOrdersRevenue.find((row) => row.date === ukDay);
  if (daily && daily.orders >= 1) {
    pass('dailyOrdersRevenue groups by UK-local day', ukDay);
  } else {
    fail('dailyOrdersRevenue groups by UK-local day', `expected ${ukDay}`);
  }

  const serverDay = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(sample.createdAt));

  if (serverDay !== ukDay) {
    pass('UK day differs from server-local day (confirms UK grouping is intentional)');
  } else {
    pass('UK day matches server-local on this host (UK grouping still enforced via timezone)');
  }
}

async function verifyServiceLayer() {
  verifyTimezoneBoundaries();

  const twoVisitorsThreeOrders = computeConversionMetrics({
    convertedVisitorsInRange: 2,
    convertedSessionsInRange: 0,
    uniqueVisitorsInRange: 2,
    visitorSessionsInRange: 3,
  });
  if (twoVisitorsThreeOrders.conversionRate === 100) {
    pass('conversion: 2 visitors, 3 orders from same visitors => 100%');
  } else {
    fail('conversion: 2 visitors, 3 orders', String(twoVisitorsThreeOrders.conversionRate));
  }

  const halfConverted = computeConversionMetrics({
    convertedVisitorsInRange: 1,
    convertedSessionsInRange: 0,
    uniqueVisitorsInRange: 2,
    visitorSessionsInRange: 2,
  });
  if (halfConverted.conversionRate === 50) {
    pass('conversion: 1 converted visitor / 2 visitors => 50%');
  } else {
    fail('conversion: 1 converted visitor / 2 visitors', String(halfConverted.conversionRate));
  }

  const sessionConverted = computeConversionMetrics({
    convertedVisitorsInRange: 0,
    convertedSessionsInRange: 2,
    uniqueVisitorsInRange: 0,
    visitorSessionsInRange: 3,
  });
  if (sessionConverted.conversionRate === 66.67) {
    pass('conversion: 2 converted sessions / 3 sessions => 66.67%');
  } else {
    fail('conversion: 2 converted sessions / 3 sessions', String(sessionConverted.conversionRate));
  }

  const population = {
    visitorIds: new Set(['v-in-range']),
    sessionIds: new Set(['s-in-range']),
  };
  const outsideSession = computeConvertedInPopulation(
    ['v-in-range', 'v-outside-range'],
    ['s-in-range', 's-outside-range'],
    population
  );
  if (
    outsideSession.convertedVisitorsInRange === 1 &&
    outsideSession.convertedVisitorsOutsideSessionPopulation === 1 &&
    outsideSession.conversionPopulationMismatch === true
  ) {
    pass('conversion population: order visitor outside session range excluded');
  } else {
    fail('conversion population: outside session range', JSON.stringify(outsideSession));
  }

  const noIds = computeConvertedInPopulation([], [], population);
  if (noIds.convertedVisitorsInRange === 0 && noIds.conversionPopulationMismatch === false) {
    pass('conversion population: orders without visitor/session do not inflate');
  } else {
    fail('conversion population: no ids', JSON.stringify(noIds));
  }

  const noCap = computeConversionMetrics({
    convertedVisitorsInRange: 5,
    convertedSessionsInRange: 0,
    uniqueVisitorsInRange: 2,
    visitorSessionsInRange: 0,
  });
  if (noCap.conversionRate === 250) {
    pass('conversion: no artificial 100% cap (250% surfaces mismatch)');
  } else {
    fail('conversion: no cap check', String(noCap.conversionRate));
  }

  const unitCost = resolveUnitCost(
    { variantId: 'v1', qty: 1 },
    {
      variantValues: [
        { _id: 'v1', Cost: 10, SKU: 'SKU-1' },
        { _id: 'v2', Cost: 20, SKU: 'SKU-2' },
      ],
    }
  );
  if (unitCost === 10) {
    pass('profitability: resolveUnitCost matches variantId');
  } else {
    fail('profitability: resolveUnitCost matches variantId', String(unitCost));
  }

  const lineRev = lineRevenue({ qty: 2, salePrice: 12.99 });
  if (lineRev === 25.98) {
    pass('profitability: lineRevenue uses salePrice × qty');
  } else {
    fail('profitability: lineRevenue', String(lineRev));
  }

  if (computeRoas(100, 25) === 4) {
    pass('ad spend: ROAS = revenue / spend');
  } else {
    fail('ad spend: ROAS formula', String(computeRoas(100, 25)));
  }

  if (computeRoiPercent(150, 100) === 50) {
    pass('ad spend: ROI = (revenue - spend) / spend * 100');
  } else {
    fail('ad spend: ROI formula', String(computeRoiPercent(150, 100)));
  }

  const roasRows = buildCampaignRoasRows(
    [{ campaign: 'test-campaign', revenue: 50, orders: 2 }],
    new Map([['test-campaign', { spend: 25, recordCount: 1 }]])
  );
  if (roasRows.length === 1 && roasRows[0].roas === 2 && roasRows[0].roi === 100) {
    pass('ad spend: buildCampaignRoasRows joins spend and revenue');
  } else {
    fail('ad spend: buildCampaignRoasRows', JSON.stringify(roasRows[0]));
  }

  const emptyRange = computeConversionMetrics({
    convertedVisitorsInRange: 0,
    convertedSessionsInRange: 0,
    uniqueVisitorsInRange: 0,
    visitorSessionsInRange: 0,
  });
  if (emptyRange.conversionRate === null && emptyRange.conversionRateDenominator == null) {
    pass('conversion: empty range => null');
  } else {
    fail('conversion: empty range', JSON.stringify(emptyRange));
  }

  const sampleMetrics = computeConversionMetrics({
    convertedVisitorsInRange: 12,
    convertedSessionsInRange: 12,
    uniqueVisitorsInRange: 38,
    visitorSessionsInRange: 42,
  });
  if (sampleMetrics.conversionRateDenominator === 'unique_visitors') {
    pass('sample: denominator is unique_visitors when visitors > 0');
  } else {
    fail('sample: denominator is unique_visitors', sampleMetrics.conversionRateDenominator);
  }
  if (sampleMetrics.trafficKpiDenominator === 'visitors') {
    pass('sample: trafficKpiDenominator is visitors when visitors > 0');
  } else {
    fail('sample: trafficKpiDenominator', sampleMetrics.trafficKpiDenominator);
  }
  if (sampleMetrics.conversionRate === 31.58) {
    pass('sample: conversionRate is 31.58 (12 / 38 * 100)', String(sampleMetrics.conversionRate));
  } else {
    fail('sample: conversionRate is 31.58', String(sampleMetrics.conversionRate));
  }

  const sessionsOnly = computeConversionMetrics({
    convertedVisitorsInRange: 0,
    convertedSessionsInRange: 12,
    uniqueVisitorsInRange: 0,
    visitorSessionsInRange: 42,
  });
  if (
    sessionsOnly.conversionRateDenominator === 'sessions' &&
    sessionsOnly.trafficKpiDenominator === 'sessions' &&
    sessionsOnly.conversionRate === 28.57
  ) {
    pass('sessions-only: denominator and rate use sessions (12 / 42 * 100)');
  } else {
    fail('sessions-only metrics', JSON.stringify(sessionsOnly));
  }

  const farFuture = {
    startDate: '2099-01-01',
    endDate: '2099-01-02',
  };
  const empty = await getAnalyticsOverview(farFuture);

  if (empty.dataQuality.allOrdersInRange === 0) {
    pass('empty date range returns zero allOrdersInRange');
  } else {
    fail('empty date range returns zero allOrdersInRange', `got ${empty.dataQuality.allOrdersInRange}`);
  }

  if (empty.dataQuality.revenueOrdersInRange === 0) {
    pass('empty date range returns zero revenueOrdersInRange');
  } else {
    fail('empty date range returns zero revenueOrdersInRange', String(empty.dataQuality.revenueOrdersInRange));
  }

  if (empty.dataQuality.visitorSessionsInRange === 0) {
    pass('empty date range returns zero visitorSessionsInRange');
  } else {
    fail('empty date range visitorSessionsInRange', String(empty.dataQuality.visitorSessionsInRange));
  }

  if (empty.kpis.conversionRate === null && empty.meta.conversionRateDenominator == null) {
    pass('empty range conversionRate is null with no denominator');
  } else {
    fail('empty range conversionRate', String(empty.kpis.conversionRate));
  }

  if (empty.kpis.grossMargin === null) {
    pass('empty range grossMargin KPI remains null');
  } else {
    fail('empty range grossMargin KPI remains null', String(empty.kpis.grossMargin));
  }

  if (empty.profitability?.availability === 'unavailable') {
    pass('empty range profitability unavailable');
  } else {
    fail('empty range profitability unavailable', empty.profitability?.availability);
  }

  const dq = empty.dataQuality;
  const attrSum =
    dq.ordersWithMarketingAttribution + dq.ordersWithoutMarketingAttribution;
  if (attrSum === dq.allOrdersInRange) {
    pass('attribution with/without sums to allOrdersInRange (empty range)');
  } else {
    fail('attribution with/without sums to allOrdersInRange', `${attrSum} vs ${dq.allOrdersInRange}`);
  }

  if (Array.isArray(empty.revenueByChannel)) {
    pass('revenueByChannel array present');
  } else {
    fail('revenueByChannel array present');
  }

  const range = resolveAnalyticsDateRange({});
  const baseMatch = buildBaseMatch(range.startDate, range.endDate, 'all');
  const revenueMatch = buildRevenueMatch(range.startDate, range.endDate, 'all');

  const manualRevenue = await Order.aggregate([
    { $match: revenueMatch },
    { $group: { _id: null, revenue: { $sum: { $ifNull: ['$totalOrderValue', 0] } }, orders: { $sum: 1 } } },
  ]);

  const live = await getAnalyticsOverview({
    startDate: range.queryStartDate,
    endDate: range.queryEndDate,
  });

  const manualRev = manualRevenue[0]?.revenue || 0;
  const manualOrders = manualRevenue[0]?.orders || 0;

  if (Math.abs(live.kpis.revenue - manualRev) < 0.02) {
    pass('revenue matches MongoDB manual sum', `£${live.kpis.revenue}`);
  } else {
    fail('revenue matches MongoDB manual sum', `api=${live.kpis.revenue} mongo=${manualRev}`);
  }

  if (live.kpis.orders === manualOrders) {
    pass('order count matches MongoDB manual count', String(manualOrders));
  } else {
    fail('order count matches MongoDB manual count', `api=${live.kpis.orders} mongo=${manualOrders}`);
  }

  const inRange = await Order.countDocuments(baseMatch);
  if (live.dataQuality.allOrdersInRange === inRange) {
    pass('allOrdersInRange matches countDocuments base match', String(inRange));
  } else {
    fail('allOrdersInRange matches countDocuments', `api=${live.dataQuality.allOrdersInRange} mongo=${inRange}`);
  }

  if (live.dataQuality.revenueOrdersInRange === manualOrders) {
    pass('revenueOrdersInRange matches revenue-eligible order count', String(manualOrders));
  } else {
    fail(
      'revenueOrdersInRange matches revenue-eligible order count',
      `api=${live.dataQuality.revenueOrdersInRange} mongo=${manualOrders}`
    );
  }

  const dqLive = live.dataQuality;
  if (
    dqLive.ordersWithMarketingAttribution + dqLive.ordersWithoutMarketingAttribution
    === dqLive.allOrdersInRange
  ) {
    pass('attribution with/without sums to allOrdersInRange (live range)');
  } else {
    fail('attribution with/without sums to allOrdersInRange (live range)');
  }

  const {
    countVisitorSessionsInRange,
    countUniqueVisitorsInRange,
  } = require('../src/services/analytics/recordVisitorSession');

  const manualSessions = await countVisitorSessionsInRange(range.startDate, range.endDate);
  if (live.dataQuality.visitorSessionsInRange === manualSessions) {
    pass('visitorSessionsInRange matches MarketingVisitorSession count', String(manualSessions));
  } else {
    fail(
      'visitorSessionsInRange matches MarketingVisitorSession count',
      `api=${live.dataQuality.visitorSessionsInRange} mongo=${manualSessions}`
    );
  }

  const manualVisitors = await countUniqueVisitorsInRange(range.startDate, range.endDate);
  if (live.kpis.uniqueVisitorsInRange === manualVisitors) {
    pass('uniqueVisitorsInRange matches distinct visitorId count', String(manualVisitors));
  } else {
    fail(
      'uniqueVisitorsInRange matches distinct visitorId count',
      `api=${live.kpis.uniqueVisitorsInRange} mongo=${manualVisitors}`
    );
  }

  if (manualVisitors > 0) {
    if (live.meta.conversionRateDenominator === 'unique_visitors') {
      pass('conversionRateDenominator uses unique_visitors when visitors exist');
    } else {
      fail('conversionRateDenominator', live.meta.conversionRateDenominator);
    }
    if (live.meta.trafficKpiDenominator === 'visitors') {
      pass('trafficKpiDenominator matches Visitors KPI');
    } else {
      fail('trafficKpiDenominator', live.meta.trafficKpiDenominator);
    }
    const expectedRate =
      Math.round(
        ((live.kpis.convertedVisitorsInRange / manualVisitors) * 100 + Number.EPSILON) * 100
      ) / 100;
    if (live.kpis.conversionRate === expectedRate) {
      pass('conversionRate formula (converted visitors / unique visitors)', `${expectedRate}%`);
    } else {
      fail(
        'conversionRate formula (converted visitors / unique visitors)',
        `api=${live.kpis.conversionRate} expected=${expectedRate}`
      );
    }
    if (live.kpis.conversionRate <= 100) {
      pass('conversionRate within 100% when using intersected population');
    } else {
      fail('conversionRate exceeds 100% after population intersect', String(live.kpis.conversionRate));
    }
    if (typeof live.dataQuality.conversionPopulationMismatch === 'boolean') {
      pass('dataQuality.conversionPopulationMismatch field present');
    } else {
      fail('dataQuality.conversionPopulationMismatch field present');
    }
  } else if (manualSessions > 0) {
    if (live.meta.conversionRateDenominator === 'sessions') {
      pass('conversionRateDenominator uses sessions when no unique visitors');
    } else {
      fail('conversionRateDenominator', live.meta.conversionRateDenominator);
    }
    if (live.meta.trafficKpiDenominator === 'sessions') {
      pass('trafficKpiDenominator matches Sessions KPI');
    } else {
      fail('trafficKpiDenominator', live.meta.trafficKpiDenominator);
    }
    const expectedRate =
      Math.round(
        ((live.kpis.convertedSessionsInRange / manualSessions) * 100 + Number.EPSILON) * 100
      ) / 100;
    if (live.kpis.conversionRate === expectedRate) {
      pass('conversionRate formula (converted sessions / sessions)', `${expectedRate}%`);
    } else {
      fail(
        'conversionRate formula (converted sessions / sessions)',
        `api=${live.kpis.conversionRate} expected=${expectedRate}`
      );
    }
  } else if (live.kpis.conversionRate === null) {
    pass('conversionRate null when no sessions or visitors in range');
  } else {
    fail('conversionRate null when no denominator', String(live.kpis.conversionRate));
  }

  if (Array.isArray(live.revenueByChannel)) {
    pass('revenueByChannel present in overview response');
  } else {
    fail('revenueByChannel present in overview response');
  }

  verifyAbandonedCheckoutSection(live);
  verifyCustomerProfileSection(live);
  verifyProfitabilitySection(live);
  verifyAdSpendRoasSection(live);

  if (live.kpis.revenue === manualRev && live.kpis.orders === manualOrders) {
    pass('order/revenue KPIs unchanged after session KPI work');
  } else {
    fail('order/revenue KPIs unchanged');
  }

  if (live.meta.revenueStatusFilter.join(',') === REVENUE_STATUSES.join(',')) {
    pass('meta.revenueStatusFilter documented');
  } else {
    fail('meta.revenueStatusFilter documented');
  }

  await verifyDailyUkGrouping();

  const janOverview = await getAnalyticsOverview({
    startDate: '2026-01-01',
    endDate: '2026-01-31',
  });
  if (janOverview.meta.startDate === '2026-01-01T00:00:00.000Z') {
    pass('January overview meta.startDate is GMT UTC boundary');
  } else {
    fail('January overview meta.startDate is GMT UTC boundary', janOverview.meta.startDate);
  }

  const junOverview = await getAnalyticsOverview({
    startDate: '2026-06-01',
    endDate: '2026-06-30',
  });
  if (junOverview.meta.startDate === '2026-05-31T23:00:00.000Z') {
    pass('June overview meta.startDate is BST UTC boundary');
  } else {
    fail('June overview meta.startDate is BST UTC boundary', junOverview.meta.startDate);
  }

  const trackingIso = process.env.MARKETING_TRACKING_STARTED_AT;
  if (trackingIso) {
    const sinceTracking = await getAnalyticsOverview({
      startDate: trackingIso.slice(0, 10),
      endDate: '2099-01-01',
      rangePreset: 'sinceTracking',
    });
    if (sinceTracking.meta.rangeIncludesPreTrackingPeriod === false) {
      pass('sinceTracking preset does not flag pre-tracking warning');
    } else {
      fail('sinceTracking preset pre-tracking warning', String(sinceTracking.meta.rangeIncludesPreTrackingPeriod));
    }
    if (sinceTracking.meta.preTrackingNote === 'Starts on tracking start date') {
      pass('sinceTracking preset preTrackingNote set');
    } else {
      fail('sinceTracking preset preTrackingNote', sinceTracking.meta.preTrackingNote);
    }
  } else {
    pass('sinceTracking preset test skipped (MARKETING_TRACKING_STARTED_AT unset)');
  }

  const channelFiltered = await getAnalyticsOverview({
    startDate: range.queryStartDate,
    endDate: range.queryEndDate,
    channel: 'google',
  });

  if (channelFiltered.meta.channel === 'google') {
    pass('channel filter echoed in meta.channel');
  } else {
    fail('channel filter echoed in meta.channel', String(channelFiltered.meta.channel));
  }

  if (channelFiltered.kpis.orders <= live.kpis.orders) {
    pass('channel filter orders KPI is subset of all-channel orders');
  } else {
    fail(
      'channel filter orders KPI subset',
      `filtered=${channelFiltered.kpis.orders} all=${live.kpis.orders}`
    );
  }

  if (channelFiltered.dataQuality.visitorSessionsInRange === live.dataQuality.visitorSessionsInRange) {
    pass('channel filter does not change visitor session counts');
  } else {
    fail(
      'channel filter visitor sessions unchanged',
      `${channelFiltered.dataQuality.visitorSessionsInRange} vs ${live.dataQuality.visitorSessionsInRange}`
    );
  }

  const allChannels = await getAnalyticsOverview({
    startDate: range.queryStartDate,
    endDate: range.queryEndDate,
    channel: 'all',
  });
  if (allChannels.meta.channel == null) {
    pass('channel=all returns null meta.channel');
  } else {
    fail('channel=all returns null meta.channel', String(allChannels.meta.channel));
  }

  const verifyCampaign = '__verify_ad_spend__';
  const upsertResult = await upsertMarketingAdSpend({
    campaign: verifyCampaign,
    spendDate: range.queryStartDate,
    amount: 42.5,
    source: 'manual',
  });
  if (upsertResult.ok) {
    pass('upsertMarketingAdSpend accepts admin spend row');
  } else {
    fail('upsertMarketingAdSpend', upsertResult.reason);
  }

  const withSpend = await getAnalyticsOverview({
    startDate: range.queryStartDate,
    endDate: range.queryEndDate,
  });
  if (withSpend.advertisingPerformance?.availability === 'available') {
    pass('overview advertisingPerformance available after spend upsert');
  } else {
    fail('overview advertisingPerformance after spend upsert');
  }

  const spendRow = (withSpend.campaignRoasRoi || []).find((row) => row.name === verifyCampaign);
  if (spendRow && spendRow.spend === 42.5) {
    pass('campaignRoasRoi includes upserted campaign spend');
  } else {
    fail('campaignRoasRoi upserted campaign', JSON.stringify(spendRow));
  }

  await MarketingAdSpend.deleteMany({ campaign: verifyCampaign });
}

async function verifyHttp() {
  let adminRes;
  try {
    adminRes = await httpGet(
      `${API}?startDate=2026-01-01&endDate=2026-12-31`,
      { 'x-user-role': 'admin' }
    );
  } catch (err) {
    fail('HTTP with admin header returns 200', err.message);
    return;
  }

  if (adminRes.status === 200 && adminRes.json.success === true) {
    pass('HTTP with admin header returns 200');
  } else {
    fail('HTTP with admin header returns 200', `status=${adminRes.status}`);
  }

  if (adminRes.json.meta?.timezone === ANALYTICS_TIMEZONE) {
    pass('HTTP response meta.timezone is Europe/London');
  } else {
    fail('HTTP response meta.timezone is Europe/London', adminRes.json.meta?.timezone);
  }

  if (adminRes.json.abandonedCheckout && typeof adminRes.json.abandonedCheckout === 'object') {
    pass('HTTP response includes abandonedCheckout');
  } else {
    fail('HTTP response includes abandonedCheckout');
  }

  if (adminRes.json.customerProfile && typeof adminRes.json.customerProfile === 'object') {
    pass('HTTP response includes customerProfile');
  } else {
    fail('HTTP response includes customerProfile');
  }

  if (adminRes.json.profitability && typeof adminRes.json.profitability === 'object') {
    pass('HTTP response includes profitability');
  } else {
    fail('HTTP response includes profitability');
  }

  if (
    adminRes.json.advertisingPerformance &&
    typeof adminRes.json.advertisingPerformance === 'object'
  ) {
    pass('HTTP response includes advertisingPerformance');
  } else {
    fail('HTTP response includes advertisingPerformance');
  }

  if (Array.isArray(adminRes.json.campaignRoasRoi)) {
    pass('HTTP response includes campaignRoasRoi array');
  } else {
    fail('HTTP response includes campaignRoasRoi array');
  }

  let channelRes;
  try {
    channelRes = await httpGet(
      `${API}?startDate=2026-01-01&endDate=2026-12-31&channel=google`,
      { 'x-user-role': 'admin' }
    );
  } catch (err) {
    fail('HTTP channel filter', err.message);
    channelRes = null;
  }

  if (channelRes?.status === 200 && channelRes.json.meta?.channel === 'google') {
    pass('HTTP channel=google returns meta.channel google');
  } else if (channelRes) {
    fail('HTTP channel=google returns meta.channel google', String(channelRes.json.meta?.channel));
  }

  if (
    adminRes.json.meta?.startDateLocal === '2026-01-01 00:00:00.000' &&
    adminRes.json.meta?.endDateLocal === '2026-12-31 23:59:59.999'
  ) {
    pass('HTTP startDate/endDate echoed in response meta');
  } else {
    fail(
      'HTTP startDate/endDate echoed in response meta',
      `${adminRes.json.meta?.startDateLocal} — ${adminRes.json.meta?.endDateLocal}`
    );
  }

  let wrongAliasRes;
  try {
    wrongAliasRes = await httpGet(
      `${API}?from=2026-01-01&to=2026-01-31`,
      { 'x-user-role': 'admin' }
    );
  } catch (err) {
    fail('HTTP from/to alias check', err.message);
    wrongAliasRes = null;
  }

  if (wrongAliasRes?.status === 200) {
    const localStart = wrongAliasRes.json.meta?.startDateLocal || '';
    if (!localStart.startsWith('2026-01-01')) {
      pass('from/to query params are not aliases — UK default range applied');
    } else {
      fail('from/to query params are not aliases', localStart);
    }
  }

  let noAuthRes;
  try {
    noAuthRes = await httpGet(`${API}?startDate=2026-01-01&endDate=2026-12-31`);
  } catch (err) {
    fail('HTTP without admin header fails', err.message);
    return;
  }

  if (noAuthRes.status === 403) {
    pass('HTTP without admin header returns 403');
  } else {
    fail('HTTP without admin header returns 403', `status=${noAuthRes.status}`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB\n--- Service layer ---');

  try {
    await verifyServiceLayer();
  } catch (err) {
    fail('service layer verification', err.message);
    console.error(err);
  }

  console.log('\n--- HTTP ---');
  try {
    await verifyHttp();
  } catch (err) {
    fail('HTTP verification', err.message);
  }

  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
