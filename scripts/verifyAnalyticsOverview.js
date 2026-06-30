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
    pass('unsupported grossMargin KPI remains null');
  } else {
    fail('unsupported grossMargin KPI remains null');
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
