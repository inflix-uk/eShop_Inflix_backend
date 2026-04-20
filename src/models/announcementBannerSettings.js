const mongoose = require('mongoose');

const announcementItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    message: { type: String, default: '', trim: true, maxlength: 2000 },
    linkUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    linkLabel: { type: String, default: '', trim: true, maxlength: 200 },
    backgroundColor: { type: String, default: '#0f172a', trim: true, maxlength: 32 },
    textColor: { type: String, default: '#ffffff', trim: true, maxlength: 32 },
    dismissible: { type: Boolean, default: true },
    /** true = CTA / link before message text */
    ctaFirst: { type: Boolean, default: false },
  },
  { _id: false }
);

const SOCIAL_KINDS = [
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'twitter',
  'github',
  'tiktok',
  'mail',
  'globe',
  'custom',
];

const announcementSocialLinkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    order: { type: Number, default: 0 },
    kind: { type: String, enum: SOCIAL_KINDS, default: 'globe' },
    url: { type: String, default: '', trim: true, maxlength: 2000 },
    /** Lucide icon name when kind === custom (e.g. message-circle) */
    customIcon: { type: String, default: '', trim: true, maxlength: 64 },
  },
  { _id: false }
);

/**
 * Top-of-site announcement(s). Multiple items rotate in a slider on the storefront.
 * Legacy root fields (enabled, message, …) may still exist on old documents until saved again.
 */
const announcementBannerSettingsSchema = new mongoose.Schema(
  {
    masterEnabled: { type: Boolean, default: true },
    items: { type: [announcementItemSchema], default: [] },
    socialLinks: { type: [announcementSocialLinkSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AnnouncementBannerSettings', announcementBannerSettingsSchema);
