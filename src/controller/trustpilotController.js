const TrustpilotSettings = require('../models/trustpilotSettings');

// Get admin identifier for logging
const getAdminIdentifier = (req) => {
  return req.headers['x-user-id'] ||
         req.headers['x-admin-id'] ||
         req.headers['authorization']?.substring(0, 20) ||
         req.ip ||
         'unknown';
};

/**
 * GET /trustpilot
 * Get Trustpilot settings data for admin panel
 */
const getTrustpilotSettings = async (req, res) => {
  try {
    let data = await TrustpilotSettings.findOne();

    if (!data) {
      // Return default empty values if no data exists
      return res.status(200).json({
        success: true,
        data: {
          productPageTopScript: '',
          productPageScript: '',
          homePageScript: '',
          updatedAt: null
        },
        message: 'No Trustpilot settings found, returning default values'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        productPageTopScript: data.productPageTopScript,
        productPageScript: data.productPageScript,
        homePageScript: data.homePageScript,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching Trustpilot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Trustpilot settings',
      error: error.message
    });
  }
};

/**
 * GET /trustpilot/public
 * Get Trustpilot settings data for public (frontend website)
 */
const getTrustpilotSettingsPublic = async (req, res) => {
  try {
    let data = await TrustpilotSettings.findOne();

    if (!data) {
      // Return default empty values if no data exists
      return res.status(200).json({
        success: true,
        data: {
          productPageTopScript: '',
          productPageScript: '',
          homePageScript: ''
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        productPageTopScript: data.productPageTopScript,
        productPageScript: data.productPageScript,
        homePageScript: data.homePageScript
      }
    });
  } catch (error) {
    console.error('Error fetching Trustpilot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Trustpilot settings',
      error: error.message
    });
  }
};

/**
 * POST /trustpilot
 * Create or update Trustpilot settings (upsert)
 */
const saveTrustpilotSettings = async (req, res) => {
  try {
    const {
      productPageTopScript,
      productPageScript,
      homePageScript
    } = req.body;

    const data = await TrustpilotSettings.findOneAndUpdate(
      {},
      {
        productPageTopScript,
        productPageScript,
        homePageScript
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(`[ADMIN ACTION] Admin ${adminId} saved Trustpilot settings at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Trustpilot settings saved successfully',
      data: {
        productPageTopScript: data.productPageTopScript,
        productPageScript: data.productPageScript,
        homePageScript: data.homePageScript,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving Trustpilot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save Trustpilot settings',
      error: error.message
    });
  }
};

module.exports = {
  getTrustpilotSettings,
  getTrustpilotSettingsPublic,
  saveTrustpilotSettings
};
