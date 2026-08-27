const mongoose = require('mongoose');
const { pickKeyForMode, isStripeTestMode } = require('../utils/stripeMode');

/**
 * Additional named Stripe accounts.
 *
 * The singleton `StripeSettings` stays the platform default used by shop
 * checkout and by any booking package that has no account of its own. Rows
 * here let individual booking packages take payment into a different Stripe
 * account (different sk / pk / webhook signing secret).
 */
const stripeAccountSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    secretKey: {
      type: String,
      default: '',
    },
    publishableKey: {
      type: String,
      default: '',
    },
    /**
     * Signing secret of the webhook endpoint added for THIS account.
     * Every account that takes booking payments needs one, otherwise its
     * events cannot be verified and bookings never auto-confirm.
     */
    webhookSecret: {
      type: String,
      default: '',
    },
    /** Filled in by "Test connection" — the acct_… these keys belong to. */
    stripeAccountRef: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isdeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

stripeAccountSchema.index(
  { label: 1 },
  { unique: true, partialFilterExpression: { isdeleted: false } }
);

/**
 * Keys for this account, validated against the currently active Stripe mode.
 * Keys of the wrong kind (live keys while STRIPE_TEST_MODE=true, or vice
 * versa) are returned empty so callers fall back to the platform default
 * rather than charging against the wrong environment.
 */
stripeAccountSchema.methods.keysForActiveMode = function keysForActiveMode() {
  const mode = isStripeTestMode() ? 'test' : 'live';
  return {
    secretKey: pickKeyForMode(this.secretKey, mode),
    publishableKey: pickKeyForMode(this.publishableKey, mode),
    webhookSecret: String(this.webhookSecret || '').trim(),
    mode,
  };
};

stripeAccountSchema.statics.findUsable = async function findUsable(accountId) {
  if (!accountId || !mongoose.Types.ObjectId.isValid(String(accountId))) return null;
  return this.findOne({ _id: accountId, isdeleted: false, isActive: true });
};

stripeAccountSchema.statics.listActive = async function listActive() {
  return this.find({ isdeleted: false, isActive: true }).sort({ label: 1 });
};

module.exports = mongoose.model('StripeAccount', stripeAccountSchema);
