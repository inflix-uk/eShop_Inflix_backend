const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

marketingVisitorSessionSchema.index({ startedAt: -1 });

module.exports = mongoose.model('MarketingVisitorSession', marketingVisitorSessionSchema);
