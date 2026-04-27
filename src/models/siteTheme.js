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
