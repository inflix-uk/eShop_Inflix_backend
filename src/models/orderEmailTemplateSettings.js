const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Singleton: admin overrides for order confirmation + order status email copy.
 */
const orderEmailTemplateSettingsSchema = new Schema(
  {
    orderConfirmation: { type: Schema.Types.Mixed, default: {} },
    orderStatusCustomer: { type: Schema.Types.Mixed, default: {} },
    orderStatusAdmin: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'order_email_template_settings',
  }
);

orderEmailTemplateSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.model('OrderEmailTemplateSettings', orderEmailTemplateSettingsSchema);
