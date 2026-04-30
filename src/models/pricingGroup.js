const mongoose = require('mongoose');

const pricingGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

pricingGroupSchema.index({ name: 1 });

module.exports = mongoose.model('PricingGroup', pricingGroupSchema);
