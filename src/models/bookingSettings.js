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
    /** UI preference for slot interval field (canonical value is always minutes). */
    slotIntervalDisplayUnit: {
      type: String,
      enum: ['minutes', 'hours'],
      default: 'minutes',
    },
    holdDurationMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
    /** UI preference for hold duration field (canonical value is always minutes). */
    holdDurationDisplayUnit: {
      type: String,
      enum: ['minutes', 'hours'],
      default: 'minutes',
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
    /** UI preference for min advance field (canonical value is always hours; may be fractional). */
    minAdvanceDisplayUnit: {
      type: String,
      enum: ['minutes', 'hours'],
      default: 'hours',
    },
    maxAdvanceBookingDays: {
      type: Number,
      default: 60,
      min: 1,
    },
    metaTitle: {
      type: String,
      default: '',
      trim: true,
    },
    metaDescription: {
      type: String,
      default: '',
      trim: true,
    },
    metaSchema: {
      type: [String],
      default: [],
    },
    seoUpdatedAt: {
      type: Date,
      default: null,
    },
    pageContent: {
      hero: {
        badgeText: { type: String, default: '', trim: true },
        title: { type: String, default: '', trim: true },
        subtitle: { type: String, default: '', trim: true },
        statsEnabled: { type: Boolean, default: true },
        stat1Label: { type: String, default: '', trim: true },
        stat2Value: { type: String, default: '', trim: true },
        stat2Label: { type: String, default: '', trim: true },
        stat3Value: { type: String, default: '', trim: true },
        stat3Label: { type: String, default: '', trim: true },
        statsValueColor: { type: String, default: '', trim: true },
        statsLabelColor: { type: String, default: '', trim: true },
        statsBgColor: { type: String, default: '', trim: true },
      },
      services: {
        heading: { type: String, default: '', trim: true },
        subheading: { type: String, default: '', trim: true },
      },
      trust: {
        type: [
          {
            _id: false,
            title: { type: String, default: '', trim: true },
            description: { type: String, default: '', trim: true },
          },
        ],
        default: [],
      },
      customWidget: {
        enabled: { type: Boolean, default: false },
        html: { type: String, default: '', trim: true },
        css: { type: String, default: '', trim: true },
      },
    },
    pageContentUpdatedAt: {
      type: Date,
      default: null,
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
