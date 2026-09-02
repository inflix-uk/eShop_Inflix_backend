const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldUploadForOrder,
  buildGoogleAdsUploadFields,
} = require('../../services/conversionTracking/googleAdsEligibility');

function order(overrides = {}) {
  return {
    orderNumber: 'INF-1001',
    totalOrderValue: 99,
    createdAt: new Date('2026-09-02T12:00:00Z'),
    contactDetails: { email: 'buyer@example.com', phoneNumber: '07123456789' },
    shippingDetails: { phoneNumber: '07123456789' },
    marketingAttribution: {
      clickIds: {},
      consent: { analytics: false, marketing: false },
    },
    conversionConsent: { analytics: false, marketing: false },
    conversionTracking: {},
    ...overrides,
  };
}

describe('shouldUploadForOrder', () => {
  test('gclid present, marketing=false, analytics=false → gclid_only', () => {
    const result = shouldUploadForOrder(
      order({
        marketingAttribution: {
          clickIds: { gclid: 'EAIaIQobChMI' },
          consent: { analytics: false, marketing: false },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'gclid_only');
    assert.equal(result.adUserData, 'DENIED');
  });

  test('gbraid present, marketing=false, analytics=true → gclid_only', () => {
    const result = shouldUploadForOrder(
      order({
        conversionConsent: { analytics: true, marketing: false },
        marketingAttribution: {
          clickIds: { gbraid: 'GBRAID-1' },
          consent: { analytics: true, marketing: false },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'gclid_only');
    assert.equal(result.adUserData, 'DENIED');
  });

  test('wbraid + marketing + email/phone → gclid_and_enhanced', () => {
    const result = shouldUploadForOrder(
      order({
        conversionConsent: { analytics: false, marketing: true },
        marketingAttribution: {
          clickIds: { wbraid: 'WBRAID-1' },
          consent: { analytics: false, marketing: true },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'gclid_and_enhanced');
    assert.equal(result.adUserData, 'GRANTED');
  });

  test('gclid + marketing + email/phone → gclid_and_enhanced', () => {
    const result = shouldUploadForOrder(
      order({
        conversionConsent: { analytics: true, marketing: true },
        marketingAttribution: {
          clickIds: { gclid: 'GCLID-1' },
          consent: { analytics: true, marketing: true },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'gclid_and_enhanced');
  });

  test('gclid + marketing, no email/phone → gclid_only', () => {
    const result = shouldUploadForOrder(
      order({
        contactDetails: {},
        shippingDetails: {},
        conversionConsent: { analytics: true, marketing: true },
        marketingAttribution: {
          clickIds: { gclid: 'GCLID-1' },
          consent: { analytics: true, marketing: true },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'gclid_only');
  });

  test('no click id, email present, marketing=true → enhanced_only', () => {
    const result = shouldUploadForOrder(
      order({
        conversionConsent: { analytics: false, marketing: true },
        marketingAttribution: {
          clickIds: {},
          consent: { analytics: false, marketing: true },
        },
      })
    );
    assert.equal(result.eligible, true);
    assert.equal(result.uploadMode, 'enhanced_only');
    assert.equal(result.adUserData, 'GRANTED');
  });

  test('no click id, email present, marketing=false → not eligible', () => {
    const result = shouldUploadForOrder(
      order({
        conversionConsent: { analytics: true, marketing: false },
        marketingAttribution: {
          clickIds: {},
          consent: { analytics: true, marketing: false },
        },
      })
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'No consent for Google Ads conversion upload');
  });

  test('no click id, no email/phone → not eligible', () => {
    const result = shouldUploadForOrder(
      order({
        contactDetails: {},
        shippingDetails: {},
        marketingAttribution: { clickIds: {} },
      })
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'No gclid or user-provided data');
  });

  test('already status=sent → not eligible', () => {
    const result = shouldUploadForOrder(
      order({
        marketingAttribution: { clickIds: { gclid: 'GCLID-1' } },
        conversionTracking: { googleAds: { status: 'sent' } },
      })
    );
    assert.equal(result.eligible, false);
    assert.equal(result.reason, 'Already sent');
  });

  test('gclid_only payload sends adUserData=DENIED and no userIdentifiers', () => {
    const { decision, payload } = buildGoogleAdsUploadFields(
      order({
        marketingAttribution: {
          clickIds: { gclid: 'EAIaIQobChMI' },
          consent: { analytics: false, marketing: false },
        },
      }),
      { hashedEmail: 'abc', hashedPhoneNumber: 'def' }
    );
    assert.equal(decision.uploadMode, 'gclid_only');
    assert.equal(payload.consent.adUserData, 'DENIED');
    assert.equal(payload.gclid, 'EAIaIQobChMI');
    assert.equal(payload.userIdentifiers, undefined);
    assert.equal(payload.orderId, 'INF-1001');
  });
});
