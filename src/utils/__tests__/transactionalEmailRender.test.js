const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildEmailContext,
  renderTransactionalEmail,
  interpolate,
  LAYOUTS,
} = require('../transactionalEmailRender');
const {
  TRANSACTIONAL_EMAIL_TYPES,
  TRANSACTIONAL_TYPE_KEYS,
  TRANSACTIONAL_FIELD_LABELS,
} = require('../../config/transactionalEmailDefaults');

const order = {
  orderNumber: 'Z20260042',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  status: 'Delivered',
  cart: [
    { productName: 'iPhone 15', name: 'Excellent-Black (#000000)-128GB', qty: 1, salePrice: 500, SKU: 'IP15' },
    { productName: 'Case <b>', qty: 2, salePrice: 10 },
    { isTradeIn: true, productId: 'trade-in', name: 'Old phone', qty: 1, salePrice: 0 },
  ],
  shippingMethod: { name: 'Tracked 24', price: 5 },
  totalOrderValue: 525,
  shippingDetails: {
    firstName: 'Jane',
    lastName: 'Doe',
    address: '1 High St',
    city: 'London',
    postalCode: 'SW1A 1AA',
    provider: 'DHL',
    trackingNumber: 'JD0001',
  },
  contactDetails: { email: 'jane@example.com' },
  paymentDetails: { paymentIntentId: 'pi_123', amount: 525, status: 'succeeded' },
};

describe('template definitions', () => {
  test('every type has defaults, labels and a layout', () => {
    for (const k of TRANSACTIONAL_TYPE_KEYS) {
      const d = TRANSACTIONAL_EMAIL_TYPES[k].defaults;
      assert.ok(d.emailSubject && d.headerTitle && d.introParagraph, k);
      assert.deepEqual(Object.keys(TRANSACTIONAL_FIELD_LABELS[k]).sort(), Object.keys(d).sort());
      assert.ok(LAYOUTS[k], `layout for ${k}`);
    }
  });

  test('return / refund requests notify admin too', () => {
    for (const k of ['returnRequest', 'refundRequest', 'purchaseReceipt']) {
      assert.equal(TRANSACTIONAL_EMAIL_TYPES[k].defaults.adminEnabled, 'yes');
    }
  });
});

describe('buildEmailContext', () => {
  test('totals, customer and DHL tracking link', () => {
    const ctx = buildEmailContext(order);
    assert.equal(ctx.subtotal, 520);
    assert.equal(ctx.total, 525);
    assert.equal(ctx.customerName, 'Jane Doe');
    assert.equal(ctx.carrier, 'DHL');
    assert.ok(ctx.trackingUrl.includes('dhl.com'));
    assert.equal(ctx.items[0].variant, 'Excellent · Black · 128GB');
  });
});

describe('renderTransactionalEmail', () => {
  test('receipt: merge tags in subject, products, totals, payment ref; trade-in hidden from customer', () => {
    const fields = TRANSACTIONAL_EMAIL_TYPES.purchaseReceipt.defaults;
    const { subject, html } = renderTransactionalEmail('purchaseReceipt', {
      fields,
      ctx: buildEmailContext(order),
      branding: { primaryHex: '#123456' },
    });
    assert.equal(subject, 'Your receipt for order Z20260042');
    assert.ok(html.includes('iPhone 15'));
    assert.ok(html.includes('£525.00'));
    assert.ok(html.includes('pi_123'));
    assert.ok(html.includes('#123456'));
    assert.ok(!html.includes('Old phone'));
    // product names are escaped
    assert.ok(html.includes('Case &lt;b&gt;'));
  });

  test('seller invoice (admin) uses admin subject and shows trade-in + customer', () => {
    const { subject, html } = renderTransactionalEmail('purchaseReceipt', {
      fields: TRANSACTIONAL_EMAIL_TYPES.purchaseReceipt.defaults,
      ctx: buildEmailContext(order),
      audience: 'admin',
    });
    assert.ok(subject.startsWith('Seller invoice'));
    assert.ok(subject.includes('£525.00'));
    assert.ok(html.includes('Old phone'));
    assert.ok(html.includes('jane@example.com'));
  });

  test('delivered email has the courier tracking button', () => {
    const { html } = renderTransactionalEmail('orderDelivered', {
      fields: TRANSACTIONAL_EMAIL_TYPES.orderDelivered.defaults,
      ctx: buildEmailContext(order),
    });
    assert.ok(html.includes('https://www.dhl.com/gb-en/home/tracking/tracking-express.html?submit=1&amp;tracking-id=JD0001'));
    assert.ok(!/royalmail/i.test(html));
  });

  test('refund status shows amount and request number; admin copy text is escaped', () => {
    const fields = {
      ...TRANSACTIONAL_EMAIL_TYPES.refundStatus.defaults,
      introParagraph: '<script>x</script> Order {{orderNumber}} is {{status}}',
    };
    const { html, subject } = renderTransactionalEmail('refundStatus', {
      fields,
      ctx: buildEmailContext(order, { status: 'Refunded', refundAmount: 100, refundType: 'partial', requestNumber: 'RIM-007' }),
    });
    assert.equal(subject, 'Update on your order Z20260042: Refunded');
    assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt; Order Z20260042 is Refunded'));
    assert.ok(html.includes('£100.00'));
    assert.ok(html.includes('Partial'));
    assert.ok(html.includes('RIM-007'));
  });

  test('unknown merge tags are left as-is', () => {
    assert.equal(interpolate('Hi {{nope}} {{orderNumber}}', { orderNumber: 'A1' }), 'Hi {{nope}} A1');
  });
});
