const mongoose = require('mongoose');

const bookingSettingsSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: false,
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30,
      min: 5,
    },
    holdDurationMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
    timezone: {
      type: String,
      default: 'Europe/London',
      trim: true,
    },
    minAdvanceBookingHours: {
      type: Number,
      default: 2,
      min: 0,
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 60,
      min: 1,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

bookingSettingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ isEnabled: false });
  }
  return settings;
};

module.exports = mongoose.model('BookingSettings', bookingSettingsSchema);
