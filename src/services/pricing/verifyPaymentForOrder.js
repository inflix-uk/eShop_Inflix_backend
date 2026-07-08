const Order = require('../../models/order');
const { buildPricingScope } = require('./buildPricingScope');
const { getStripeInstance } = require('../stripe/stripeClient');

function extractPaymentIntentId(paymentDetails) {
  if (!paymentDetails) return null;
  const id = paymentDetails.paymentIntentId || paymentDetails.id || null;
  return id ? String(id).trim() : null;
}

function buildServerPaymentDetails(paymentIntent) {
  return {
    paymentIntentId: paymentIntent.id,
    paymentMethodId:
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id || null,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    paidAt: new Date(),
  };
}

/**
 * Pure validation — payment intent lifecycle state.
 */
function validatePaymentIntentState(paymentIntent) {
  if (!paymentIntent) {
    return {
      ok: false,
      code: 'PAYMENT_UNVERIFIED',
      status: 402,
      message: 'Payment could not be verified.',
    };
  }

  if (paymentIntent.status === 'canceled') {
    return {
      ok: false,
      code: 'PAYMENT_CANCELLED',
      status: 402,
      message: 'Payment was cancelled.',
    };
  }

  if (paymentIntent.status !== 'succeeded') {
    return {
      ok: false,
      code: 'PAYMENT_INCOMPLETE',
      status: 402,
      message: 'Payment has not been completed.',
    };
  }

  return { ok: true };
}

/**
 * Pure validation — amount and currency against server checkout total.
 */
function validatePaymentAmount(paymentIntent, checkout) {
  const expectedCurrency = 'gbp';
  const actualCurrency = String(paymentIntent.currency || '').toLowerCase();

  if (actualCurrency !== expectedCurrency) {
    return {
      ok: false,
      code: 'PAYMENT_CURRENCY_MISMATCH',
      status: 409,
      message: 'Payment currency does not match checkout.',
    };
  }

  if (paymentIntent.amount !== checkout.totalAmountPence) {
    return {
      ok: false,
      code: 'PAYMENT_AMOUNT_MISMATCH',
      status: 409,
      message: 'Payment amount does not match checkout total.',
    };
  }

  return { ok: true };
}

/**
 * Pure validation — PI metadata must belong to this checkout session.
 */
function validatePaymentOwnership(paymentIntent, { orderNumber, contactEmail, authUserId }) {
  const meta = paymentIntent.metadata || {};
  const metaOrder = String(meta.orderNumber || '').trim();
  const metaEmail = String(meta.customerEmail || '').trim().toLowerCase();
  const metaUserId = String(meta.customerId || '').trim();
  const email = String(contactEmail || '').trim().toLowerCase();

  if (orderNumber && metaOrder && metaOrder !== 'pending' && metaOrder !== orderNumber) {
    return {
      ok: false,
      code: 'PAYMENT_OWNERSHIP_MISMATCH',
      status: 403,
      message: 'Payment does not belong to this order.',
    };
  }

  if (metaEmail && email && metaEmail !== email) {
    return {
      ok: false,
      code: 'PAYMENT_OWNERSHIP_MISMATCH',
      status: 403,
      message: 'Payment does not belong to this customer.',
    };
  }

  if (authUserId && metaUserId && metaUserId !== authUserId) {
    return {
      ok: false,
      code: 'PAYMENT_OWNERSHIP_MISMATCH',
      status: 403,
      message: 'Payment does not belong to this account.',
    };
  }

  return { ok: true };
}

async function findPaymentIntentReuse(paymentIntentId, currentOrderNumber) {
  const query = {
    'paymentDetails.paymentIntentId': paymentIntentId,
    status: { $ne: 'Failed' },
  };
  if (currentOrderNumber) {
    query.orderNumber = { $ne: currentOrderNumber };
  }
  return Order.findOne(query).lean();
}

/**
 * Verify Stripe PaymentIntent before fulfilling an order.
 */
async function verifyPaymentForOrder({
  req,
  checkout,
  paymentDetails,
  orderNumber,
  contactInformation,
  deps = {},
}) {
  const paymentIntentId = extractPaymentIntentId(paymentDetails);
  if (!paymentIntentId) {
    return {
      ok: false,
      success: false,
      code: 'PAYMENT_UNVERIFIED',
      status: 402,
      message: 'Payment reference is required.',
    };
  }

  const reusedOrder = deps.findPaymentIntentReuse
    ? await deps.findPaymentIntentReuse(paymentIntentId, orderNumber)
    : await findPaymentIntentReuse(paymentIntentId, orderNumber);
  if (reusedOrder) {
    return {
      ok: false,
      success: false,
      code: 'PAYMENT_ALREADY_USED',
      status: 409,
      message: 'This payment has already been used for another order.',
    };
  }

  let paymentIntent;
  try {
    if (deps.retrievePaymentIntent) {
      paymentIntent = await deps.retrievePaymentIntent(paymentIntentId);
    } else {
      const stripe = deps.stripe || await getStripeInstance();
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    }
  } catch (error) {
    console.error('Stripe PaymentIntent retrieve failed:', error.message);
    return {
      ok: false,
      success: false,
      code: 'PAYMENT_UNVERIFIED',
      status: 402,
      message: 'Payment could not be verified.',
    };
  }

  const stateCheck = validatePaymentIntentState(paymentIntent);
  if (!stateCheck.ok) {
    return { ...stateCheck, success: false };
  }

  const amountCheck = validatePaymentAmount(paymentIntent, checkout);
  if (!amountCheck.ok) {
    return { ...amountCheck, success: false };
  }

  const scope = buildPricingScope(req);
  const ownershipCheck = validatePaymentOwnership(paymentIntent, {
    orderNumber,
    contactEmail: contactInformation?.email,
    authUserId: scope.userId,
  });
  if (!ownershipCheck.ok) {
    return { ...ownershipCheck, success: false };
  }

  return {
    ok: true,
    success: true,
    paymentIntent,
    serverPaymentDetails: buildServerPaymentDetails(paymentIntent),
  };
}

module.exports = {
  verifyPaymentForOrder,
  extractPaymentIntentId,
  validatePaymentIntentState,
  validatePaymentAmount,
  validatePaymentOwnership,
  buildServerPaymentDetails,
  findPaymentIntentReuse,
};
