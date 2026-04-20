const BannerText = require('../models/bannerText');

// Get admin identifier for logging
const getAdminIdentifier = (req) => {
  return req.headers['x-user-id'] ||
         req.headers['x-admin-id'] ||
         req.headers['authorization']?.substring(0, 20) ||
         req.ip ||
         'unknown';
};

/**
 * GET /banner-text
 * Get banner text data or return default structure
 */
const getBannerText = async (req, res) => {
  try {
    let data = await BannerText.findOne();

    if (!data) {
      // Return default values if no data exists
      return res.status(200).json({
        success: true,
        data: {
          feature1Title: 'Fully Tested Devices',
          feature1Description: 'Buy with confidence',
          feature2Title: '18 Months Warranty',
          feature2Description: 'On all refurbished devices',
          feature3Title: 'Free & Fast Delivery',
          feature3Description: 'For all orders',
          feature4Title: '30 Days Free Return',
          feature4Description: '100% Refund',
          updatedAt: null
        },
        message: 'No banner text found, returning default values'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        feature1Title: data.feature1Title,
        feature1Description: data.feature1Description,
        feature2Title: data.feature2Title,
        feature2Description: data.feature2Description,
        feature3Title: data.feature3Title,
        feature3Description: data.feature3Description,
        feature4Title: data.feature4Title,
        feature4Description: data.feature4Description,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching banner text:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner text',
      error: error.message
    });
  }
};

/**
 * GET /banner-text/public
 * Get banner text data for public (frontend website)
 */
const getBannerTextPublic = async (req, res) => {
  try {
    let data = await BannerText.findOne();

    if (!data) {
      // Return default values if no data exists
      return res.status(200).json({
        success: true,
        data: {
          feature1Title: 'Fully Tested Devices',
          feature1Description: 'Buy with confidence',
          feature2Title: '18 Months Warranty',
          feature2Description: 'On all refurbished devices',
          feature3Title: 'Free & Fast Delivery',
          feature3Description: 'For all orders',
          feature4Title: '30 Days Free Return',
          feature4Description: '100% Refund'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        feature1Title: data.feature1Title,
        feature1Description: data.feature1Description,
        feature2Title: data.feature2Title,
        feature2Description: data.feature2Description,
        feature3Title: data.feature3Title,
        feature3Description: data.feature3Description,
        feature4Title: data.feature4Title,
        feature4Description: data.feature4Description
      }
    });
  } catch (error) {
    console.error('Error fetching banner text:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner text',
      error: error.message
    });
  }
};

/**
 * POST /banner-text
 * Create or update banner text (upsert)
 */
const saveBannerText = async (req, res) => {
  try {
    const {
      feature1Title,
      feature1Description,
      feature2Title,
      feature2Description,
      feature3Title,
      feature3Description,
      feature4Title,
      feature4Description
    } = req.body;

    const data = await BannerText.findOneAndUpdate(
      {},
      {
        feature1Title,
        feature1Description,
        feature2Title,
        feature2Description,
        feature3Title,
        feature3Description,
        feature4Title,
        feature4Description
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(`[ADMIN ACTION] Admin ${adminId} saved banner text at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Banner text saved successfully',
      data: {
        feature1Title: data.feature1Title,
        feature1Description: data.feature1Description,
        feature2Title: data.feature2Title,
        feature2Description: data.feature2Description,
        feature3Title: data.feature3Title,
        feature3Description: data.feature3Description,
        feature4Title: data.feature4Title,
        feature4Description: data.feature4Description,
        updatedAt: data.updatedAt
      }
    });
  } catch (error) {
    console.error('Error saving banner text:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save banner text',
      error: error.message
    });
  }
};

module.exports = {
  getBannerText,
  getBannerTextPublic,
  saveBannerText
};
