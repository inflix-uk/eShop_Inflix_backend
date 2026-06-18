const mongoose = require('mongoose');
const { BOOKING_PACKAGE_TYPES } = require('./bookingPackage');

const bookingAvailabilitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: BOOKING_PACKAGE_TYPES,
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bookingAvailabilitySchema.index({ type: 1, dayOfWeek: 1 });

module.exports = mongoose.model('BookingAvailability', bookingAvailabilitySchema);
