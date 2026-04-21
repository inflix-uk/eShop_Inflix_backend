const mongoose = require('mongoose');

const checkoutLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    source: { type: String, enum: ['frontend', 'backend'], default: 'frontend', index: true },
    paymentIntentId: { type: String, index: true },
    orderNumber: { type: String, index: true },
    paymentMethodType: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('CheckoutLog', checkoutLogSchema);
