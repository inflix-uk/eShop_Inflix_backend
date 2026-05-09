const NavbarVariantTest = require('../models/navbarVariantTest');

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

const putNavbarVariantTest = async (req, res) => {
  try {
    const config = req.body?.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({
        success: false,
        message: 'config object is required',
      });
    }

    const doc = await NavbarVariantTest.findOneAndUpdate(
      {},
      { config },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Navbar variant test config saved',
      data: {
        config: doc?.config || null,
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
  putNavbarVariantTest,
};
