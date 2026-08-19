const mongoose = require('mongoose');
const { isStripeTestMode, pickKeyForMode } = require('../utils/stripeMode');

const stripeSettingsSchema = new mongoose.Schema({
  secretKey: {
    type: String,
    default: ''
  },
  publishableKey: {
    type: String,
    default: ''
  },
  webhookSecret: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

// Ensure only one document exists (singleton pattern)
stripeSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Get active keys for payment processing.
// STRIPE_TEST_MODE=true  → .env sk_test_ / pk_test_ (local)
// STRIPE_TEST_MODE=false or unset → Admin / MongoDB live keys (production)
stripeSettingsSchema.statics.getActiveKeys = async function() {
  // Nodemon does not reload .env. Override so local test-key edits apply.
  if (isStripeTestMode()) {
    require('dotenv').config({ override: true });
  }

  const envSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  const envPublishable = String(process.env.STRIPE_PUBLISHABLE_KEY || '').trim();
  const envWebhook = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  const testMode = isStripeTestMode();

  if (testMode) {
    const secretKey = pickKeyForMode(envSecret, 'test');
    const publishableKey = pickKeyForMode(envPublishable, 'test');
    if (!secretKey || !publishableKey) {
      console.warn(
        '[stripe] STRIPE_TEST_MODE=true but .env is missing STRIPE_SECRET_KEY (sk_test_) and/or STRIPE_PUBLISHABLE_KEY (pk_test_)'
      );
    }
    return {
      secretKey,
      publishableKey,
      webhookSecret: envWebhook,
      isFromDatabase: false,
      source: 'environment',
      mode: 'test',
    };
  }

  const settings = await this.getSettings();
  const secretKey =
    pickKeyForMode(settings.secretKey, 'live') || pickKeyForMode(envSecret, 'live');
  const publishableKey =
    pickKeyForMode(settings.publishableKey, 'live') || pickKeyForMode(envPublishable, 'live');

  return {
    secretKey,
    publishableKey,
    webhookSecret: settings.webhookSecret || envWebhook,
    isFromDatabase: !!(settings.secretKey && settings.publishableKey),
    source: settings.secretKey && settings.publishableKey ? 'database' : 'environment',
    mode: 'live',
  };
};

module.exports = mongoose.model('StripeSettings', stripeSettingsSchema);
