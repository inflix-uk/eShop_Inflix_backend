const mongoose = require('mongoose');

const navbarVariantTestSchema = new mongoose.Schema(
  {
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** Map of `layoutId::variantSlug` → full config snapshot (admin hub keeps all presets). */
    presets: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'navbarvarianttest',
  }
);

module.exports = mongoose.model('NavbarVariantTest', navbarVariantTestSchema);
