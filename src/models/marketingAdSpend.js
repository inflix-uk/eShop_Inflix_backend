const mongoose = require('mongoose');

const marketingAdSpendSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['google_ads'],
      default: 'google_ads',
      required: true,
    },
    campaign: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },
    /** UK reporting day stored as UTC instant (aligned with analytics date range). */
    spendDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'GBP',
      maxlength: 8,
    },
    source: {
      type: String,
      enum: ['manual', 'import'],
      default: 'import',
    },
    externalCampaignId: {
      type: String,
      maxlength: 128,
      default: null,
    },
  },
  { timestamps: true }
);

marketingAdSpendSchema.index({ platform: 1, spendDate: -1 });
marketingAdSpendSchema.index({ platform: 1, campaign: 1, spendDate: -1 });
marketingAdSpendSchema.index(
  { platform: 1, campaign: 1, spendDate: 1 },
  { unique: true }
);

module.exports = mongoose.model('MarketingAdSpend', marketingAdSpendSchema);
