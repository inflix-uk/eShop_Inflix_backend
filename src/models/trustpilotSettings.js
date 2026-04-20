const mongoose = require('mongoose');

const trustpilotSettingsSchema = new mongoose.Schema({
  productPageTopScript: {
    type: String,
    default: ''
  },
  productPageScript: {
    type: String,
    default: ''
  },
  homePageScript: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save hook to update timestamps
trustpilotSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TrustpilotSettings', trustpilotSettingsSchema);
