const NavbarVariantTest = require('../models/navbarVariantTest');

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

const getNavbarVariantTestPublic = async (req, res) => {
  try {
    const doc = await NavbarVariantTest.findOne().lean();
    return res.status(200).json({
      success: true,
      data: {
        config: doc?.config || null,
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
        config: doc?.config || null,
        presets: normalizePresets(doc?.presets),
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

    const existing = await NavbarVariantTest.findOne().lean();
    let presets = normalizePresets(existing?.presets);
    const legacyKey = presetKeyFromConfig(existing?.config);
    if (Object.keys(presets).length === 0 && legacyKey && existing?.config) {
      presets[legacyKey] = existing.config;
    }
    presets[presetKey] = config;

    const doc = await NavbarVariantTest.findOneAndUpdate(
      {},
      { config, presets },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Navbar variant test config saved',
      data: {
        config: doc?.config || null,
        presets: normalizePresets(doc?.presets),
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

module.exports = {
  getNavbarVariantTestPublic,
  getNavbarVariantTestAdmin,
  putNavbarVariantTest,
};
