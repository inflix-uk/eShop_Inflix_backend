const mongoose = require('mongoose');

const groupProductPriceSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PricingGroup',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true }
);

groupProductPriceSchema.index({ groupId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('GroupProductPrice', groupProductPriceSchema);
