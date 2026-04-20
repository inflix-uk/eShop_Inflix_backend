const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
