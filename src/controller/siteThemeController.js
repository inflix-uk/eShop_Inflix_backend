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

function typographyPayload(themeDoc) {
  const raw =
    themeDoc.typography && typeof themeDoc.typography.toObject === 'function'
      ? themeDoc.typography.toObject()
      : themeDoc.typography;
  return mergeStoredTypography(raw);
}

const siteThemeController = {
  async getThemeAdmin(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
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
          primaryColor: '#16a34a',
          secondaryColor: '#15803d',
          typography: mergeStoredTypography(null),
        },
      });
    }
  },

  /** Public: typography only (alias for storefronts that read `/api/theme`). */
  async getTypographyPublic(req, res) {
    try {
      const theme = await SiteTheme.getTheme();
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
      const primary = normalizeHex(req.body?.primaryColor);
      const secondary = normalizeHex(req.body?.secondaryColor);
      if (!primary || !secondary) {
        return res.status(400).json({
          success: false,
          message: 'primaryColor and secondaryColor must be valid #RRGGBB hex values',
        });
      }

      let theme = await SiteTheme.findOne();
      if (!theme) {
        theme = new SiteTheme({ primaryColor: primary, secondaryColor: secondary });
      } else {
        theme.primaryColor = primary;
        theme.secondaryColor = secondary;
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
