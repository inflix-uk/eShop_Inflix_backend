const mongoose = require('mongoose');

const pricingGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    /** Products unchecked in admin — group prices do not apply for this group. */
    excludedProductIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
    },
  },
  { timestamps: true }
);

pricingGroupSchema.index({ name: 1 });

module.exports = mongoose.model('PricingGroup', pricingGroupSchema);
