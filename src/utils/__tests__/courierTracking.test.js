const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  COURIERS,
  findCourier,
  buildTrackingUrl,
  normalizeShippingTracking,
  trackingUrlForOrder,
  listCouriers,
} = require('../courierTracking');

describe('buildTrackingUrl', () => {
  test('DHL builds a DHL link, not Royal Mail (client bug)', () => {
    const url = buildTrackingUrl('DHL', '1234567890');
    assert.equal(
      url,
      'https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&tracking-id=1234567890'
    );
    assert.ok(!/royalmail/i.test(url));
  });

  test('every courier in the dropdown builds a link on its own domain with the number', () => {
    const expectedHost = {
      'Royal Mail': 'royalmail.com',
      DHL: 'dhl.com',
      DPD: 'dpd.co.uk',
      'DPD Local': 'dpdlocal.co.uk',
      UPS: 'ups.com',
      FedEx: 'fedex.com',
      Evri: 'evri.com',
      Parcelforce: 'parcelforce.com',
      Yodel: 'yodel.co.uk',
    };
    for (const c of COURIERS) {
      const url = buildTrackingUrl(c.name, 'AB 123/4');
      assert.ok(expectedHost[c.name], `test is missing ${c.name}`);
      assert.ok(new URL(url).hostname.endsWith(expectedHost[c.name]), `${c.name} → ${url}`);
      assert.ok(url.includes(encodeURIComponent('AB 123/4')), `${c.name} must include encoded number`);
    }
  });

  test('aliases and casing resolve (hermes → Evri, "royal mail" → Royal Mail)', () => {
    assert.equal(findCourier('hermes').name, 'Evri');
    assert.equal(findCourier('ROYAL MAIL').name, 'Royal Mail');
    assert.equal(findCourier('fed-ex').name, 'FedEx');
    assert.equal(findCourier('Pigeon post'), null);
  });

  test('custom URL wins; unsafe URLs ignored; unknown courier gives no link', () => {
    assert.equal(buildTrackingUrl('DHL', '1', 'https://track.example.com/x?id=1'), 'https://track.example.com/x?id=1');
    assert.ok(buildTrackingUrl('DHL', '1', 'javascript:alert(1)').includes('dhl.com'));
    assert.equal(buildTrackingUrl('Pigeon post', '1'), '');
    assert.equal(buildTrackingUrl('DHL', ''), '');
  });
});

describe('normalizeShippingTracking', () => {
  test('canonical name + mapped URL', () => {
    const r = normalizeShippingTracking({ provider: 'dhl', trackingNumber: ' 999 ' });
    assert.equal(r.provider, 'DHL');
    assert.equal(r.trackingNumber, '999');
    assert.ok(r.trackingUrl.includes('dhl.com') && r.trackingUrl.endsWith('tracking-id=999'));
    assert.equal(r.trackingUrlCustom, false);
  });

  test('"Other" with a typed courier name and custom URL keeps both', () => {
    const r = normalizeShippingTracking({
      provider: 'Other',
      customProvider: 'APC Overnight',
      trackingNumber: 'X1',
      trackingUrl: 'https://apc-overnight.com/track/X1',
    });
    assert.equal(r.provider, 'APC Overnight');
    assert.equal(r.trackingUrl, 'https://apc-overnight.com/track/X1');
    assert.equal(r.trackingUrlCustom, true);
  });

  test('changing courier on a full-order save drops the stale auto URL', () => {
    const existing = {
      provider: 'Royal Mail',
      trackingNumber: '1',
      trackingUrl: buildTrackingUrl('Royal Mail', '1'),
      trackingUrlCustom: false,
    };
    const r = normalizeShippingTracking({ ...existing, provider: 'DHL' }, existing);
    assert.ok(r.trackingUrl.includes('dhl.com'));
    assert.equal(r.trackingUrlCustom, false);
  });

  test('saved custom URL survives a partial update that does not send a URL', () => {
    const existing = { provider: 'Other', trackingNumber: '1', trackingUrl: 'https://x.example/1', trackingUrlCustom: true };
    const r = normalizeShippingTracking({ trackingNumber: '1' }, existing);
    assert.equal(r.trackingUrl, 'https://x.example/1');
  });
});

describe('trackingUrlForOrder', () => {
  test('falls back to the courier map for older orders without a stored URL', () => {
    const url = trackingUrlForOrder({ shippingDetails: { provider: 'UPS', trackingNumber: '1Z999' } });
    assert.ok(url.startsWith('https://www.ups.com/'));
  });
});

describe('listCouriers', () => {
  test('includes every mapped courier plus Other', () => {
    const names = listCouriers().map((c) => c.name);
    for (const c of COURIERS) assert.ok(names.includes(c.name));
    assert.equal(names[names.length - 1], 'Other');
  });
});
