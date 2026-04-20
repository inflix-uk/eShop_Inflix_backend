const SiteWidgetSettings = require('../models/siteWidgetSettings');

function serialize(doc) {
  if (!doc) {
    return {
      sliderEnabled: true,
      newsletterEnabled: true,
      faqEnabled: true,
      videoEnabled: true,
      mapEnabled: true,
      galleryEnabled: true,
      iconBoxEnabled: true,
      testimonialsEnabled: true,
      trustpilotWidgetEnabled: true,
      siteBannersEnabled: true,
      categoryCardsEnabled: true,
      promotionalSectionsEnabled: true,
      latestBlogsEnabled: true,
      htmlCssEnabled: true,
      updatedAt: null,
    };
  }
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    sliderEnabled: o.sliderEnabled !== false,
    newsletterEnabled: o.newsletterEnabled !== false,
    faqEnabled: o.faqEnabled !== false,
    videoEnabled: o.videoEnabled !== false,
    mapEnabled: o.mapEnabled !== false,
    galleryEnabled: o.galleryEnabled !== false,
    iconBoxEnabled: o.iconBoxEnabled !== false,
    testimonialsEnabled: o.testimonialsEnabled !== false,
    trustpilotWidgetEnabled: o.trustpilotWidgetEnabled !== false,
    siteBannersEnabled: o.siteBannersEnabled !== false,
    categoryCardsEnabled: o.categoryCardsEnabled !== false,
    promotionalSectionsEnabled: o.promotionalSectionsEnabled !== false,
    latestBlogsEnabled: o.latestBlogsEnabled !== false,
    htmlCssEnabled: o.htmlCssEnabled !== false,
    updatedAt: o.updatedAt || null,
  };
}

/**
 * Used by public site and other controllers. Defaults to all enabled if no document.
 */
async function getEffectiveSettings() {
  const doc = await SiteWidgetSettings.findOne().lean();
  if (!doc) {
    return {
      sliderEnabled: true,
      newsletterEnabled: true,
      faqEnabled: true,
      videoEnabled: true,
      mapEnabled: true,
      galleryEnabled: true,
      iconBoxEnabled: true,
      testimonialsEnabled: true,
      trustpilotWidgetEnabled: true,
      siteBannersEnabled: true,
      categoryCardsEnabled: true,
      promotionalSectionsEnabled: true,
      latestBlogsEnabled: true,
      htmlCssEnabled: true,
    };
  }
  return {
    sliderEnabled: doc.sliderEnabled !== false,
    newsletterEnabled: doc.newsletterEnabled !== false,
    faqEnabled: doc.faqEnabled !== false,
    videoEnabled: doc.videoEnabled !== false,
    mapEnabled: doc.mapEnabled !== false,
    galleryEnabled: doc.galleryEnabled !== false,
    iconBoxEnabled: doc.iconBoxEnabled !== false,
    testimonialsEnabled: doc.testimonialsEnabled !== false,
    trustpilotWidgetEnabled: doc.trustpilotWidgetEnabled !== false,
    siteBannersEnabled: doc.siteBannersEnabled !== false,
    categoryCardsEnabled: doc.categoryCardsEnabled !== false,
    promotionalSectionsEnabled: doc.promotionalSectionsEnabled !== false,
    latestBlogsEnabled: doc.latestBlogsEnabled !== false,
    htmlCssEnabled: doc.htmlCssEnabled !== false,
  };
}

const getSiteWidgetSettingsPublic = async (req, res) => {
  try {
    const doc = await SiteWidgetSettings.findOne().lean();
    return res.status(200).json({
      success: true,
      data: serialize(doc),
    });
  } catch (error) {
    console.error('getSiteWidgetSettingsPublic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load widget settings',
    });
  }
};

const getSiteWidgetSettingsAdmin = async (req, res) => {
  try {
    const doc = await SiteWidgetSettings.findOne().lean();
    return res.status(200).json({
      success: true,
      data: serialize(doc),
    });
  } catch (error) {
    console.error('getSiteWidgetSettingsAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load widget settings',
    });
  }
};

const putSiteWidgetSettings = async (req, res) => {
  try {
    const {
      sliderEnabled,
      newsletterEnabled,
      faqEnabled,
      videoEnabled,
      mapEnabled,
      galleryEnabled,
      iconBoxEnabled,
      testimonialsEnabled,
      trustpilotWidgetEnabled,
      siteBannersEnabled,
      categoryCardsEnabled,
      promotionalSectionsEnabled,
      latestBlogsEnabled,
      htmlCssEnabled,
    } = req.body || {};

    const set = {};
    if (typeof sliderEnabled === 'boolean') {
      set.sliderEnabled = sliderEnabled;
    }
    if (typeof newsletterEnabled === 'boolean') {
      set.newsletterEnabled = newsletterEnabled;
    }
    if (typeof faqEnabled === 'boolean') {
      set.faqEnabled = faqEnabled;
    }
    if (typeof videoEnabled === 'boolean') {
      set.videoEnabled = videoEnabled;
    }
    if (typeof mapEnabled === 'boolean') {
      set.mapEnabled = mapEnabled;
    }
    if (typeof galleryEnabled === 'boolean') {
      set.galleryEnabled = galleryEnabled;
    }
    if (typeof iconBoxEnabled === 'boolean') {
      set.iconBoxEnabled = iconBoxEnabled;
    }
    if (typeof testimonialsEnabled === 'boolean') {
      set.testimonialsEnabled = testimonialsEnabled;
    }
    if (typeof trustpilotWidgetEnabled === 'boolean') {
      set.trustpilotWidgetEnabled = trustpilotWidgetEnabled;
    }
    if (typeof siteBannersEnabled === 'boolean') {
      set.siteBannersEnabled = siteBannersEnabled;
    }
    if (typeof categoryCardsEnabled === 'boolean') {
      set.categoryCardsEnabled = categoryCardsEnabled;
    }
    if (typeof promotionalSectionsEnabled === 'boolean') {
      set.promotionalSectionsEnabled = promotionalSectionsEnabled;
    }
    if (typeof latestBlogsEnabled === 'boolean') {
      set.latestBlogsEnabled = latestBlogsEnabled;
    }
    if (typeof htmlCssEnabled === 'boolean') {
      set.htmlCssEnabled = htmlCssEnabled;
    }

    if (Object.keys(set).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'Provide at least one boolean: sliderEnabled, newsletterEnabled, faqEnabled, videoEnabled, mapEnabled, galleryEnabled, iconBoxEnabled, testimonialsEnabled, trustpilotWidgetEnabled, siteBannersEnabled, categoryCardsEnabled, promotionalSectionsEnabled, latestBlogsEnabled, htmlCssEnabled',
      });
    }

    const doc = await SiteWidgetSettings.findOneAndUpdate(
      {},
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Widget visibility updated',
      data: serialize(doc),
    });
  } catch (error) {
    console.error('putSiteWidgetSettings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update widget settings',
      error: error.message,
    });
  }
};

module.exports = {
  getSiteWidgetSettingsPublic,
  getSiteWidgetSettingsAdmin,
  putSiteWidgetSettings,
  getEffectiveSettings,
};
