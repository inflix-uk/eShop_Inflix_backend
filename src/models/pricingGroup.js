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

// `name` is already indexed by its `unique: true` field option above — no
// separate schema.index({ name: 1 }) needed (that caused a duplicate-index warning).

module.exports = mongoose.model('PricingGroup', pricingGroupSchema);
