const mongoose = require('mongoose');
const StripeSettings = require('../../models/stripeSettings');
const StripeAccount = require('../../models/stripeAccount');

/**
 * Single place that answers "which Stripe account handles this payment?".
 *
 * A booking package may name its own StripeAccount; everything else (shop
 * checkout, packages with no account) uses the platform default held in the
 * StripeSettings singleton. Resolution NEVER throws on a bad/inactive account
 * id — it falls back to the platform default and reports why, so a mis-typed
 * reference degrades to the old behaviour instead of blocking checkout.
 *
 * Shape returned by every resolver here:
 *   { secretKey, publishableKey, webhookSecret, mode, accountId, label, source }
 *   accountId === null  → platform default
 */

async function platformKeys() {
  const keys = await StripeSettings.getActiveKeys();
  return {
    secretKey: keys.secretKey || '',
    publishableKey: keys.publishableKey || '',
    webhookSecret: keys.webhookSecret || '',
    mode: keys.mode,
    accountId: null,
    label: 'Platform default',
    source: keys.source,
  };
}

/**
 * Keys for one named account, falling back to the platform default when the
 * account is missing, inactive, or holds keys for the other Stripe mode.
 */
async function resolveKeysForAccount(accountId) {
  if (!accountId) return platformKeys();

  const account = await StripeAccount.findUsable(accountId);
  if (!account) {
    console.warn(
      `[stripe] account ${accountId} is missing/inactive — falling back to the platform default`
    );
    return platformKeys();
  }

  const keys = account.keysForActiveMode();
  if (!keys.secretKey || !keys.publishableKey) {
    console.warn(
      `[stripe] account "${account.label}" has no usable ${keys.mode} keys — falling back to the platform default`
    );
    return platformKeys();
  }

  return {
    secretKey: keys.secretKey,
    publishableKey: keys.publishableKey,
    webhookSecret: keys.webhookSecret,
    mode: keys.mode,
    accountId: String(account._id),
    label: account.label,
    source: 'stripeAccount',
  };
}

/** Accepts a package document/lean object or a raw package id. */
async function resolveKeysForPackage(pkgOrId) {
  if (!pkgOrId) return platformKeys();

  let pkg = pkgOrId;
  if (typeof pkgOrId === 'string' || pkgOrId instanceof mongoose.Types.ObjectId) {
    const BookingPackage = require('../../models/bookingPackage');
    if (!mongoose.Types.ObjectId.isValid(String(pkgOrId))) return platformKeys();
    pkg = await BookingPackage.findById(pkgOrId).select('stripeAccountId').lean();
  }

  return resolveKeysForAccount(pkg?.stripeAccountId || null);
}

function stripeClientFromKeys(keys) {
  if (!keys?.secretKey) {
    const err = new Error(
      keys?.mode === 'test'
        ? 'Stripe test mode is on but no sk_test_ key is configured'
        : 'Stripe secret key is not configured'
    );
    err.statusCode = 503;
    throw err;
  }
  return require('stripe')(keys.secretKey);
}

/** Resolved keys + a ready Stripe client for a booking package. */
async function resolveStripeForPackage(pkgOrId) {
  const keys = await resolveKeysForPackage(pkgOrId);
  return { ...keys, stripe: stripeClientFromKeys(keys) };
}

/** Resolved keys + a ready Stripe client for one named account (or platform). */
async function resolveStripeForAccount(accountId) {
  const keys = await resolveKeysForAccount(accountId);
  return { ...keys, stripe: stripeClientFromKeys(keys) };
}

/**
 * Every account a webhook signature could have been signed with — platform
 * default first, then each active named account that has a signing secret.
 * The webhook tries them in order until one verifies.
 */
async function getWebhookVerificationCandidates() {
  const candidates = [];

  try {
    const platform = await platformKeys();
    if (platform.webhookSecret && platform.secretKey) {
      candidates.push(platform);
    }
  } catch (error) {
    console.error('[stripe] could not load platform webhook secret:', error.message);
  }

  try {
    const accounts = await StripeAccount.listActive();
    for (const account of accounts) {
      const keys = account.keysForActiveMode();
      if (!keys.webhookSecret || !keys.secretKey) continue;
      candidates.push({
        secretKey: keys.secretKey,
        publishableKey: keys.publishableKey,
        webhookSecret: keys.webhookSecret,
        mode: keys.mode,
        accountId: String(account._id),
        label: account.label,
        source: 'stripeAccount',
      });
    }
  } catch (error) {
    console.error('[stripe] could not load named webhook secrets:', error.message);
  }

  return candidates;
}

/**
 * Every account whose keys could own a PaymentIntent — platform default
 * first, then each active named account. Used when we hold a PaymentIntent id
 * but do not yet know which account created it.
 */
async function getRetrievalCandidates() {
  const candidates = [];

  try {
    const platform = await platformKeys();
    if (platform.secretKey) candidates.push(platform);
  } catch (error) {
    console.error('[stripe] could not load platform keys:', error.message);
  }

  try {
    const accounts = await StripeAccount.listActive();
    for (const account of accounts) {
      const keys = account.keysForActiveMode();
      if (!keys.secretKey) continue;
      candidates.push({
        secretKey: keys.secretKey,
        publishableKey: keys.publishableKey,
        webhookSecret: keys.webhookSecret,
        mode: keys.mode,
        accountId: String(account._id),
        label: account.label,
        source: 'stripeAccount',
      });
    }
  } catch (error) {
    console.error('[stripe] could not load named account keys:', error.message);
  }

  return candidates;
}

/**
 * Retrieve a PaymentIntent without knowing its account up front.
 * Tries each configured account and returns the first that owns it.
 * A "no such payment_intent" / permission error just moves to the next
 * account; any other Stripe error is surfaced.
 */
async function retrievePaymentIntentAnyAccount(paymentIntentId, preferredAccountId) {
  const id = String(paymentIntentId || '').trim();
  if (!id) return null;

  const all = await getRetrievalCandidates();
  const ordered = preferredAccountId
    ? [
        ...all.filter((c) => String(c.accountId) === String(preferredAccountId)),
        ...all.filter((c) => String(c.accountId) !== String(preferredAccountId)),
      ]
    : all;

  let lastFatalError = null;

  for (const keys of ordered) {
    try {
      const stripe = require('stripe')(keys.secretKey);
      const paymentIntent = await stripe.paymentIntents.retrieve(id);
      return { paymentIntent, stripe, keys };
    } catch (error) {
      const notThisAccount =
        error?.type === 'StripeInvalidRequestError' ||
        error?.type === 'StripeAuthenticationError' ||
        error?.statusCode === 404 ||
        error?.statusCode === 401;
      if (!notThisAccount) lastFatalError = error;
    }
  }

  if (lastFatalError) throw lastFatalError;
  return null;
}

module.exports = {
  platformKeys,
  resolveKeysForAccount,
  getRetrievalCandidates,
  retrievePaymentIntentAnyAccount,
  resolveKeysForPackage,
  resolveStripeForAccount,
  resolveStripeForPackage,
  stripeClientFromKeys,
  getWebhookVerificationCandidates,
};
