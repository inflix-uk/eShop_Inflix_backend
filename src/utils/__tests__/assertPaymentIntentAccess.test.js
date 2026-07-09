const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Order = require('../../models/order');
const {
  assertPaymentIntentReadAccess,
  assertPaymentIntentMutateAccess,
  assertMetadataUpdateAccess,
  assertCheckoutSessionReadAccess,
  assertMutablePaymentIntent,
  assertPiCustomerOwnership,
  buildSafePaymentDetailsResponse,
  isPlaceholderEmail,
} = require('../assertPaymentIntentAccess');

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';

function reqAs(user, role = 'user', email) {
  return {
    user: user
      ? {
          _id: user,
          id: user,
          userId: user,
          email: email || (user === USER_A ? 'a@example.com' : 'b@example.com'),
          role,
        }
      : undefined,
  };
}

function guestReq(email) {
  return { user: undefined, body: { email } };
}

function pi(overrides = {}) {
  return {
    id: 'pi_test_1',
    status: 'requires_payment_method',
    amount: 5000,
    currency: 'gbp',
    metadata: {
      orderNumber: 'pending',
      customerEmail: 'pending@checkout.local',
      customerId: 'pending',
    },
    ...overrides,
  };
}

describe('isPlaceholderEmail', () => {
  test('recognizes checkout placeholder', () => {
    assert.equal(isPlaceholderEmail('pending@checkout.local'), true);
    assert.equal(isPlaceholderEmail('real@example.com'), false);
  });
});

describe('assertMutablePaymentIntent', () => {
  test('succeeded PI mutation blocked', () => {
    const result = assertMutablePaymentIntent(pi({ status: 'succeeded' }));
    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
    assert.equal(result.code, 'PAYMENT_FINALIZED');
  });

  test('canceled PI mutation blocked', () => {
    const result = assertMutablePaymentIntent(pi({ status: 'canceled' }));
    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
  });

  test('requires_payment_method allowed', () => {
    const result = assertMutablePaymentIntent(pi({ status: 'requires_payment_method' }));
    assert.equal(result.ok, true);
  });

  test('requires_action allowed', () => {
    const result = assertMutablePaymentIntent(pi({ status: 'requires_action' }));
    assert.equal(result.ok, true);
  });
});

describe('assertPiCustomerOwnership', () => {
  test('wrong email denied', () => {
    const result = assertPiCustomerOwnership(
      pi({ metadata: { customerEmail: 'owner@example.com', customerId: '' } }),
      guestReq('attacker@example.com'),
      { contactEmail: 'attacker@example.com' }
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test('valid guest placeholder email match', () => {
    const result = assertPiCustomerOwnership(
      pi(),
      guestReq('pending@checkout.local'),
      { contactEmail: 'pending@checkout.local', amountUpdateOnly: true }
    );
    assert.equal(result.ok, true);
  });

  test('valid guest real email match', () => {
    const result = assertPiCustomerOwnership(
      pi({ metadata: { customerEmail: 'buyer@example.com', customerId: '' } }),
      guestReq('buyer@example.com'),
      { contactEmail: 'buyer@example.com' }
    );
    assert.equal(result.ok, true);
  });

  test('wrong logged-in user denied', () => {
    const result = assertPiCustomerOwnership(
      pi({ metadata: { customerEmail: 'a@example.com', customerId: USER_A } }),
      reqAs(USER_B),
      { contactEmail: 'b@example.com' }
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test('valid logged-in user by customerId', () => {
    const result = assertPiCustomerOwnership(
      pi({ metadata: { customerEmail: 'a@example.com', customerId: USER_A } }),
      reqAs(USER_A),
      { contactEmail: 'a@example.com' }
    );
    assert.equal(result.ok, true);
  });

  test('logged-in user with placeholder PI customerId allowed', () => {
    const result = assertPiCustomerOwnership(
      pi(),
      reqAs(USER_A),
      { contactEmail: 'a@example.com' }
    );
    assert.equal(result.ok, true);
  });

  test('admin is handled upstream — guest still needs email', () => {
    const result = assertPiCustomerOwnership(pi(), guestReq(''), { contactEmail: '' });
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
  });
});

describe('assertPaymentIntentMutateAccess', () => {
  test('admin override succeeds even when succeeded', async () => {
    const result = await assertPaymentIntentMutateAccess(reqAs(USER_A, 'admin'), {
      paymentIntentId: 'pi_admin',
      paymentIntent: pi({ status: 'succeeded' }),
    });
    assert.equal(result.ok, true);
  });

  test('guest wrong email on amount update denied', async () => {
    const result = await assertPaymentIntentMutateAccess(guestReq('wrong@example.com'), {
      paymentIntentId: 'pi_test_1',
      paymentIntent: pi({ metadata: { customerEmail: 'pending@checkout.local', customerId: 'pending' } }),
      amountUpdateOnly: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test('guest placeholder amount update succeeds', async () => {
    const result = await assertPaymentIntentMutateAccess(guestReq('pending@checkout.local'), {
      paymentIntentId: 'pi_test_1',
      paymentIntent: pi(),
      amountUpdateOnly: true,
    });
    assert.equal(result.ok, true);
  });

  test('wrong orderNumber denied', async () => {
    const result = await assertPaymentIntentMutateAccess(guestReq('buyer@example.com'), {
      paymentIntentId: 'pi_test_1',
      paymentIntent: pi({
        metadata: {
          orderNumber: 'AD20260001',
          customerEmail: 'buyer@example.com',
          customerId: '',
        },
      }),
      orderNumber: 'AD20260002',
      contactEmail: 'buyer@example.com',
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });
});

describe('assertMetadataUpdateAccess', () => {
  let originalFindOne;

  beforeEach(() => {
    originalFindOne = Order.findOne;
  });

  afterEach(() => {
    Order.findOne = originalFindOne;
  });

  test('metadata update rejects mismatched order paymentIntentId', async () => {
    Order.findOne = () => ({
      lean: async () => ({
        orderNumber: 'AD20260001',
        contactDetails: { email: 'buyer@example.com', userId: '' },
        paymentDetails: { paymentIntentId: 'pi_other' },
      }),
    });

    const result = await assertMetadataUpdateAccess(guestReq('buyer@example.com'), {
      paymentIntentId: 'pi_test_1',
      orderNumber: 'AD20260001',
      email: 'buyer@example.com',
      stripe: {
        paymentIntents: { retrieve: async () => pi() },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'PAYMENT_ORDER_MISMATCH');
    assert.equal(result.status, 403);
  });

  test('metadata update allows first bind when order has no paymentIntentId', async () => {
    Order.findOne = () => ({
      lean: async () => ({
        orderNumber: 'AD20260001',
        contactDetails: { email: 'buyer@example.com', userId: '' },
        paymentDetails: null,
      }),
    });

    const result = await assertMetadataUpdateAccess(guestReq('buyer@example.com'), {
      paymentIntentId: 'pi_test_1',
      orderNumber: 'AD20260001',
      email: 'buyer@example.com',
      stripe: {
        paymentIntents: { retrieve: async () => pi() },
      },
    });

    assert.equal(result.ok, true);
  });

  test('metadata update allows placeholder email upgrade when order email matches', async () => {
    Order.findOne = () => ({
      lean: async () => ({
        orderNumber: 'AD20260001',
        contactDetails: { email: 'buyer@example.com', userId: '' },
        paymentDetails: null,
      }),
    });

    const result = await assertMetadataUpdateAccess(guestReq('buyer@example.com'), {
      paymentIntentId: 'pi_test_1',
      orderNumber: 'AD20260001',
      email: 'buyer@example.com',
      stripe: {
        paymentIntents: { retrieve: async () => pi() },
      },
    });

    assert.equal(result.ok, true);
  });

  test('metadata update wrong order email denied', async () => {
    Order.findOne = () => ({
      lean: async () => ({
        orderNumber: 'AD20260001',
        contactDetails: { email: 'owner@example.com', userId: '' },
        paymentDetails: null,
      }),
    });

    const result = await assertMetadataUpdateAccess(guestReq('attacker@example.com'), {
      paymentIntentId: 'pi_test_1',
      orderNumber: 'AD20260001',
      email: 'attacker@example.com',
      stripe: {
        paymentIntents: { retrieve: async () => pi() },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'ORDER_OWNERSHIP_MISMATCH');
  });
});

describe('assertPaymentIntentReadAccess', () => {
  test('read access with matching email succeeds', async () => {
    const result = await assertPaymentIntentReadAccess(guestReq('buyer@example.com'), {
      paymentIntentId: 'pi_test_1',
      paymentIntent: pi({
        status: 'succeeded',
        metadata: { customerEmail: 'buyer@example.com', customerId: '' },
      }),
    });
    assert.equal(result.ok, true);
  });

  test('read access wrong email denied', async () => {
    const result = await assertPaymentIntentReadAccess(guestReq('wrong@example.com'), {
      paymentIntentId: 'pi_test_1',
      paymentIntent: pi({
        status: 'succeeded',
        metadata: { customerEmail: 'buyer@example.com', customerId: '' },
      }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });
});

describe('assertCheckoutSessionReadAccess', () => {
  test('session email match succeeds', () => {
    const result = assertCheckoutSessionReadAccess(
      guestReq('buyer@example.com'),
      { customer_email: 'buyer@example.com', metadata: {} }
    );
    assert.equal(result.ok, true);
  });

  test('session email mismatch denied', () => {
    const result = assertCheckoutSessionReadAccess(
      guestReq('wrong@example.com'),
      { customer_email: 'buyer@example.com', metadata: {} }
    );
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });
});

describe('buildSafePaymentDetailsResponse', () => {
  test('does not leak paymentMethodId or full Stripe object', () => {
    const response = buildSafePaymentDetailsResponse({
      paymentIntent: {
        id: 'pi_safe',
        status: 'succeeded',
        amount: 5099,
        payment_method: 'pm_secret_should_not_leak',
      },
      cardDetails: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2030,
        payment_type: 'Card',
      },
      paymentType: 'Card',
    });

    assert.equal(response.paymentIntentId, 'pi_safe');
    assert.equal(response.cardDetails.last4, '4242');
    assert.equal('paymentMethodId' in response, false);
    assert.equal('payment_method' in response, false);
  });
});
