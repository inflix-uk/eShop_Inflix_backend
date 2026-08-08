const mongoose = require('mongoose');

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

function useEnvStripeKeys() {
  const flag = String(process.env.STRIPE_USE_ENV_KEYS || '').trim().toLowerCase();
  return flag === 'true' || flag === '1' || flag === 'yes';
}

// Get active keys for payment processing.
// Local: set STRIPE_USE_ENV_KEYS=true to force .env test keys (ignore MongoDB live keys).
// Production: leave unset so MongoDB / live keys are used.
stripeSettingsSchema.statics.getActiveKeys = async function() {
  const envSecret = process.env.STRIPE_SECRET_KEY || '';
  const envPublishable = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const envWebhook = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (useEnvStripeKeys()) {
    if (!envSecret || !envPublishable) {
      console.warn(
        '[stripe] STRIPE_USE_ENV_KEYS is enabled but STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY are missing in .env'
      );
    }
    return {
      secretKey: envSecret,
      publishableKey: envPublishable,
      webhookSecret: envWebhook,
      isFromDatabase: false,
      source: 'environment',
    };
  }

  const settings = await this.getSettings();

  return {
    secretKey: settings.secretKey || envSecret,
    publishableKey: settings.publishableKey || envPublishable,
    webhookSecret: settings.webhookSecret || envWebhook,
    isFromDatabase: !!(settings.secretKey && settings.publishableKey),
    source: settings.secretKey && settings.publishableKey ? 'database' : 'environment',
  };
};

module.exports = mongoose.model('StripeSettings', stripeSettingsSchema);
