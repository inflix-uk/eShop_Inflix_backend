const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Singleton: admin overrides for order confirmation + order status email copy.
 */
const orderEmailTemplateSettingsSchema = new Schema(
  {
    /** Prefix for new order numbers, e.g. Z → Z20260001. Editable under admin Email templates. */
    orderNumberPrefix: { type: String, default: 'Z', trim: true },
    orderConfirmation: { type: Schema.Types.Mixed, default: {} },
    orderStatusCustomer: { type: Schema.Types.Mixed, default: {} },
    orderStatusAdmin: { type: Schema.Types.Mixed, default: {} },
    orderShippedCustomer: { type: Schema.Types.Mixed, default: {} },
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
