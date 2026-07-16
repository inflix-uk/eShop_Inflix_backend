const mongoose = require('mongoose');

/** Touch subdoc — same shape as Order.marketingAttribution touches. */
const touchSchema = {
  source: String,
  medium: String,
  campaign: String,
  content: String,
  term: String,
  referrer: String,
  referrerDomain: String,
  landingPage: String,
  capturedAt: Date,
};

/**
 * Visitor session for marketing analytics (no TTL — historical basis for reports).
 * `attribution` mirrors Order.marketingAttribution so Ad Performance can group
 * sessions by resolved platform + campaign (Zextons guide §3.4 / §5.4).
 */
const marketingVisitorSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 128,
    },
    visitorId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    landingPage: {
      type: String,
      maxlength: 2048,
      default: null,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'unknown'],
      default: null,
    },
    attribution: {
      schemaVersion: { type: Number, default: 1 },
      firstTouch: touchSchema,
      lastTouch: touchSchema,
      orderTouch: touchSchema,
      clickIds: {
        gclid: String,
        gbraid: String,
        wbraid: String,
        fbclid: String,
        msclkid: String,
        ttclid: String,
        oppref: String,
        fbc: String,
        fbp: String,
      },
      gaClientId: String,
      normalized: {
        source: String,
        medium: String,
        campaign: String,
        channel: String,
        sourceMedium: String,
      },
      consent: {
        analytics: Boolean,
        marketing: Boolean,
        capturedAt: Date,
      },
      capturedAt: Date,
    },
  },
  { timestamps: true }
);

marketingVisitorSessionSchema.index({ startedAt: -1 });
marketingVisitorSessionSchema.index({ lastSeenAt: -1 });
marketingVisitorSessionSchema.index(
  { 'attribution.normalized.campaign': 1, lastSeenAt: -1 },
  { sparse: true }
);
marketingVisitorSessionSchema.index(
  { 'attribution.clickIds.gclid': 1 },
  { sparse: true }
);

module.exports = mongoose.model('MarketingVisitorSession', marketingVisitorSessionSchema);
