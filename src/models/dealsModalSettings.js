const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** Singleton: Hot UK Deals / Black Friday style modal shown on the storefront */
const dealsModalSettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    openDelayMs: { type: Number, default: 10000 },
    countdownEndsAt: { type: Date },
    discountCode: { type: String, default: 'HOTDEALS', trim: true },
    collapsedBannerText: { type: String, trim: true },
    badgeText: { type: String, trim: true },
    headline: { type: String, trim: true },
    descriptionPrimary: { type: String, trim: true },
    descriptionSecondary: { type: String, trim: true },
    countdownLabel: { type: String, trim: true },
    emailPlaceholder: { type: String, trim: true },
    submitButtonText: { type: String, trim: true },
    successSubscribeMessage: { type: String, trim: true },
    discountViewSuccessBadge: { type: String, trim: true },
    discountViewHeadline: { type: String, trim: true },
    discountViewDescription: { type: String, trim: true },
    discountViewLabel: { type: String, trim: true },
    discountViewThankYou: { type: String, trim: true },
    privacyDisclaimerText: { type: String, trim: true },
    copyCodeButtonText: { type: String, trim: true },
    copiedButtonText: { type: String, trim: true },
    rightPanelImageAlt: { type: String, trim: true },
    bannerImageUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DealsModalSettings', dealsModalSettingsSchema);
