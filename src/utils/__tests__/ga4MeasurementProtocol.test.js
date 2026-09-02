const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildGa4MpPayload,
} = require('../../services/conversionTracking/ga4MeasurementProtocol');
const {
  normalizeMarketingAttribution,
} = require('../marketingAttribution');

describe('GA4 Measurement Protocol dual mode', () => {
  const baseOrder = {
    orderNumber: 'INF-2002',
    totalOrderValue: 120,
    cart: [{ productId: 'p1', productName: 'Phone', salePrice: 120, qty: 1 }],
    marketingAttribution: {
      clickIds: { gclid: 'GCLID-XYZ' },
      orderTouch: { source: 'google', medium: 'cpc', campaign: 'brand' },
      gaClientId: '123.456',
      visitorId: 'mvis_1',
      consent: { analytics: true, marketing: true },
    },
    conversionConsent: { analytics: true, marketing: true },
  };

  test('full params include items and inferred source when analyticsConsent=true', () => {
    const result = buildGa4MpPayload(baseOrder);
    assert.equal(result.mode, 'full');
    assert.equal(result.params.transaction_id, 'INF-2002');
    assert.equal(result.params.gclid, 'GCLID-XYZ');
    assert.equal(result.params.event_id, 'INF-2002');
    assert.ok(Array.isArray(result.params.items));
    assert.equal(result.params.items.length, 1);
    assert.equal(result.params.source, 'google');
    assert.equal(result.client_id, '123.456');
  });

  test('minimal params have no items when analyticsConsent=false; gclid still present', () => {
    const result = buildGa4MpPayload({
      ...baseOrder,
      conversionConsent: { analytics: false, marketing: false },
      marketingAttribution: {
        ...baseOrder.marketingAttribution,
        consent: { analytics: false, marketing: false },
        gaClientId: undefined,
        visitorId: undefined,
      },
    });
    assert.equal(result.mode, 'minimal');
    assert.equal(result.params.gclid, 'GCLID-XYZ');
    assert.equal(result.params.items, undefined);
    assert.equal(result.params.event_id, undefined);
    assert.equal(result.params.source, undefined);
    assert.equal(result.params.transaction_id, 'INF-2002');
    assert.equal(result.client_id, 'INF-2002');
  });
});

describe('normalizeMarketingAttribution consent split', () => {
  test('without marketing, fbc and fbp gone, gclid still present', () => {
    const result = normalizeMarketingAttribution({
      clickIds: { gclid: 'KEEP-GCLID', fbc: 'drop-fbc', fbp: 'drop-fbp' },
      visitorId: 'should-drop',
      gaClientId: 'should-drop-ga',
      consent: { analytics: false, marketing: false, capturedAt: new Date().toISOString() },
    });
    assert.equal(result.clickIds.gclid, 'KEEP-GCLID');
    assert.equal(result.clickIds.fbc, undefined);
    assert.equal(result.clickIds.fbp, undefined);
    assert.equal(result.visitorId, undefined);
    assert.equal(result.gaClientId, undefined);
    assert.equal(result.attributionStatus, 'available');
    assert.equal(result.consent.analytics, false);
    assert.equal(result.consent.marketing, false);
  });

  test('with analytics, visitorId and gaClientId persist', () => {
    const result = normalizeMarketingAttribution({
      clickIds: { gclid: 'KEEP-GCLID' },
      visitorId: 'mvis_keep',
      gaClientId: '999.111',
      consent: { analytics: true, marketing: false, capturedAt: new Date().toISOString() },
    });
    assert.equal(result.clickIds.gclid, 'KEEP-GCLID');
    assert.equal(result.visitorId, 'mvis_keep');
    assert.equal(result.gaClientId, '999.111');
  });
});
