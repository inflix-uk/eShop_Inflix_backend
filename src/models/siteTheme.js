const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { typographySchema } = require('./typographyLevelSchema');

const siteThemeSchema = new Schema(
  {
    primaryColor: {
      type: String,
      default: '',
      trim: true,
    },
    secondaryColor: {
      type: String,
      default: '',
      trim: true,
    },
    bodyBgColor: {
      type: String,
      default: '',
      trim: true,
    },
    uiCustom: {
      booking: {
        serviceCardBgColor: {
          type: String,
          default: '',
          trim: true,
        },
      },
    },
    tagColors: {
      h1: { type: String, default: '', trim: true },
      h2: { type: String, default: '', trim: true },
      h3: { type: String, default: '', trim: true },
      h4: { type: String, default: '', trim: true },
      h5: { type: String, default: '', trim: true },
      h6: { type: String, default: '', trim: true },
      p: { type: String, default: '', trim: true },
      span: { type: String, default: '', trim: true },
    },
    typography: {
      type: typographySchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'sitewidecolor',
  }
);

/** Returns persisted theme or null — do not auto-create (avoids injecting default colors into DB). */
siteThemeSchema.statics.getTheme = async function getTheme() {
  return this.findOne();
};

module.exports = mongoose.model('SiteTheme', siteThemeSchema);
