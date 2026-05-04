const { getEmailBranding, storefrontOriginForEmail } = require('../utils/emailBranding');

/**
 * Admin email template previews — same resolved values as transactional mail (`emailBranding.js`).
 */
async function getEmailBrandingForPreview(req, res) {
  try {
    const b = await getEmailBranding();
    return res.status(200).json({
      success: true,
      data: {
        logoUrl: b.logoUrl,
        logoAlt: b.logoAlt,
        storeUrl: storefrontOriginForEmail(),
        primaryHex: b.primaryHex,
        secondaryHex: b.secondaryHex,
        heroHeaderBg: b.heroHeaderBg,
        statusHeaderBg: b.statusHeaderBg,
        footerBg: b.footerBg,
        heroHighlightRgb: b.heroHighlightRgb,
        accentRgbCss: b.accentRgbCss,
        accentHex: b.accentHex,
        mintBg: b.mintBg,
        textDark: b.textDark,
        helpPanelBg: b.helpPanelBg,
        tradeInPanelBg: b.tradeInPanelBg,
        googleFontsHref: b.googleFontsHref,
        typo_h1: b.typo_h1,
        typo_h2: b.typo_h2,
        typo_h3: b.typo_h3,
        typo_p: b.typo_p,
      },
    });
  } catch (error) {
    console.error('emailBrandingPreview:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to load email branding',
    });
  }
}

module.exports = {
  getEmailBrandingForPreview,
};
