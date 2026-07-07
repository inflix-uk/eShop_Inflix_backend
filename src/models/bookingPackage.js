const mongoose = require('mongoose');

const BOOKING_PACKAGE_TYPES = ['service', 'consultation', 'studio'];

const bookingPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      default: null,
    },
    type: {
      type: String,
      enum: BOOKING_PACKAGE_TYPES,
      required: true,
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    detailPage: {
      type: String,
      default: '',
    },
    features: {
      type: [String],
      default: [],
    },
    extras: {
      type: [
        {
          image: { type: String, default: '' },
          title: { type: String, default: '', trim: true },
          price: { type: Number, default: 0, min: 0 },
          description: { type: String, default: '', trim: true },
        },
      ],
      default: [],
    },
    image: {
      type: String,
      default: null,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    /** Only one package should have this true — shown as top badge on booking card. */
    highlightBadgeEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    highlightBadgeText: {
      type: String,
      default: 'Most Popular',
      trim: true,
    },
    highlightBadgeUrl: {
      type: String,
      default: '',
      trim: true,
    },
    isdeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

bookingPackageSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' }, isdeleted: false } });

module.exports = mongoose.model('BookingPackage', bookingPackageSchema);
module.exports.BOOKING_PACKAGE_TYPES = BOOKING_PACKAGE_TYPES;
