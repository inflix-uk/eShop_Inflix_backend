/**
 * PaymentIntent access control for checkout PI routes.
 * Never trust paymentIntentId from the client without ownership proof.
 */

const Order = require('../models/order');
const { validatePaymentOwnership } = require('../services/pricing/verifyPaymentForOrder');
const { getStripeInstance } = require('../services/stripe/stripeClient');
const {
  normalizeEmail,
  getRequesterId,
  getRequesterEmail,
  isAdminUser,
} = require('./ownershipAuth');

const PLACEHOLDER_EMAIL = 'pending@checkout.local';
const PLACEHOLDER_USER_IDS = new Set(['', 'pending', 'express_checkout']);

const MUTABLE_PI_STATUSES = new Set([
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
]);

const TERMINAL_MUTATION_STATUSES = new Set(['succeeded', 'canceled']);

function isPlaceholderEmail(email) {
  const normalized = normalizeEmail(email);
  return !normalized || normalized === PLACEHOLDER_EMAIL;
}

function isPlaceholderUserId(userId) {
  return PLACEHOLDER_USER_IDS.has(String(userId || '').trim());
}

function resolveProofEmail(req, bodyEmail) {
  const explicit = normalizeEmail(bodyEmail);
  if (explicit) return explicit;
  const fromRequestBody = normalizeEmail(req?.body?.email);
  if (fromRequestBody) return fromRequestBody;
  return getRequesterEmail(req);
}

function deny(code, status, message) {
  return { ok: false, code, status, message };
}

function orderBelongsToRequester(req, order, proofEmail) {
  if (!order) return false;
  const orderEmail = normalizeEmail(order.contactDetails?.email);
  const orderUserId = String(order.contactDetails?.userId || '').trim();
  const authUserId = getRequesterId(req);
  const requesterEmail = getRequesterEmail(req);

  if (authUserId) {
    if (orderUserId && orderUserId === authUserId) return true;
    if (orderEmail && requesterEmail && orderEmail === requesterEmail) return true;
    if (orderUserId === 'express_checkout' && proofEmail && orderEmail === proofEmail) return true;
    return false;
  }

  return Boolean(proofEmail && orderEmail && orderEmail === proofEmail);
}

/**
 * Verify PI metadata belongs to the requester (guest email or logged-in account).
 */
function assertPiCustomerOwnership(paymentIntent, req, {
  contactEmail,
  allowEmailUpgrade = false,
  orderEmail = null,
  orderUserId = null,
  amountUpdateOnly = false,
} = {}) {
  const meta = paymentIntent.metadata || {};
  const metaEmail = normalizeEmail(meta.customerEmail);
  const metaUserId = String(meta.customerId || '').trim();
  const proofEmail = resolveProofEmail(req, contactEmail);
  const authUserId = getRequesterId(req);
  const requesterEmail = getRequesterEmail(req);

  if (authUserId) {
    if (metaUserId && !isPlaceholderUserId(metaUserId) && metaUserId !== authUserId) {
      return deny('PAYMENT_OWNERSHIP_MISMATCH', 403, 'Payment does not belong to this account.');
    }

    if (metaUserId === authUserId) {
      return { ok: true };
    }

    if (requesterEmail && metaEmail && metaEmail === requesterEmail) {
      return { ok: true };
    }

    if (isPlaceholderUserId(metaUserId)) {
      if (orderUserId && !isPlaceholderUserId(orderUserId) && orderUserId !== authUserId) {
        if (!orderEmail || orderEmail !== requesterEmail) {
          return deny('PAYMENT_OWNERSHIP_MISMATCH', 403, 'Payment does not belong to this account.');
        }
      }
      return { ok: true };
    }
  }

  if (!proofEmail) {
    return deny('AUTH_REQUIRED', 401, 'Email or authentication is required.');
  }

  if (!metaEmail || metaEmail === proofEmail) {
    return { ok: true };
  }

  if (amountUpdateOnly && isPlaceholderEmail(metaEmail) && isPlaceholderEmail(proofEmail)) {
    return { ok: true };
  }

  if (isPlaceholderEmail(metaEmail) && isPlaceholderEmail(proofEmail)) {
    return { ok: true };
  }

  if (allowEmailUpgrade && isPlaceholderEmail(metaEmail) && orderEmail && normalizeEmail(orderEmail) === proofEmail) {
    return { ok: true };
  }

  return deny('PAYMENT_OWNERSHIP_MISMATCH', 403, 'Payment does not belong to this customer.');
}

function assertPiOrderNumber(paymentIntent, orderNumber) {
  if (!orderNumber) {
    return { ok: true };
  }

  return validatePaymentOwnership(paymentIntent, {
    orderNumber,
    contactEmail: paymentIntent.metadata?.customerEmail,
    authUserId: undefined,
  });
}

function assertMutablePaymentIntent(paymentIntent) {
  const status = paymentIntent.status;

  if (TERMINAL_MUTATION_STATUSES.has(status)) {
    return deny('PAYMENT_FINALIZED', 409, `Payment cannot be modified (${status}).`);
  }

  if (!MUTABLE_PI_STATUSES.has(status)) {
    return deny('PAYMENT_NOT_MUTABLE', 409, `Payment cannot be modified in status: ${status}.`);
  }

  return { ok: true };
}

async function retrievePaymentIntent(paymentIntentId, stripe) {
  const client = stripe || await getStripeInstance();
  return client.paymentIntents.retrieve(paymentIntentId);
}

async function assertPaymentIntentReadAccess(req, {
  paymentIntentId,
  contactEmail,
  paymentIntent: existingIntent,
  stripe,
} = {}) {
  if (!paymentIntentId) {
    return deny('MISSING_PARAMS', 400, 'paymentIntentId is required');
  }

  if (isAdminUser(req)) {
    const paymentIntent = existingIntent || await retrievePaymentIntent(paymentIntentId, stripe);
    return { ok: true, paymentIntent };
  }

  const proofEmail = resolveProofEmail(req, contactEmail);
  if (!proofEmail && !getRequesterId(req)) {
    return deny('AUTH_REQUIRED', 401, 'Email or authentication is required.');
  }

  const paymentIntent = existingIntent || await retrievePaymentIntent(paymentIntentId, stripe);
  const customerCheck = assertPiCustomerOwnership(paymentIntent, req, { contactEmail: proofEmail });
  if (!customerCheck.ok) {
    return { ...customerCheck, paymentIntent };
  }

  return { ok: true, paymentIntent };
}

async function assertPaymentIntentMutateAccess(req, {
  paymentIntentId,
  contactEmail,
  orderNumber,
  paymentIntent: existingIntent,
  stripe,
  allowEmailUpgrade = false,
  order = null,
  amountUpdateOnly = false,
} = {}) {
  if (!paymentIntentId) {
    return deny('MISSING_PARAMS', 400, 'paymentIntentId is required');
  }

  const paymentIntent = existingIntent || await retrievePaymentIntent(paymentIntentId, stripe);

  if (!isAdminUser(req)) {
    const mutable = assertMutablePaymentIntent(paymentIntent);
    if (!mutable.ok) {
      return { ...mutable, paymentIntent };
    }
  }

  if (isAdminUser(req)) {
    return { ok: true, paymentIntent };
  }

  const orderEmail = order?.contactDetails?.email || null;
  const orderUserId = order?.contactDetails?.userId || null;

  const customerCheck = assertPiCustomerOwnership(paymentIntent, req, {
    contactEmail,
    allowEmailUpgrade,
    orderEmail,
    orderUserId,
    amountUpdateOnly,
  });
  if (!customerCheck.ok) {
    return { ...customerCheck, paymentIntent };
  }

  if (orderNumber) {
    const orderNumCheck = assertPiOrderNumber(paymentIntent, orderNumber);
    if (!orderNumCheck.ok) {
      return { ...orderNumCheck, paymentIntent };
    }

    const proofEmail = resolveProofEmail(req, contactEmail);
    const ownership = validatePaymentOwnership(paymentIntent, {
      orderNumber,
      contactEmail: proofEmail,
      authUserId: getRequesterId(req) || undefined,
    });

    if (!ownership.ok) {
      const metaEmail = normalizeEmail(paymentIntent.metadata?.customerEmail);
      const canUpgrade = allowEmailUpgrade && isPlaceholderEmail(metaEmail);
      const placeholderFlow = isPlaceholderEmail(metaEmail) && isPlaceholderEmail(proofEmail);
      const loggedInPlaceholderUser = getRequesterId(req)
        && isPlaceholderUserId(paymentIntent.metadata?.customerId);

      if (!(canUpgrade || placeholderFlow || loggedInPlaceholderUser)) {
        return { ...ownership, paymentIntent };
      }
    }
  }

  return { ok: true, paymentIntent };
}

async function assertMetadataUpdateAccess(req, { paymentIntentId, orderNumber, email, stripe }) {
  if (!paymentIntentId || !orderNumber) {
    return deny('MISSING_PARAMS', 400, 'paymentIntentId and orderNumber are required');
  }

  const proofEmail = resolveProofEmail(req, email);
  if (!proofEmail && !getRequesterId(req) && !isAdminUser(req)) {
    return deny('AUTH_REQUIRED', 401, 'Email or authentication is required.');
  }

  const order = await Order.findOne({ orderNumber }).lean();
  if (!order) {
    return deny('ORDER_NOT_FOUND', 404, 'Order not found');
  }

  if (!isAdminUser(req) && !orderBelongsToRequester(req, order, proofEmail)) {
    return deny('ORDER_OWNERSHIP_MISMATCH', 403, 'Order does not belong to this customer.');
  }

  const boundPi = order.paymentDetails?.paymentIntentId;
  if (boundPi && String(boundPi) !== String(paymentIntentId)) {
    return deny('PAYMENT_ORDER_MISMATCH', 403, 'Order is linked to a different payment.');
  }

  return assertPaymentIntentMutateAccess(req, {
    paymentIntentId,
    contactEmail: proofEmail || normalizeEmail(order.contactDetails?.email),
    orderNumber,
    stripe,
    allowEmailUpgrade: true,
    order,
  });
}

function assertCheckoutSessionReadAccess(req, session, contactEmail) {
  if (isAdminUser(req)) {
    return { ok: true };
  }

  const proofEmail = resolveProofEmail(req, contactEmail);
  if (!proofEmail) {
    return deny('AUTH_REQUIRED', 401, 'Email is required to retrieve payment details.');
  }

  const sessionEmail = normalizeEmail(
    session.customer_email || session.customer_details?.email || ''
  );
  const metaEmail = normalizeEmail(session.metadata?.customerEmail || '');

  if (sessionEmail && sessionEmail === proofEmail) {
    return { ok: true };
  }
  if (metaEmail && metaEmail === proofEmail) {
    return { ok: true };
  }
  if (isPlaceholderEmail(sessionEmail) && isPlaceholderEmail(proofEmail)) {
    return { ok: true };
  }

  return deny('PAYMENT_OWNERSHIP_MISMATCH', 403, 'Checkout session does not belong to this customer.');
}

function buildSafeCardDetailsFromPaymentMethod(paymentMethod) {
  if (!paymentMethod) {
    return null;
  }

  if (paymentMethod.card) {
    return {
      brand: paymentMethod.card.brand,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      last4: paymentMethod.card.last4,
      payment_type: 'Card',
    };
  }
  if (paymentMethod.link) {
    return { payment_type: 'Link' };
  }
  if (paymentMethod.paypal) {
    return { payment_type: 'PayPal' };
  }
  if (paymentMethod.klarna) {
    return { payment_type: 'Klarna' };
  }

  return { payment_type: 'Unknown' };
}

function buildSafeCardDetailsFromCharge(charge) {
  const pmDetails = charge?.payment_method_details;
  if (!pmDetails) {
    return null;
  }

  if (pmDetails.card) {
    return {
      brand: pmDetails.card.brand,
      exp_month: pmDetails.card.exp_month,
      exp_year: pmDetails.card.exp_year,
      last4: pmDetails.card.last4,
      payment_type: 'Card',
    };
  }
  if (pmDetails.link) {
    return { payment_type: 'Link' };
  }
  if (pmDetails.paypal) {
    return { payment_type: 'PayPal' };
  }
  if (pmDetails.klarna) {
    return { payment_type: 'Klarna' };
  }

  return null;
}

function buildSafePaymentDetailsResponse({ paymentIntent, cardDetails, paymentType }) {
  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    paymentType: paymentType || cardDetails?.payment_type || 'Unknown',
    cardDetails: cardDetails || { payment_type: paymentType || 'Unknown' },
  };
}

module.exports = {
  assertPaymentIntentReadAccess,
  assertPaymentIntentMutateAccess,
  assertMetadataUpdateAccess,
  assertCheckoutSessionReadAccess,
  assertMutablePaymentIntent,
  assertPiCustomerOwnership,
  buildSafeCardDetailsFromPaymentMethod,
  buildSafeCardDetailsFromCharge,
  buildSafePaymentDetailsResponse,
  resolveProofEmail,
  isPlaceholderEmail,
  MUTABLE_PI_STATUSES,
};
