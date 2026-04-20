const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { typographySchema } = require('./typographyLevelSchema');

const siteThemeSchema = new Schema(
  {
    primaryColor: {
      type: String,
      default: '#16a34a',
      trim: true,
    },
    secondaryColor: {
      type: String,
      default: '#15803d',
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

siteThemeSchema.statics.getTheme = async function getTheme() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('SiteTheme', siteThemeSchema);
