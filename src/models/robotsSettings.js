const mongoose = require('mongoose');

const robotsSettingsSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RobotsSettings', robotsSettingsSchema);
