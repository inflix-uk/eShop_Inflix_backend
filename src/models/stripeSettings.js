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

// Get active keys for payment processing (with fallback to env vars)
stripeSettingsSchema.statics.getActiveKeys = async function() {
  const settings = await this.getSettings();

  return {
    secretKey: settings.secretKey || process.env.STRIPE_SECRET_KEY || '',
    publishableKey: settings.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: settings.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
    isFromDatabase: !!(settings.secretKey && settings.publishableKey)
  };
};

module.exports = mongoose.model('StripeSettings', stripeSettingsSchema);
