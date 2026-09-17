const mongoose = require('mongoose');

const marketingOfflineOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      trim: true,
      maxlength: 64,
      default: null,
    },
    orderDate: {
      type: Date,
      required: true,
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },
    channel: {
      type: String,
      enum: ['phone', 'in_store', 'marketplace', 'wholesale', 'other'],
      default: 'other',
    },
    customerName: {
      type: String,
      maxlength: 200,
      default: null,
    },
    customerEmail: {
      type: String,
      maxlength: 320,
      default: null,
    },
    notes: {
      type: String,
      maxlength: 2000,
      default: null,
    },
    currency: {
      type: String,
      default: 'GBP',
      maxlength: 8,
    },
    source: {
      type: String,
      enum: ['manual', 'import'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

marketingOfflineOrderSchema.index({ orderDate: -1 });
marketingOfflineOrderSchema.index({ channel: 1, orderDate: -1 });
marketingOfflineOrderSchema.index(
  { orderNumber: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('MarketingOfflineOrder', marketingOfflineOrderSchema);
