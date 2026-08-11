const mongoose = require('mongoose');

const BOOKING_PACKAGE_TYPES = ['service', 'consultation', 'studio', 'editing'];

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
    /** How admins entered/display duration in UI — canonical storage stays durationMinutes. */
    durationDisplayUnit: {
      type: String,
      enum: ['minutes', 'hours'],
      default: 'minutes',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Microphones included with this package (studio hire). */
    includedMics: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Custom line under price on booking cards (e.g. "2 mics included, up to 5"). */
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    /** Max guest chips on the booking flow (1–9). */
    maxGuests: {
      type: Number,
      default: 5,
      min: 1,
      max: 9,
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
    /** HTML content for the detail page widget */
    detailPageHtml: {
      type: String,
      default: '',
    },
    /** CSS styles for the detail page widget (scoped) */
    detailPageCss: {
      type: String,
      default: '',
    },
    features: {
      type: [String],
      default: [],
    },
    /** Booking flow sidebar — "What happens next" (per package). */
    whatHappensNext: {
      heading: { type: String, default: 'What happens next', trim: true },
      listStyle: {
        type: String,
        enum: ['numbered', 'bullets'],
        default: 'numbered',
      },
      items: {
        type: [String],
        default: [
          'Confirmation and calendar invite by email straight away.',
          'Free parking at the back of the studio — no app, no permit.',
          'Arrive 5 minutes early. The room is already rigged and tested.',
          'Leave with your raw files. Free reschedule up to 72 hrs before.',
        ],
      },
    },
    extras: {
      type: [
        {
          image: { type: String, default: '' },
          title: { type: String, default: '', trim: true },
          price: { type: Number, default: 0, min: 0 },
          description: { type: String, default: '', trim: true },
          /** When true, storefront shows +/- quantity instead of Add toggle. */
          quantityEnabled: { type: Boolean, default: false },
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
    bundleBenefits: {
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
