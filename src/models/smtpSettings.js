const mongoose = require('mongoose');

const smtpSettingsSchema = new mongoose.Schema(
  {
    host: { type: String, default: '' },
    port: { type: Number, default: 465 },
    secure: { type: Boolean, default: true },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: '' },
    /** Receives internal "New order" notifications (separate from customer confirmation To). */
    orderNotifyEmail: { type: String, default: '' },
    /** Comma-separated CC addresses on the customer order-confirmation email only. */
    orderConfirmationCc: { type: String, default: '' },
    /** Comma-separated BCC addresses on the customer order-confirmation email. Empty uses TRUSTPILOT_BCC_EMAIL env or Trustpilot default. */
    orderConfirmationBcc: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smtpSettingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SmtpSettings', smtpSettingsSchema);
