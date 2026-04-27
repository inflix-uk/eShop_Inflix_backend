const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** Singleton: header “Need help?” phone shown on storefront navbar */
const navbarHeaderSettingsSchema = new Schema(
  {
    supportPhone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 40,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NavbarHeaderSettings', navbarHeaderSettingsSchema);
