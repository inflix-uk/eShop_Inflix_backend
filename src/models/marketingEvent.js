const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: null },
    name: { type: String, default: null },
    price: { type: Number, default: null },
    quantity: { type: Number, default: null },
  },
  { _id: false }
);

const marketingEventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    enum: ['page_view', 'add_to_cart', 'begin_checkout', 'purchase'],
    index: true,
  },
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sessionId: { type: String, default: null, index: true },
  visitorId: { type: String, default: null, index: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  path: { type: String, default: null },
  pageTitle: { type: String, default: null },
  platform: { type: String, default: null },
  source: { type: String, default: null },
  medium: { type: String, default: null },
  campaign: { type: String, default: null },
  channel: { type: String, default: null },
  value: { type: Number, default: null },
  currency: { type: String, default: 'GBP' },
  orderNumber: { type: String, default: null },
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet', 'unknown'],
    default: 'unknown',
  },
  items: { type: [lineItemSchema], default: [] },
  userData: {
    emailSha256: { type: String, default: null },
    phoneSha256: { type: String, default: null },
  },
  clickIds: {
    gclid: String,
    fbclid: String,
    msclkid: String,
    ttclid: String,
  },
});

marketingEventSchema.index({ occurredAt: 1, eventName: 1 });

module.exports = mongoose.model('MarketingEvent', marketingEventSchema);
