const SiteTheme = require('../models/siteTheme');
const {
  sanitizeTypography,
  mergeStoredTypography,
} = require('../utils/typographyConstants');

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

const EMPTY_THEME_COLORS = {
  primaryColor: 'transparent',
  secondaryColor: 'transparent',
};

const siteThemeController = {
  async getThemeAdmin(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
      if (!theme) {
        return res.status(200).json({
          success: true,
          data: {
            ...EMPTY_THEME_COLORS,
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
            typography: mergeStoredTypography(null),
          },
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          primaryColor: theme.primaryColor,
          secondaryColor: theme.secondaryColor,
          typography: typographyPayload(theme),
        },
      });
    } catch (error) {
      console.error('Error fetching public site theme:', error);
      return res.status(200).json({
        success: true,
        data: {
          ...EMPTY_THEME_COLORS,
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
