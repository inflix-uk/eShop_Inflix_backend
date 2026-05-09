const mongoose = require('mongoose');

const userProductPriceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

userProductPriceSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('UserProductPrice', userProductPriceSchema);
