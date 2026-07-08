const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  validatePaymentIntentState,
  validatePaymentAmount,
  validatePaymentOwnership,
  verifyPaymentForOrder,
  buildServerPaymentDetails,
  extractPaymentIntentId,
} = require('../verifyPaymentForOrder');
const { calculateDiscountAmount } = require('../resolveCoupon');

const CHECKOUT = {
  totalAmountPence: 5099,
  finalTotal: 50.99,
  productSubtotal: 45.99,
  totalDiscount: 0,
  shippingCost: 5,
};

function successPaymentIntent(overrides = {}) {
  return {
    id: 'pi_test_success',
    status: 'succeeded',
    amount: 5099,
    currency: 'gbp',
    payment_method: 'pm_test_1',
    created: 1700000000,
    metadata: {
      orderNumber: 'AD20260001',
      customerEmail: 'buyer@example.com',
      customerId: '',
    },
    ...overrides,
  };
}

describe('extractPaymentIntentId', () => {
  test('reads paymentIntentId field', () => {
    assert.equal(extractPaymentIntentId({ paymentIntentId: 'pi_abc' }), 'pi_abc');
  });

  test('reads id fallback', () => {
    assert.equal(extractPaymentIntentId({ id: 'pi_xyz' }), 'pi_xyz');
  });

  test('returns null when missing', () => {
    assert.equal(extractPaymentIntentId(null), null);
  });
});

describe('validatePaymentIntentState', () => {
  test('succeeded passes', () => {
    assert.equal(validatePaymentIntentState({ status: 'succeeded' }).ok, true);
  });

  test('canceled payment rejected', () => {
    const result = validatePaymentIntentState({ status: 'canceled' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_CANCELLED');
  });

  test('unpaid checkout rejected', () => {
    const result = validatePaymentIntentState({ status: 'requires_payment_method' });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_INCOMPLETE');
  });

  test('missing payment intent rejected', () => {
    const result = validatePaymentIntentState(null);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_UNVERIFIED');
  });
});

describe('validatePaymentAmount', () => {
  test('matching amount and currency passes', () => {
    const result = validatePaymentAmount(
      { amount: 5099, currency: 'gbp' },
      CHECKOUT
    );
    assert.equal(result.ok, true);
  });

  test('amount mismatch rejected', () => {
    const result = validatePaymentAmount(
      { amount: 100, currency: 'gbp' },
      CHECKOUT
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_AMOUNT_MISMATCH');
  });

  test('currency mismatch rejected', () => {
    const result = validatePaymentAmount(
      { amount: 5099, currency: 'usd' },
      CHECKOUT
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_CURRENCY_MISMATCH');
  });
});

describe('validatePaymentOwnership', () => {
  test('matching order and email passes', () => {
    const result = validatePaymentOwnership(successPaymentIntent(), {
      orderNumber: 'AD20260001',
      contactEmail: 'buyer@example.com',
      authUserId: null,
    });
    assert.equal(result.ok, true);
  });

  test('order number mismatch rejected', () => {
    const result = validatePaymentOwnership(successPaymentIntent(), {
      orderNumber: 'AD20260999',
      contactEmail: 'buyer@example.com',
      authUserId: null,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_OWNERSHIP_MISMATCH');
  });

  test('email mismatch rejected', () => {
    const result = validatePaymentOwnership(successPaymentIntent(), {
      orderNumber: 'AD20260001',
      contactEmail: 'attacker@example.com',
      authUserId: null,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_OWNERSHIP_MISMATCH');
  });

  test('authenticated user mismatch rejected', () => {
    const result = validatePaymentOwnership(
      successPaymentIntent({ metadata: { customerId: 'user_a', customerEmail: 'buyer@example.com', orderNumber: 'AD20260001' } }),
      {
        orderNumber: 'AD20260001',
        contactEmail: 'buyer@example.com',
        authUserId: 'user_b',
      }
    );
    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_OWNERSHIP_MISMATCH');
  });

  test('pending metadata order number allowed for draft orders', () => {
    const result = validatePaymentOwnership(
      successPaymentIntent({ metadata: { orderNumber: 'pending', customerEmail: 'buyer@example.com' } }),
      {
        orderNumber: 'AD20260001',
        contactEmail: 'buyer@example.com',
        authUserId: null,
      }
    );
    assert.equal(result.ok, true);
  });
});

describe('verifyPaymentForOrder', () => {
  test('successful payment verification', async () => {
    const pi = successPaymentIntent();
    const result = await verifyPaymentForOrder({
      req: {},
      checkout: CHECKOUT,
      paymentDetails: { paymentIntentId: pi.id },
      orderNumber: 'AD20260001',
      contactInformation: { email: 'buyer@example.com' },
      deps: {
        findPaymentIntentReuse: async () => null,
        retrievePaymentIntent: async () => pi,
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.serverPaymentDetails.paymentIntentId, pi.id);
    assert.equal(result.serverPaymentDetails.status, 'succeeded');
    assert.equal(result.serverPaymentDetails.amount, 50.99);
  });

  test('missing payment intent id rejected', async () => {
    const result = await verifyPaymentForOrder({
      req: {},
      checkout: CHECKOUT,
      paymentDetails: {},
      orderNumber: 'AD20260001',
      contactInformation: { email: 'buyer@example.com' },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_UNVERIFIED');
  });

  test('duplicate payment intent rejected', async () => {
    const result = await verifyPaymentForOrder({
      req: {},
      checkout: CHECKOUT,
      paymentDetails: { paymentIntentId: 'pi_used' },
      orderNumber: 'AD20260002',
      contactInformation: { email: 'buyer@example.com' },
      deps: {
        findPaymentIntentReuse: async () => ({ orderNumber: 'AD20260001' }),
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_ALREADY_USED');
  });

  test('cancelled payment rejected', async () => {
    const result = await verifyPaymentForOrder({
      req: {},
      checkout: CHECKOUT,
      paymentDetails: { paymentIntentId: 'pi_cancelled' },
      orderNumber: 'AD20260001',
      contactInformation: { email: 'buyer@example.com' },
      deps: {
        findPaymentIntentReuse: async () => null,
        retrievePaymentIntent: async () => successPaymentIntent({ status: 'canceled' }),
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_CANCELLED');
  });
});

describe('buildServerPaymentDetails', () => {
  test('builds details from Stripe object only', () => {
    const details = buildServerPaymentDetails(successPaymentIntent());
    assert.equal(details.paymentIntentId, 'pi_test_success');
    assert.equal(details.amount, 50.99);
    assert.equal(details.currency, 'gbp');
    assert.equal(details.status, 'succeeded');
    assert.ok(details.paidAt instanceof Date);
  });
});

describe('calculateDiscountAmount (server coupon)', () => {
  test('flat discount capped at subtotal', () => {
    const amount = calculateDiscountAmount(20, { discount_type: 'flat', discount: 50 });
    assert.equal(amount, 20);
  });

  test('percentage discount with upto cap', () => {
    const amount = calculateDiscountAmount(100, {
      discount_type: 'percentage',
      discount: 50,
      upto: 30,
    });
    assert.equal(amount, 30);
  });
});
