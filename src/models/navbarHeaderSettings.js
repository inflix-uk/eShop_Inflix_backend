const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** Singleton: header “Need help?” phone + optional support email (storefront) */
const navbarHeaderSettingsSchema = new Schema(
  {
    supportPhone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 40,
    },
    supportEmail: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NavbarHeaderSettings', navbarHeaderSettingsSchema);
