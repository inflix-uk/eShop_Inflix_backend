const NavbarVariantTest = require('../models/navbarVariantTest');
const crypto = require('crypto');

function presetKeyFromConfig(config) {
  const id = String(config?.id || '').trim();
  const variant = String(config?.variant || '').trim();
  if (!id || !variant) return null;
  return `${id}::${variant}`;
}

function normalizePresets(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...raw };
}

/** Logo is managed in Logo Management — never persist navbar-local logoUrl. */
function withoutNavbarLogoOverride(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return config;
  return { ...config, logoUrl: '' };
}

function sanitizePresets(presets) {
  const normalized = normalizePresets(presets);
  const next = {};
  for (const [key, value] of Object.entries(normalized)) {
    next[key] = withoutNavbarLogoOverride(value);
  }
  return next;
}

const getNavbarVariantTestPublic = async (req, res) => {
  try {
    const doc = await NavbarVariantTest.findOne().lean();
    return res.status(200).json({
      success: true,
      data: {
        config: withoutNavbarLogoOverride(doc?.config || null),
        updatedAt: doc?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error fetching navbar variant test:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch navbar variant test',
    });
  }
};

const getNavbarVariantTestAdmin = async (req, res) => {
  try {
    const doc = await NavbarVariantTest.findOne().lean();
    return res.status(200).json({
      success: true,
      data: {
        config: withoutNavbarLogoOverride(doc?.config || null),
        presets: sanitizePresets(doc?.presets),
        updatedAt: doc?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error fetching navbar variant test (admin):', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch navbar variant test',
    });
  }
};

const putNavbarVariantTest = async (req, res) => {
  try {
    const config = req.body?.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({
        success: false,
        message: 'config object is required',
      });
    }

    const presetKey = presetKeyFromConfig(config);
    if (!presetKey) {
      return res.status(400).json({
        success: false,
        message: 'config.id and config.variant are required',
      });
    }

    const sanitizedConfig = withoutNavbarLogoOverride(config);

    const existing = await NavbarVariantTest.findOne().lean();
    let presets = sanitizePresets(existing?.presets);
    const legacyKey = presetKeyFromConfig(existing?.config);
    if (Object.keys(presets).length === 0 && legacyKey && existing?.config) {
      presets[legacyKey] = withoutNavbarLogoOverride(existing.config);
    }
    presets[presetKey] = sanitizedConfig;

    const doc = await NavbarVariantTest.findOneAndUpdate(
      {},
      { config: sanitizedConfig, presets },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Navbar variant test config saved',
      data: {
        config: withoutNavbarLogoOverride(doc?.config || null),
        presets: sanitizePresets(doc?.presets),
        updatedAt: doc?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error saving navbar variant test:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save navbar variant test',
    });
  }
};

const PREVIEW_DRAFT_TTL_MS = 30 * 60 * 1000;

const putNavbarVariantTestPreviewDraft = async (req, res) => {
  try {
    const config = req.body?.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({
        success: false,
        message: 'config object is required',
      });
    }

    const presetKey = presetKeyFromConfig(config);
    if (!presetKey) {
      return res.status(400).json({
        success: false,
        message: 'config.id and config.variant are required',
      });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + PREVIEW_DRAFT_TTL_MS);
    const previewConfig = { ...config };

    await NavbarVariantTest.findOneAndUpdate(
      {},
      {
        previewDraft: {
          token,
          config: previewConfig,
          expiresAt,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Preview draft ready',
      data: {
        previewToken: token,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error saving navbar preview draft:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save preview draft',
    });
  }
};

const getNavbarVariantTestPreviewDraft = async (req, res) => {
  try {
    const token = String(req.params?.token || '').trim();
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Preview token is required',
      });
    }

    const doc = await NavbarVariantTest.findOne().lean();
    const draft = doc?.previewDraft;
    if (
      !draft ||
      draft.token !== token ||
      !draft.config ||
      !draft.expiresAt ||
      new Date(draft.expiresAt).getTime() < Date.now()
    ) {
      return res.status(404).json({
        success: false,
        message: 'Preview expired or not found. Open preview again from admin.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        config: draft.config,
        expiresAt: draft.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching navbar preview draft:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch preview draft',
    });
  }
};

module.exports = {
  getNavbarVariantTestPublic,
  getNavbarVariantTestAdmin,
  putNavbarVariantTest,
  putNavbarVariantTestPreviewDraft,
  getNavbarVariantTestPreviewDraft,
};
