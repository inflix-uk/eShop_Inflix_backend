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
