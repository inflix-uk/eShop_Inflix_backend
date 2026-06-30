/**
 * Unit verification for marketingAttribution normalization fallbacks.
 * Run: node scripts/verifyMarketingAttributionNormalize.js
 */
const {
  normalizeMarketingAttribution,
  shouldApplyMarketingAttribution,
} = require('../src/utils/marketingAttribution');

let passed = 0;
let failed = 0;

function pass(label) {
  passed += 1;
  console.log(`✅ ${label}`);
}

function fail(label, detail) {
  failed += 1;
  console.error(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) pass(label);
  else fail(label, `expected ${e}, got ${a}`);
}

function assertMatch(label, actual, expectedPartial) {
  for (const [key, value] of Object.entries(expectedPartial)) {
    if (actual?.[key] !== value) {
      fail(label, `${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actual?.[key])}`);
      return;
    }
  }
  pass(label);
}

const iso = () => new Date().toISOString();

// 1. E2E-style: orderTouch landing only, lastTouch/firstTouch have UTMs + gclid
const e2ePayload = {
  firstTouch: {
    source: 'google',
    medium: 'cpc',
    campaign: 'test-campaign',
    landingPage:
      'http://localhost:3000/?utm_source=google&utm_medium=cpc&utm_campaign=test-campaign&gclid=TEST-GCLID-123',
    capturedAt: iso(),
  },
  lastTouch: {
    source: 'google',
    medium: 'cpc',
    campaign: 'test-campaign',
    landingPage:
      'http://localhost:3000/?utm_source=google&utm_medium=cpc&utm_campaign=test-campaign&gclid=TEST-GCLID-123',
    capturedAt: iso(),
  },
  orderTouch: {
    landingPage: 'http://localhost:3000/checkout/',
    capturedAt: iso(),
  },
  clickIds: { gclid: 'TEST-GCLID-123' },
  consent: { analytics: true, marketing: true, capturedAt: iso() },
};

const e2e = normalizeMarketingAttribution(e2ePayload);
assertMatch('1 E2E checkout fallback normalized', e2e.normalized, {
  source: 'google',
  medium: 'cpc',
  campaign: 'test-campaign',
  channel: 'paid_search',
  sourceMedium: 'google/cpc',
});
if (e2e.attributionStatus === 'available') pass('1 E2E attributionStatus available');
else fail('1 E2E attributionStatus', e2e.attributionStatus);

// 2. gclid only — no touch UTMs
const gclidOnly = normalizeMarketingAttribution({
  clickIds: { gclid: 'solo-gclid-123' },
  consent: { analytics: true, marketing: true, capturedAt: iso() },
});
assertMatch('2 gclid-only normalized', gclidOnly.normalized, {
  source: 'google',
  medium: 'cpc',
  channel: 'paid_search',
  sourceMedium: 'google/cpc',
});

// 3. fbclid only
const fbOnly = normalizeMarketingAttribution({
  orderTouch: {
    landingPage: 'https://example.com/?fbclid=test-fbclid',
    capturedAt: iso(),
  },
  clickIds: { fbclid: 'test-fbclid-123' },
  consent: { analytics: true, marketing: true, capturedAt: iso() },
});
assertMatch('3 fbclid-only normalized', fbOnly.normalized, {
  source: 'facebook',
  channel: 'paid_social',
});
if (fbOnly.normalized?.sourceMedium === 'facebook') pass('3 fbclid-only sourceMedium');
else fail('3 fbclid-only sourceMedium', fbOnly.normalized?.sourceMedium);

// 4. Consent denied — click IDs stripped, consent_denied
const denied = normalizeMarketingAttribution({
  clickIds: { gclid: 'must-not-store', fbclid: 'must-not-store-fb' },
  consent: { analytics: false, marketing: false, capturedAt: iso() },
});
if (!denied.clickIds || Object.keys(denied.clickIds).length === 0) {
  pass('4 consent denied — click IDs stripped');
} else {
  fail('4 consent denied — click IDs stripped', JSON.stringify(denied.clickIds));
}
if (denied.attributionStatus === 'consent_denied') {
  pass('4 consent denied — attributionStatus');
} else {
  fail('4 consent denied — attributionStatus', denied.attributionStatus);
}

// 5. No-overwrite guard unchanged
if (shouldApplyMarketingAttribution({ marketingAttribution: { attributionStatus: 'available' } }) === false) {
  pass('5 no-overwrite — available order skipped');
} else {
  fail('5 no-overwrite — available order skipped');
}
if (shouldApplyMarketingAttribution({ marketingAttribution: { attributionStatus: 'missing' } }) === true) {
  pass('5 no-overwrite — missing order allows fill');
} else {
  fail('5 no-overwrite — missing order allows fill');
}
if (shouldApplyMarketingAttribution({ marketingAttribution: null }) === true) {
  pass('5 no-overwrite — no attribution allows fill');
} else {
  fail('5 no-overwrite — no attribution allows fill');
}

// 6. orderTouch UTMs win over lastTouch when present
const orderTouchWins = normalizeMarketingAttribution({
  lastTouch: { source: 'google', medium: 'cpc', campaign: 'old-campaign', capturedAt: iso() },
  orderTouch: { source: 'bing', medium: 'cpc', campaign: 'new-campaign', capturedAt: iso() },
  consent: { analytics: true, marketing: true, capturedAt: iso() },
});
assertMatch('6 orderTouch preferred over lastTouch', orderTouchWins.normalized, {
  source: 'bing',
  medium: 'cpc',
  campaign: 'new-campaign',
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
