const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Single document: hero “Follow us” links (edited from Admin → Banners). */
const heroSocialSettingsSchema = new Schema(
  {
    followHeading: { type: String, default: '', trim: true },
    facebookUrl: { type: String, default: '', trim: true },
    twitterUrl: { type: String, default: '', trim: true },
    youtubeUrl: { type: String, default: '', trim: true },
    instagramUrl: { type: String, default: '', trim: true },
  },
  { timestamps: true, collection: 'herosocialsettings' }
);

module.exports =
  mongoose.models.HeroSocialSettings ||
  mongoose.model('HeroSocialSettings', heroSocialSettingsSchema);
