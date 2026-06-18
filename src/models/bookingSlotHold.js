const mongoose = require('mongoose');
const { BOOKING_PACKAGE_TYPES } = require('./bookingPackage');

const bookingSlotHoldSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingPackage',
      required: true,
    },
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
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'converted', 'expired', 'released'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
  },
  { timestamps: true }
);

bookingSlotHoldSchema.index({ type: 1, date: 1, startTime: 1 });
bookingSlotHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BookingSlotHold', bookingSlotHoldSchema);
