const mongoose = require('mongoose');

/** Global on/off for widget types site-wide (content blocks + singleton APIs). */
const siteWidgetSettingsSchema = new mongoose.Schema(
  {
    sliderEnabled: { type: Boolean, default: true },
    newsletterEnabled: { type: Boolean, default: true },
    faqEnabled: { type: Boolean, default: true },
    videoEnabled: { type: Boolean, default: true },
    mapEnabled: { type: Boolean, default: true },
    galleryEnabled: { type: Boolean, default: true },
    iconBoxEnabled: { type: Boolean, default: true },
    testimonialsEnabled: { type: Boolean, default: true },
    trustpilotWidgetEnabled: { type: Boolean, default: true },
    siteBannersEnabled: { type: Boolean, default: true },
    categoryCardsEnabled: { type: Boolean, default: true },
    promotionalSectionsEnabled: { type: Boolean, default: true },
    latestBlogsEnabled: { type: Boolean, default: true },
    htmlCssEnabled: { type: Boolean, default: true },
    contactUsEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteWidgetSettings', siteWidgetSettingsSchema);
