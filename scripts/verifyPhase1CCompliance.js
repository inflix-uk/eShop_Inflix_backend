/**
 * Phase 1C compliance verification — storefront payload shapes vs MongoDB persistence.
 * Simulates POST /create/order bodies the storefront would send per consent scenario.
 * Run: node scripts/verifyPhase1CCompliance.js
 */
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../src/models/order');

const PORT = Number(process.env.PORT) || 4000;
const API = `http://127.0.0.1:${PORT}/create/order`;
const RUN_ID = Date.now();
const TEST_USER_ID = '66c494329fb3cd6b6d9d7842';

if (!process.env.MARKETING_ATTRIBUTION_HMAC_SECRET) {
  process.env.MARKETING_ATTRIBUTION_HMAC_SECRET =
    'phase1c-compliance-hmac-secret-do-not-use-in-prod';
}

const results = [];
const orderNumbers = {};

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

function basePayload(overrides = {}) {
  return {
    cart: [
      {
        _id: '66c494329fb3cd6b6d9d7843',
        name: 'Test Product',
        productName: 'Test Product',
        salePrice: 12.99,
        qty: 1,
      },
    ],
    shippingInformation: {
      firstName: 'Phase',
      lastName: 'OneC',
      address: '1 Test Street',
      city: 'London',
      county: 'Greater London',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
      phoneNumber: '07700900000',
      companyName: '',
    },
    contactInformation: {
      email: `phase1c-${RUN_ID}@example.com`,
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
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchOrder(orderNumber) {
  return Order.findOne({ orderNumber }).lean();
}

const googleFull = {
  firstTouch: {
    source: 'google',
    medium: 'cpc',
    campaign: 'test-campaign',
    term: 'test-term',
    content: 'test-content',
    landingPage: 'https://example.com/?utm_source=google&gclid=test-gclid-123',
    referrer: 'https://www.google.com/',
    referrerDomain: 'google.com',
    capturedAt: iso(),
  },
  lastTouch: {
    source: 'google',
    medium: 'cpc',
    campaign: 'test-campaign',
    landingPage: 'https://example.com/?utm_source=google&gclid=test-gclid-123',
    capturedAt: iso(),
  },
  orderTouch: {
    source: 'google',
    medium: 'cpc',
    campaign: 'test-campaign',
    landingPage: 'https://example.com/checkout',
    capturedAt: iso(),
  },
  clickIds: { gclid: 'test-gclid-123' },
  sessionId: 'msess_test_google',
  visitorId: 'mvis_test_google',
  consent: { analytics: true, marketing: true, capturedAt: iso() },
};

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(uri);

  // 1. Google CPC + consent accepted
  const r1 = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-google-${RUN_ID}@example.com`, userId: TEST_USER_ID },
    marketingAttribution: googleFull,
  }));
  if (r1.status === 201 && r1.json.orderNumber) {
    orderNumbers.google = r1.json.orderNumber;
    pass('Google CPC order created', r1.json.orderNumber);
  } else {
    fail('Google CPC order created', `status ${r1.status}`);
  }

  const doc1 = await fetchOrder(orderNumbers.google);
  if (doc1?.marketingAttribution?.clickIds?.gclid === 'test-gclid-123') {
    pass('Google clickIds.gclid persisted');
  } else {
    fail('Google clickIds.gclid persisted');
  }
  if (doc1?.marketingAttribution?.normalized?.source === 'google') {
    pass('Google normalized.source');
  } else {
    fail('Google normalized.source', doc1?.marketingAttribution?.normalized?.source);
  }
  if (doc1?.marketingAttribution?.attributionStatus === 'available') {
    pass('Google attributionStatus available');
  } else {
    fail('Google attributionStatus', doc1?.marketingAttribution?.attributionStatus);
  }

  // 2. fbclid + marketing consent
  const r2 = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-fb-${RUN_ID}@example.com`, userId: TEST_USER_ID },
    marketingAttribution: {
      orderTouch: {
        landingPage: 'https://example.com/?fbclid=test-fbclid-123',
        referrer: 'https://facebook.com/',
        referrerDomain: 'facebook.com',
        capturedAt: iso(),
      },
      clickIds: { fbclid: 'test-fbclid-123' },
      consent: { analytics: true, marketing: true, capturedAt: iso() },
    },
  }));
  if (r2.status === 201 && r2.json.orderNumber) {
    orderNumbers.fb = r2.json.orderNumber;
    pass('Facebook order created', r2.json.orderNumber);
  } else {
    fail('Facebook order created');
  }

  const doc2 = await fetchOrder(orderNumbers.fb);
  if (doc2?.marketingAttribution?.clickIds?.fbclid === 'test-fbclid-123') {
    pass('Facebook clickIds.fbclid persisted');
  } else {
    fail('Facebook clickIds.fbclid persisted');
  }
  if (doc2?.marketingAttribution?.normalized?.channel === 'paid_social') {
    pass('Facebook channel paid_social');
  } else {
    fail('Facebook channel', doc2?.marketingAttribution?.normalized?.channel);
  }

  // 3. Marketing consent denied — URL click IDs still stored (not cookies)
  const r3 = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-denied-${RUN_ID}@example.com`, userId: TEST_USER_ID },
    marketingAttribution: {
      orderTouch: { source: 'google', medium: 'cpc', capturedAt: iso() },
      clickIds: { gclid: 'must-keep-gclid', fbclid: 'must-keep-fbclid', fbp: 'must-drop-fbp' },
      consent: { analytics: false, marketing: false, capturedAt: iso() },
    },
  }));
  if (r3.status === 201 && r3.json.orderNumber) {
    orderNumbers.denied = r3.json.orderNumber;
    pass('Consent denied order created', r3.json.orderNumber);
  } else {
    fail('Consent denied order created');
  }

  const doc3 = await fetchOrder(orderNumbers.denied);
  if (doc3?.marketingAttribution?.clickIds?.gclid === 'must-keep-gclid') {
    pass('Marketing denied — gclid stored');
  } else {
    fail('Marketing denied — gclid stored', JSON.stringify(doc3?.marketingAttribution?.clickIds));
  }
  if (!doc3?.marketingAttribution?.clickIds?.fbp) {
    pass('Marketing denied — fbp stripped');
  } else {
    fail('Marketing denied — fbp stripped', JSON.stringify(doc3?.marketingAttribution?.clickIds));
  }
  if (doc3?.marketingAttribution?.attributionStatus === 'available') {
    pass('Marketing denied — UTM+gclid attributionStatus available');
  } else {
    fail('Marketing denied — attributionStatus', doc3?.marketingAttribution?.attributionStatus);
  }

  // Click-IDs-only with marketing denied → still available (gclid_only path).
  const r3b = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-denied-clickonly-${RUN_ID}@example.com`, userId: TEST_USER_ID },
    marketingAttribution: {
      clickIds: { gclid: 'must-keep-gclid' },
      consent: { analytics: false, marketing: false, capturedAt: iso() },
    },
  }));
  if (r3b.status === 201 && r3b.json.orderNumber) {
    pass('Click-only denied order created', r3b.json.orderNumber);
  } else {
    fail('Click-only denied order created');
  }
  const doc3b = await fetchOrder(r3b.json.orderNumber);
  if (doc3b?.marketingAttribution?.clickIds?.gclid === 'must-keep-gclid' &&
      doc3b?.marketingAttribution?.attributionStatus === 'available') {
    pass('Marketing denied click-only — gclid kept, status available');
  } else {
    fail('Marketing denied click-only — attributionStatus', doc3b?.marketingAttribution?.attributionStatus);
  }

  // 4. No consent — consent-only + ephemeral UTM (storefront pre-consent shape)
  const r4 = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-noconsent-${RUN_ID}@example.com`, userId: TEST_USER_ID },
    marketingAttribution: {
      orderTouch: { source: 'google', medium: 'cpc', campaign: 'test', capturedAt: iso() },
      consent: { analytics: false, marketing: false, capturedAt: iso() },
    },
  }));
  if (r4.status === 201 && r4.json.orderNumber) {
    orderNumbers.noconsent = r4.json.orderNumber;
    pass('No-consent order created', r4.json.orderNumber);
  } else {
    fail('No-consent order created');
  }

  const doc4 = await fetchOrder(orderNumbers.noconsent);
  if (!doc4?.marketingAttribution?.clickIds?.gclid) {
    pass('No consent — no click IDs');
  } else {
    fail('No consent — click IDs present');
  }
  if (!doc4?.marketingAttribution?.visitorId) {
    pass('No consent — no visitorId');
  } else {
    fail('No consent — visitorId present', doc4?.marketingAttribution?.visitorId);
  }

  // 5. Direct / missing attribution
  const r5 = await postJson(API, basePayload({
    contactInformation: { email: `phase1c-direct-${RUN_ID}@example.com`, userId: TEST_USER_ID },
  }));
  if (r5.status === 201 && r5.json.orderNumber) {
    orderNumbers.direct = r5.json.orderNumber;
    pass('Direct order without marketingAttribution', r5.json.orderNumber);
  } else {
    fail('Direct order');
  }

  const doc5 = await fetchOrder(orderNumbers.direct);
  if (doc5?.marketingAttribution?.attributionStatus === 'missing') {
    pass('Direct — attributionStatus missing');
  } else {
    fail('Direct — attributionStatus', doc5?.marketingAttribution?.attributionStatus);
  }
  if (!doc5?.marketingAttribution?.normalized?.source) {
    pass('Direct — no invented source');
  } else {
    fail('Direct — invented source', doc5?.marketingAttribution?.normalized?.source);
  }

  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
