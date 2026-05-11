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
    /** Empty string = product-level override; non-empty = per-variant (see utils/pricingVariantKey). */
    variantKey: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true }
);

groupProductPriceSchema.index({ groupId: 1, productId: 1, variantKey: 1 }, { unique: true });

module.exports = mongoose.model('GroupProductPrice', groupProductPriceSchema);
