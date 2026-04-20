const mongoose = require("mongoose");

const { Schema } = mongoose;

/**
 * Singleton: admin overrides for newsletter welcome + Hot UK Deals emails.
 * welcome / hotUkDeals: partial objects merged over defaults in code.
 */
const newsletterEmailTemplateSettingsSchema = new Schema(
  {
    welcome: { type: Schema.Types.Mixed, default: {} },
    hotUkDeals: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: "newsletter_email_template_settings",
  }
);

newsletterEmailTemplateSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model(
  "NewsletterEmailTemplateSettings",
  newsletterEmailTemplateSettingsSchema
);
