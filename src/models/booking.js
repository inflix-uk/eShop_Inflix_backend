const mongoose = require('mongoose');
const { BOOKING_PACKAGE_TYPES } = require('./bookingPackage');

const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
const PAYMENT_STATUSES = ['unpaid', 'paid', 'failed', 'refunded'];
const BOOKING_SOURCES = ['online', 'admin'];

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, default: '', trim: true },
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
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'unpaid',
      index: true,
    },
    paymentDetails: {
      type: Object,
      default: null,
    },
    stripePaymentIntentId: {
      type: String,
      default: null,
    },
    holdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookingSlotHold',
      default: null,
    },
    bookingGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    groupBookingNumber: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: BOOKING_SOURCES,
      default: 'online',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: '',
      trim: true,
    },
    extras: {
      type: [
        {
          image: { type: String, default: '' },
          title: { type: String, default: '', trim: true },
          price: { type: Number, default: 0, min: 0 },
          description: { type: String, default: '', trim: true },
          quantity: { type: Number, default: 1, min: 1 },
        },
      ],
      default: [],
    },
    extrasSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    slotsSubtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    isdeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ date: 1, startTime: 1, status: 1, type: 1 });
bookingSchema.index(
  { type: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed'] },
      isdeleted: false,
    },
    name: 'unique_active_booking_slot',
  }
);
bookingSchema.index({ holdId: 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'customer.email': 1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.BOOKING_SOURCES = BOOKING_SOURCES;
