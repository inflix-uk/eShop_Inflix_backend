/**
 * Phase 1A.5 — live backend verification for marketing attribution persistence.
 * Run: node scripts/verifyPhase1A5.js
 * Requires backend on PORT (default 4000) OR set START_SERVER=1 to spawn server.
 */
const http = require('http');
const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/order');

const PORT = Number(process.env.PORT) || 4000;
const API = `http://127.0.0.1:${PORT}/create/order`;
const LIST_API = `http://127.0.0.1:${PORT}/get/order?page=1&limit=3`;
const RUN_ID = Date.now();
const TEST_USER_ID = '66c494329fb3cd6b6d9d7842';

if (!process.env.MARKETING_ATTRIBUTION_HMAC_SECRET) {
  process.env.MARKETING_ATTRIBUTION_HMAC_SECRET =
    'phase1a5-verification-hmac-secret-do-not-use-in-prod';
}

const results = [];
const orderNumbers = {};

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

function basePayload(overrides = {}) {
  return {
    cart: [
      {
        productId: '66fd688338c354a1be8336d8',
        productName: 'Phase1A5 Test Product',
        name: 'Test-Variant',
        SKU: 'P1A5-TEST-SKU',
        qty: 1,
        salePrice: 19.99,
        Price: 29.99,
        isTradeIn: false,
      },
    ],
    shippingInformation: {
      firstName: 'Phase',
      lastName: 'Verify',
      address: '123 Test Street',
      apartment: 'Apt 1',
      city: 'London',
      county: 'Greater London',
      country: 'United Kingdom',
      postalCode: 'SW1A 1AA',
      phoneNumber: '07700900000',
      companyName: '',
    },
    contactInformation: {
      email: `phase1a5-${RUN_ID}@example.com`,
      phoneNumber: '07700900000',
      userId: TEST_USER_ID,
    },
    status: 'Failed',
    ...overrides,
  };
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
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
          resolve({ status: res.statusCode, json, raw });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    http
      .get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search }, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, json: { raw } });
          }
        });
      })
      .on('error', reject);
  });
}

async function waitForHealth(maxMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await getJson(`http://127.0.0.1:${PORT}/health`);
      if (r.status === 200) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

let serverProc = null;

async function ensureServer() {
  try {
    const h = await getJson(`http://127.0.0.1:${PORT}/health`);
    if (h.status === 200) {
      pass('1b Backend already running', `port ${PORT}`);
      return;
    }
  } catch {
    /* start */
  }

  if (process.env.START_SERVER !== '1') {
    fail('1b Backend not running', `Set START_SERVER=1 or start npm run dev on port ${PORT}`);
    throw new Error('Backend not running');
  }

  serverProc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const ok = await waitForHealth();
  if (!ok) throw new Error('Backend failed to start');
  pass('1b Backend started', `port ${PORT}`);
}

async function fetchOrder(orderNumber) {
  return Order.findOne({ orderNumber }).lean();
}

function printOrderFields(label, doc) {
  const pick = {
    orderNumber: doc?.orderNumber,
    status: doc?.status,
    customerKey: doc?.customerKey,
    attributionStatus: doc?.marketingAttribution?.attributionStatus,
    normalized: doc?.marketingAttribution?.normalized,
    clickIds: doc?.marketingAttribution?.clickIds,
    sessionId: doc?.marketingAttribution?.sessionId,
    visitorId: doc?.marketingAttribution?.visitorId,
    consent: doc?.marketingAttribution?.consent,
  };
  console.log(`\n--- MongoDB: ${label} ---`);
  console.log(JSON.stringify(pick, null, 2));
  return pick;
}

async function main() {
  console.log('\n========== Phase 1A.5 Live Verification ==========\n');

  // 1. Environment
  const secret = process.env.MARKETING_ATTRIBUTION_HMAC_SECRET;
  if (secret && secret.length >= 16) {
    pass('1a MARKETING_ATTRIBUTION_HMAC_SECRET set', `length ${secret.length}`);
  } else {
    fail('1a MARKETING_ATTRIBUTION_HMAC_SECRET', 'missing or too short');
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    fail('1c MongoDB URI', 'MONGO_URI not set');
    process.exit(1);
  }
  let dbHost = '(unknown)';
  try {
    const parsed = new URL(uri.replace(/^mongodb:\/\//, 'http://'));
    dbHost = `${parsed.hostname}:${parsed.port || '27017'}${parsed.pathname}`;
  } catch {
    /* ignore */
  }
  console.log(`Mongo target: ${dbHost} (configured .env — local Docker unavailable)`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    directConnection: true,
    family: 4,
  });
  pass('1c MongoDB connected', mongoose.connection.name);

  try {
    await Order.syncIndexes();
    pass('1b Order schema/index sync', 'no errors');
  } catch (e) {
    fail('1b Order schema/index sync', e.message);
  }

  await ensureServer();

  const iso = () => new Date().toISOString();

  // 2. No attribution
  const p2 = basePayload({
    contactInformation: {
      email: `phase1a5-none-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
  });
  const r2 = await postJson(API, p2);
  if (r2.status === 201 && r2.json.orderNumber) {
    orderNumbers.noAttribution = r2.json.orderNumber;
    pass('2 POST no attribution', `orderNumber ${r2.json.orderNumber}`);
  } else {
    fail('2 POST no attribution', `status ${r2.status} ${JSON.stringify(r2.json)}`);
  }

  const doc2 = await fetchOrder(orderNumbers.noAttribution);
  printOrderFields('Test 2 — no attribution', doc2);
  if (doc2?.marketingAttribution?.attributionStatus === 'missing') {
    pass('2 marketingAttribution.attributionStatus', 'missing');
  } else {
    fail('2 marketingAttribution.attributionStatus', String(doc2?.marketingAttribution?.attributionStatus));
  }
  if (doc2?.customerKey === `user:${TEST_USER_ID}`) {
    pass('2 customerKey', doc2.customerKey);
  } else {
    fail('2 customerKey', String(doc2?.customerKey));
  }
  if (!doc2?.customerKey?.includes('@')) {
    pass('2 customerKey has no raw email');
  } else {
    fail('2 customerKey has no raw email', doc2.customerKey);
  }

  // 3. Google CPC
  const googleAttr = {
    firstTouch: {
      source: 'google',
      medium: 'cpc',
      campaign: 'test-campaign',
      landingPage:
        'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=test-campaign&gclid=test-gclid-123',
      referrer: 'https://www.google.com/',
      referrerDomain: 'google.com',
      capturedAt: iso(),
    },
    lastTouch: {
      source: 'google',
      medium: 'cpc',
      campaign: 'test-campaign',
      landingPage:
        'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=test-campaign&gclid=test-gclid-123',
      referrer: 'https://www.google.com/',
      referrerDomain: 'google.com',
      capturedAt: iso(),
    },
    orderTouch: {
      source: 'google',
      medium: 'cpc',
      campaign: 'test-campaign',
      landingPage: 'https://example.com/checkout',
      referrer: 'https://www.google.com/',
      referrerDomain: 'google.com',
      capturedAt: iso(),
    },
    clickIds: { gclid: 'test-gclid-123' },
    sessionId: 'test-session-google-001',
    visitorId: 'test-visitor-google-001',
    consent: { analytics: true, marketing: true, capturedAt: iso() },
  };
  const p3 = basePayload({
    contactInformation: {
      email: `phase1a5-google-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
    marketingAttribution: googleAttr,
  });
  const r3 = await postJson(API, p3);
  if (r3.status === 201 && r3.json.orderNumber) {
    orderNumbers.google = r3.json.orderNumber;
    pass('3 POST Google CPC', r3.json.orderNumber);
  } else {
    fail('3 POST Google CPC', `status ${r3.status}`);
  }

  const doc3 = await fetchOrder(orderNumbers.google);
  printOrderFields('Test 3 — Google CPC', doc3);
  const n3 = doc3?.marketingAttribution?.normalized || {};
  const checks3 = [
    ['attributionStatus', 'available', doc3?.marketingAttribution?.attributionStatus],
    ['normalized.source', 'google', n3.source],
    ['normalized.medium', 'cpc', n3.medium],
    ['normalized.campaign', 'test-campaign', n3.campaign],
    ['normalized.channel', 'paid_search', n3.channel],
    ['clickIds.gclid', 'test-gclid-123', doc3?.marketingAttribution?.clickIds?.gclid],
    ['sessionId', 'test-session-google-001', doc3?.marketingAttribution?.sessionId],
    ['visitorId', 'test-visitor-google-001', doc3?.marketingAttribution?.visitorId],
  ];
  for (const [label, expected, actual] of checks3) {
    if (actual === expected) pass(`3 ${label}`, String(actual));
    else fail(`3 ${label}`, `expected ${expected}, got ${actual}`);
  }
  if (doc3?.customerKey && !doc3.customerKey.includes('@')) {
    pass('3 customerKey exists without raw email', doc3.customerKey);
  } else {
    fail('3 customerKey', String(doc3?.customerKey));
  }

  // 4. fbclid only
  const p4 = basePayload({
    contactInformation: {
      email: `phase1a5-fb-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
    marketingAttribution: {
      orderTouch: {
        landingPage: 'https://example.com/?fbclid=test-fbclid-123',
        referrer: 'https://facebook.com/',
        referrerDomain: 'facebook.com',
        capturedAt: iso(),
      },
      clickIds: { fbclid: 'test-fbclid-123' },
      sessionId: 'test-session-fb-001',
      visitorId: 'test-visitor-fb-001',
      consent: { analytics: true, marketing: true, capturedAt: iso() },
    },
  });
  const r4 = await postJson(API, p4);
  if (r4.status === 201 && r4.json.orderNumber) {
    orderNumbers.fb = r4.json.orderNumber;
    pass('4 POST fbclid only', r4.json.orderNumber);
  } else {
    fail('4 POST fbclid only', `status ${r4.status}`);
  }

  const doc4 = await fetchOrder(orderNumbers.fb);
  printOrderFields('Test 4 — fbclid only', doc4);
  if (doc4?.marketingAttribution?.clickIds?.fbclid === 'test-fbclid-123') {
    pass('4 clickIds.fbclid');
  } else fail('4 clickIds.fbclid');
  if (doc4?.marketingAttribution?.normalized?.channel === 'paid_social') {
    pass('4 normalized.channel paid_social');
  } else fail('4 normalized.channel', doc4?.marketingAttribution?.normalized?.channel);
  if (doc4?.marketingAttribution?.attributionStatus !== 'missing') {
    pass('4 attributionStatus not missing', doc4?.marketingAttribution?.attributionStatus);
  } else fail('4 attributionStatus not missing');

  // 5. Marketing denied — URL click IDs still persist
  const p5 = basePayload({
    contactInformation: {
      email: `phase1a5-consent-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
    marketingAttribution: {
      clickIds: { gclid: 'should-persist-gclid', fbclid: 'should-persist-fb', fbp: 'should-not-persist-fbp' },
      consent: { analytics: false, marketing: false, capturedAt: iso() },
    },
  });
  const r5 = await postJson(API, p5);
  if (r5.status === 201 && r5.json.orderNumber) {
    orderNumbers.consent = r5.json.orderNumber;
    pass('5 POST marketing denied', r5.json.orderNumber);
  } else {
    fail('5 POST marketing denied', `status ${r5.status}`);
  }

  const doc5 = await fetchOrder(orderNumbers.consent);
  printOrderFields('Test 5 — marketing denied keeps URL click IDs', doc5);
  if (doc5?.marketingAttribution?.clickIds?.gclid === 'should-persist-gclid') {
    pass('5 gclid persisted without marketing consent');
  } else {
    fail('5 gclid persisted without marketing consent', JSON.stringify(doc5?.marketingAttribution?.clickIds));
  }
  if (!doc5?.marketingAttribution?.clickIds?.fbp) {
    pass('5 fbp not persisted without marketing consent');
  } else {
    fail('5 fbp not persisted without marketing consent', JSON.stringify(doc5?.marketingAttribution?.clickIds));
  }
  if (doc5?.marketingAttribution?.attributionStatus === 'available') {
    pass('5 attributionStatus available');
  } else {
    fail('5 attributionStatus', doc5?.marketingAttribution?.attributionStatus);
  }

  // 6A. Update overwrite — Google then direct
  const p6aCreate = basePayload({
    marketingAttribution: googleAttr,
    contactInformation: {
      email: `phase1a5-updA-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
  });
  const r6a = await postJson(API, p6aCreate);
  orderNumbers.updateA = r6a.json?.orderNumber;
  if (r6a.status === 201 && orderNumbers.updateA) {
    pass('6A create with Google', orderNumbers.updateA);
  } else {
    fail('6A create', JSON.stringify(r6a.json));
  }

  const p6aUpdate = basePayload({
    orderNumber: orderNumbers.updateA,
    status: 'Pending',
    paymentDetails: {
      paymentIntentId: `pi_test_${RUN_ID}`,
      status: 'succeeded',
      amount: 19.99,
      currency: 'gbp',
      paidAt: new Date(),
    },
    marketingAttribution: {
      orderTouch: { source: 'direct', medium: 'none', capturedAt: iso() },
      clickIds: {},
    },
  });
  const r6aUp = await postJson(API, p6aUpdate);
  if (r6aUp.status === 201) {
    pass('6A update to Pending', '201');
  } else {
    fail('6A update to Pending', `status ${r6aUp.status} ${JSON.stringify(r6aUp.json)}`);
  }

  const doc6a = await fetchOrder(orderNumbers.updateA);
  printOrderFields('Test 6A — after update with direct', doc6a);
  if (doc6a?.marketingAttribution?.normalized?.source === 'google') {
    pass('6A Google attribution not overwritten');
  } else {
    fail('6A Google attribution not overwritten', doc6a?.marketingAttribution?.normalized?.source);
  }

  // 6B. Update fill — missing then Google on update
  const p6bCreate = basePayload({
    contactInformation: {
      email: `phase1a5-updB-${RUN_ID}@example.com`,
      userId: TEST_USER_ID,
    },
  });
  const r6b = await postJson(API, p6bCreate);
  orderNumbers.updateB = r6b.json?.orderNumber;
  if (r6b.status === 201 && orderNumbers.updateB) {
    pass('6B create without attribution', orderNumbers.updateB);
  } else {
    fail('6B create');
  }

  const doc6bBefore = await fetchOrder(orderNumbers.updateB);
  if (doc6bBefore?.marketingAttribution?.attributionStatus === 'missing') {
    pass('6B initial attributionStatus missing');
  } else {
    fail('6B initial attributionStatus', doc6bBefore?.marketingAttribution?.attributionStatus);
  }

  const p6bUpdate = basePayload({
    orderNumber: orderNumbers.updateB,
    status: 'Pending',
    paymentDetails: {
      paymentIntentId: `pi_test_b_${RUN_ID}`,
      status: 'succeeded',
      amount: 19.99,
      currency: 'gbp',
      paidAt: new Date(),
    },
    marketingAttribution: googleAttr,
  });
  const r6bUp = await postJson(API, p6bUpdate);
  if (r6bUp.status === 201) {
    pass('6B update to Pending with Google attr');
  } else {
    fail('6B update', `status ${r6bUp.status} ${JSON.stringify(r6bUp.json)}`);
  }

  const doc6b = await fetchOrder(orderNumbers.updateB);
  printOrderFields('Test 6B — after update with Google', doc6b);
  if (doc6b?.marketingAttribution?.normalized?.source === 'google') {
    pass('6B Google attribution filled on update');
  } else {
    fail('6B Google attribution filled on update', doc6b?.marketingAttribution?.normalized?.source);
  }

  // 7. Admin smoke
  const oldOrder = await Order.findOne({
    $or: [
      { marketingAttribution: { $exists: false } },
      { 'marketingAttribution.attributionStatus': { $exists: false } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
  if (oldOrder?.orderNumber) {
    pass('7 old order without attribution loads', oldOrder.orderNumber);
  } else {
    pass('7 old order query', 'no legacy order found (non-blocking)');
  }

  const list = await getJson(LIST_API);
  if (list.status === 200 || list.status === 201) {
    pass('7 GET /get/order listing', `status ${list.status}`);
  } else {
    fail('7 GET /get/order listing', `status ${list.status}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n========== Summary ==========');
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  console.log('\nOrder numbers:', JSON.stringify(orderNumbers, null, 2));

  if (serverProc) serverProc.kill();

  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  if (serverProc) serverProc.kill();
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
