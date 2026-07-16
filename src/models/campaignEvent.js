const mongoose = require('mongoose');

/**
 * Append-only campaign click log (guide §5.3).
 * Feeds Campaign Analytics: link clicks → visitors → conversions.
 */
const campaignEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['click'],
      default: 'click',
      required: true,
    },
    visitorId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 128,
      default: null,
    },
    utmSource: { type: String, trim: true, maxlength: 120, default: null },
    utmMedium: { type: String, trim: true, maxlength: 120, default: null },
    utmCampaign: { type: String, trim: true, maxlength: 200, default: null },
    utmTerm: { type: String, trim: true, maxlength: 200, default: null },
    utmContent: { type: String, trim: true, maxlength: 200, default: null },
    utmId: { type: String, trim: true, maxlength: 128, default: null },
    landingPage: { type: String, trim: true, maxlength: 2048, default: null },
    referrer: { type: String, trim: true, maxlength: 2048, default: null },
    deviceType: { type: String, trim: true, maxlength: 32, default: null },
    userAgent: { type: String, trim: true, maxlength: 512, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

campaignEventSchema.index({ createdAt: -1 });
campaignEventSchema.index({ utmCampaign: 1, createdAt: -1 });
campaignEventSchema.index({ utmMedium: 1, utmCampaign: 1, createdAt: -1 });
campaignEventSchema.index({ utmTerm: 1, createdAt: -1 });
campaignEventSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('CampaignEvent', campaignEventSchema);
