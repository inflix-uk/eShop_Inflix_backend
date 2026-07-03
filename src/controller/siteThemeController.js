const SiteTheme = require('../models/siteTheme');
const {
  sanitizeTypography,
  mergeStoredTypography,
} = require('../utils/typographyConstants');
const {
  sanitizeTagColors,
  tagColorsAdminPayload,
  tagColorsPublicPayload,
  DEFAULT_TAG_COLORS,
} = require('../utils/tagColorsConstants');

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  if (HEX6.test(v)) return v.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

/** `''` = no tint (transparent); `#rrggbb` = valid hex; `null` = invalid non-empty input. */
function parseStoredColor(input) {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  if (!v || v.toLowerCase() === 'transparent') return '';
  const hex = normalizeHex(v);
  return hex === null ? null : hex;
}

function typographyPayload(themeDoc) {
  const raw =
    themeDoc.typography && typeof themeDoc.typography.toObject === 'function'
      ? themeDoc.typography.toObject()
      : themeDoc.typography;
  return mergeStoredTypography(raw);
}

const DEFAULT_BODY_BG = '#ffffff';

const EMPTY_THEME_COLORS = {
  primaryColor: 'transparent',
  secondaryColor: 'transparent',
  bodyBgColor: '',
};

const EMPTY_UI_CUSTOM = {
  booking: {
    serviceCardBgColor: '',
  },
};

const EMPTY_TAG_COLORS_ADMIN = {
  h1: '',
  h2: '',
  h3: '',
  h4: '',
  h5: '',
  h6: '',
  p: '',
  span: '',
};

function publicBookingServiceCardBg(themeDoc) {
  const stored = themeDoc?.uiCustom?.booking?.serviceCardBgColor;
  return publicBodyBgColor(stored);
}

function themeUiCustomPayload(themeDoc) {
  return {
    booking: {
      serviceCardBgColor: publicBookingServiceCardBg(themeDoc),
    },
  };
}

/** `''` = storefront default white; `#rrggbb` = valid hex; `null` = invalid non-empty input. */
function parseBodyBgColor(input) {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  if (!v) return '';
  const hex = normalizeHex(v);
  return hex === null ? null : hex;
}

function publicBodyBgColor(stored) {
  const v = typeof stored === 'string' ? stored.trim() : '';
  if (!v) return '';
  return normalizeHex(v) || '';
}

const siteThemeController = {
  async getThemeAdmin(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
      if (!theme) {
        return res.status(200).json({
          success: true,
          data: {
            ...EMPTY_THEME_COLORS,
            uiCustom: EMPTY_UI_CUSTOM,
            tagColors: EMPTY_TAG_COLORS_ADMIN,
            typography: mergeStoredTypography(null),
            updatedAt: null,
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          bodyBgColor: publicBodyBgColor(theme.bodyBgColor),
          uiCustom: themeUiCustomPayload(theme),
          tagColors: tagColorsAdminPayload(theme),
          typography: typographyPayload(theme),
          updatedAt: theme.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error fetching site theme:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch site theme',
      });
    }
  },

  async getThemePublic(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
      if (!theme) {
        return res.status(200).json({
          success: true,
          data: {
            ...EMPTY_THEME_COLORS,
            uiCustom: EMPTY_UI_CUSTOM,
            tagColors: mergeStoredTagColors(null),
            typography: mergeStoredTypography(null),
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          bodyBgColor: publicBodyBgColor(theme.bodyBgColor),
          uiCustom: themeUiCustomPayload(theme),
          tagColors: tagColorsPublicPayload(theme),
          typography: typographyPayload(theme),
        },
      });
    } catch (error) {
      console.error('Error fetching public site theme:', error);
      return res.status(200).json({
        success: true,
        data: {
          ...EMPTY_THEME_COLORS,
          uiCustom: EMPTY_UI_CUSTOM,
          tagColors: mergeStoredTagColors(null),
          typography: mergeStoredTypography(null),
        },
      });
    }
  },

  /** Public: typography only (alias for storefronts that read `/api/theme`). */
  async getTypographyPublic(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
      if (!theme) {
        return res.status(200).json({
          success: true,
          data: { typography: mergeStoredTypography(null) },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          typography: typographyPayload(theme),
        },
      });
    } catch (error) {
      console.error('Error fetching typography theme:', error);
      return res.status(200).json({
        success: true,
        data: { typography: mergeStoredTypography(null) },
      });
    }
  },

  /** Admin: update body background color only (validated). */
  async updateBodyBackground(req, res) {
    try {
      const parsed = parseBodyBgColor(String(req.body?.bodyBgColor ?? ''));
      if (parsed === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid body background color. Use #RRGGBB hex or leave empty for default white.',
        });
      }

      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({});
      }
      theme.bodyBgColor = parsed === DEFAULT_BODY_BG ? '' : parsed;
      if (!theme.typography || Object.keys(theme.typography || {}).length === 0) {
        theme.typography = mergeStoredTypography(null);
      }
      await theme.save();

      return res.status(200).json({
        success: true,
        message: 'Body background saved',
        data: {
          bodyBgColor: publicBodyBgColor(theme.bodyBgColor),
          updatedAt: theme.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving body background:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save body background',
      });
    }
  },

  /** Admin: update booking module UI colors. */
  async updateBookingUi(req, res) {
    try {
      const parsed = parseBodyBgColor(String(req.body?.serviceCardBgColor ?? ''));
      if (parsed === null) {
        return res.status(400).json({
          success: false,
          message: 'Invalid service card color. Use #RRGGBB hex or leave empty for default white.',
        });
      }

      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({});
      }
      if (!theme.uiCustom) theme.uiCustom = {};
      if (!theme.uiCustom.booking) theme.uiCustom.booking = {};
      theme.uiCustom.booking.serviceCardBgColor = parsed === DEFAULT_BODY_BG ? '' : parsed;
      if (!theme.typography || Object.keys(theme.typography || {}).length === 0) {
        theme.typography = mergeStoredTypography(null);
      }
      theme.markModified('uiCustom');
      await theme.save();

      return res.status(200).json({
        success: true,
        message: 'Booking UI colors saved',
        data: {
          uiCustom: themeUiCustomPayload(theme),
          updatedAt: theme.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving booking UI colors:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save booking UI colors',
      });
    }
  },

  /** Admin: update typography only (validated). */
  async updateTypography(req, res) {
    try {
      const nextTypography = sanitizeTypography(req.body);
      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({});
      }
      theme.typography = nextTypography;
      await theme.save();

      return res.status(200).json({
        success: true,
        message: 'Typography saved',
        data: { typography: typographyPayload(theme), updatedAt: theme.updatedAt },
      });
    } catch (error) {
      console.error('Error saving typography:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save typography',
      });
    }
  },

  /** Admin: global h1–h6, p text colors. */
  async updateTagColors(req, res) {
    try {
      const nextTagColors = sanitizeTagColors(req.body);
      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({});
      }

      if (!theme.tagColors) theme.tagColors = {};
      for (const key of Object.keys(DEFAULT_TAG_COLORS)) {
        const incoming = nextTagColors[key];
        const storedDefault = DEFAULT_TAG_COLORS[key];
        theme.tagColors[key] =
          incoming === storedDefault ? '' : incoming;
      }
      if (!theme.typography || Object.keys(theme.typography || {}).length === 0) {
        theme.typography = mergeStoredTypography(null);
      }
      theme.markModified('tagColors');
      await theme.save();

      return res.status(200).json({
        success: true,
        message: 'Tag colors saved',
        data: {
          tagColors: tagColorsAdminPayload(theme),
          updatedAt: theme.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving tag colors:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save tag colors',
      });
    }
  },

  async saveTheme(req, res) {
    try {
      const primary = parseStoredColor(String(req.body?.primaryColor ?? ''));
      const secondary = parseStoredColor(String(req.body?.secondaryColor ?? ''));
      if (primary === null || secondary === null) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid color. Use #RRGGBB hex for both, or set both to transparent / empty to remove site tint.',
        });
      }

      const clearing = primary === '' && secondary === '';
      if (!clearing && (!primary || !secondary)) {
        return res.status(400).json({
          success: false,
          message:
            'Set both colors to valid #RRGGBB, or set both to transparent to remove site tint.',
        });
      }

      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({
          primaryColor: clearing ? '' : primary,
          secondaryColor: clearing ? '' : secondary,
        });
      } else {
        theme.primaryColor = clearing ? '' : primary;
        theme.secondaryColor = clearing ? '' : secondary;
      }
      if (!theme.typography || Object.keys(theme.typography || {}).length === 0) {
        theme.typography = mergeStoredTypography(null);
      }
      await theme.save();

      return res.status(200).json({
        success: true,
        message: 'Site colors saved',
        data: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          typography: typographyPayload(theme),
          updatedAt: theme.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving site theme:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to save site theme',
      });
    }
  },
};

module.exports = siteThemeController;
