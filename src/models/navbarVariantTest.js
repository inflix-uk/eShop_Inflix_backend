const mongoose = require('mongoose');

const navbarVariantTestSchema = new mongoose.Schema(
  {
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'navbarvarianttest',
  }
);

module.exports = mongoose.model('NavbarVariantTest', navbarVariantTestSchema);
