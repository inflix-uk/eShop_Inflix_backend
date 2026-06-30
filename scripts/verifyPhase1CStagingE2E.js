/**
 * Phase 1C production sign-off — revenue-counted orders + analytics overview.
 * Creates Pending orders (counted in analytics), verifies MongoDB + GET /analytics/overview.
 * Run: node scripts/verifyPhase1CStagingE2E.js
 */
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/order');
const { getUkCalendarDateString } = require('../src/utils/analyticsDateRange');

const PORT = Number(process.env.PORT) || 4000;
const ORDER_API = `http://127.0.0.1:${PORT}/create/order`;
const ANALYTICS_API = `http://127.0.0.1:${PORT}/analytics/overview`;
const RUN_ID = Date.now();
const TEST_USER_ID = '66c494329fb3cd6b6d9d7842';
const REVENUE_STATUS = 'Pending';

if (!process.env.MARKETING_ATTRIBUTION_HMAC_SECRET) {
  process.env.MARKETING_ATTRIBUTION_HMAC_SECRET =
    'phase1c-staging-e2e-hmac-secret-do-not-use-in-prod';
}

const results = [];
const created = {};

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function iso() {
  return new Date().toISOString();
}

function httpJson(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: {
          ...(data
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function postOrder(body) {
  return httpJson('POST', ORDER_API, body);
}

function getAnalytics(startDate, endDate, channel) {
  const q = new URLSearchParams({ startDate, endDate });
  if (channel) q.set('channel', channel);
  return httpJson('GET', `${ANALYTICS_API}?${q.toString()}`, null, {
    'x-user-role': 'admin',
  });
}

function basePayload(overrides = {}) {
  return {
    cart: [
      {
        _id: '66c494329fb3cd6b6d9d7843',
        name: 'E2E Test Product',
        productName: 'E2E Test Product',
        salePrice: 12.99,
        qty: 1,
      },
    ],
    shippingInformation: {
      firstName: 'E2E',
      lastName: 'Phase1C',
      address: '1 Test Street',
      city: 'London',
      county: 'Greater London',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
      phoneNumber: '07700900000',
      companyName: '',
    },
    status: REVENUE_STATUS,
    ...overrides,
  };
}

async function createScenario(key, emailSuffix, marketingAttribution) {
  const payload = basePayload({
    contactInformation: {
      email: `phase1c-e2e-${emailSuffix}-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
  });
  if (marketingAttribution !== undefined) {
    payload.marketingAttribution = marketingAttribution;
  }

  const res = await postOrder(payload);
  if (res.status !== 201 || !res.json.orderNumber) {
    fail(`${key} order created`, `status ${res.status}`);
    return null;
  }
  created[key] = res.json.orderNumber;
  pass(`${key} order created`, res.json.orderNumber);
  return res.json.orderNumber;
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const today = getUkCalendarDateString(new Date());

  // 1. Google CPC + consent
  await createScenario('google_cpc', 'google', {
    firstTouch: {
      source: 'google',
      medium: 'cpc',
      campaign: 'e2e-campaign',
      capturedAt: iso(),
    },
    lastTouch: { source: 'google', medium: 'cpc', capturedAt: iso() },
    orderTouch: { source: 'google', medium: 'cpc', capturedAt: iso() },
    clickIds: { gclid: `e2e-gclid-${RUN_ID}` },
    sessionId: `msess_e2e_${RUN_ID}`,
    visitorId: `mvis_e2e_${RUN_ID}`,
    consent: { analytics: true, marketing: true, capturedAt: iso() },
  });

  const docGoogle = await Order.findOne({ orderNumber: created.google_cpc }).lean();
  if (docGoogle?.marketingAttribution?.clickIds?.gclid === `e2e-gclid-${RUN_ID}`) {
    pass('MongoDB google gclid');
  } else fail('MongoDB google gclid');
  if (docGoogle?.marketingAttribution?.attributionStatus === 'available') {
    pass('MongoDB google attributionStatus');
  } else fail('MongoDB google attributionStatus', docGoogle?.marketingAttribution?.attributionStatus);

  // 2. Facebook fbclid + consent
  await createScenario('facebook', 'fb', {
    orderTouch: {
      landingPage: `https://example.com/?fbclid=e2e-fbclid-${RUN_ID}`,
      referrer: 'https://facebook.com/',
      referrerDomain: 'facebook.com',
      capturedAt: iso(),
    },
    clickIds: { fbclid: `e2e-fbclid-${RUN_ID}` },
    consent: { analytics: true, marketing: true, capturedAt: iso() },
  });

  const docFb = await Order.findOne({ orderNumber: created.facebook }).lean();
  if (docFb?.marketingAttribution?.clickIds?.fbclid === `e2e-fbclid-${RUN_ID}`) {
    pass('MongoDB facebook fbclid');
  } else fail('MongoDB facebook fbclid');
  if (docFb?.marketingAttribution?.normalized?.channel === 'paid_social') {
    pass('MongoDB facebook channel');
  } else fail('MongoDB facebook channel', docFb?.marketingAttribution?.normalized?.channel);

  // 3. Marketing denied with UTM + click ID in payload
  await createScenario('marketing_denied', 'denied', {
    orderTouch: { source: 'google', medium: 'cpc', capturedAt: iso() },
    clickIds: { gclid: 'must-not-store', fbclid: 'must-not-store' },
    consent: { analytics: false, marketing: false, capturedAt: iso() },
  });

  const docDenied = await Order.findOne({ orderNumber: created.marketing_denied }).lean();
  if (Object.keys(docDenied?.marketingAttribution?.clickIds || {}).length === 0) {
    pass('MongoDB marketing denied — no click IDs');
  } else fail('MongoDB marketing denied — click IDs present');

  // 4. No consent (ephemeral UTM only)
  await createScenario('no_consent', 'noconsent', {
    orderTouch: { source: 'google', medium: 'cpc', campaign: 'e2e', capturedAt: iso() },
    consent: { analytics: false, marketing: false, capturedAt: iso() },
  });

  const docNoConsent = await Order.findOne({ orderNumber: created.no_consent }).lean();
  if (!docNoConsent?.marketingAttribution?.visitorId) {
    pass('MongoDB no consent — no visitorId');
  } else fail('MongoDB no consent — visitorId present');

  // 5. Direct — no marketingAttribution field
  await createScenario('direct', 'direct', undefined);

  const docDirect = await Order.findOne({ orderNumber: created.direct }).lean();
  if (docDirect?.marketingAttribution?.attributionStatus === 'missing') {
    pass('MongoDB direct attributionStatus missing');
  } else fail('MongoDB direct attributionStatus', docDirect?.marketingAttribution?.attributionStatus);

  // 6. Normal checkout without attribution object (same as direct — explicit label)
  await createScenario('no_attribution', 'plain', undefined);

  // Analytics overview — official contract: startDate / endDate
  const analyticsRes = await getAnalytics(today, today);
  if (analyticsRes.status === 200 && analyticsRes.json.success) {
    pass('Analytics overview HTTP 200');
  } else {
    fail('Analytics overview HTTP', `status ${analyticsRes.status}`);
  }

  const meta = analyticsRes.json.meta || {};
  if (meta.startDateLocal === `${today} 00:00:00.000`) {
    pass('Analytics meta.startDateLocal matches request');
  } else {
    fail('Analytics meta.startDateLocal', meta.startDateLocal);
  }
  if (meta.endDateLocal === `${today} 23:59:59.999`) {
    pass('Analytics meta.endDateLocal matches request');
  } else {
    fail('Analytics meta.endDateLocal', meta.endDateLocal);
  }

  const wrongAlias = await getAnalytics('2026-01-01', '2026-01-31');
  if (wrongAlias.json.meta?.startDateLocal?.startsWith('2026-01-01')) {
    pass('Analytics startDate/endDate contract honored');
  } else {
    fail('Analytics startDate/endDate contract', wrongAlias.json.meta?.startDateLocal);
  }

  const wrongFromTo = await httpJson(
    'GET',
    `${ANALYTICS_API}?from=${today}&to=${today}`,
    null,
    { 'x-user-role': 'admin' }
  );
  if (!wrongFromTo.json.meta?.startDateLocal?.startsWith(today)) {
    pass('Analytics ignores from/to aliases');
  } else {
    fail('Analytics from/to aliases should not work', wrongFromTo.json.meta?.startDateLocal);
  }

  const kpis = analyticsRes.json.kpis || {};
  const dq = analyticsRes.json.dataQuality || {};
  const ordersToday = kpis.orders || 0;
  if (ordersToday >= 5) {
    pass('Analytics KPI orders includes revenue test orders', String(ordersToday));
  } else {
    fail('Analytics KPI orders count', `expected >=5 today, got ${ordersToday}`);
  }

  if ((dq.ordersWithGclid || 0) >= 1) {
    pass('Analytics dataQuality.ordersWithGclid');
  } else {
    fail('Analytics dataQuality.ordersWithGclid', String(dq.ordersWithGclid));
  }

  if ((dq.ordersWithFbclid || 0) >= 1) {
    pass('Analytics dataQuality.ordersWithFbclid');
  } else {
    fail('Analytics dataQuality.ordersWithFbclid', String(dq.ordersWithFbclid));
  }

  if (typeof dq.visitorSessionsInRange === 'number') {
    pass('Analytics dataQuality.visitorSessionsInRange present', String(dq.visitorSessionsInRange));
  } else {
    fail('Analytics dataQuality.visitorSessionsInRange', String(dq.visitorSessionsInRange));
  }

  const paidSearch = await getAnalytics(today, today, 'paid_search');
  if (paidSearch.status === 200) {
    pass('Analytics channel=paid_search filter');
  } else {
    fail('Analytics channel filter', `status ${paidSearch.status}`);
  }

  console.log('\n--- Created order numbers ---');
  Object.entries(created).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`  analytics range: ${today} .. ${today}`);

  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
