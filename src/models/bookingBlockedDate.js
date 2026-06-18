const mongoose = require('mongoose');
const { BOOKING_PACKAGE_TYPES } = require('./bookingPackage');

const bookingBlockedDateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: BOOKING_PACKAGE_TYPES,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

bookingBlockedDateSchema.index({ type: 1, date: 1 });

module.exports = mongoose.model('BookingBlockedDate', bookingBlockedDateSchema);
