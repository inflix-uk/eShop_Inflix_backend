const ProductCardSettings = require('../models/productCardSettings');

const productCardSettingsController = {
  /**
   * Get product card settings
   */
  getSettings: async (req, res) => {
    try {
      const settings = await ProductCardSettings.getSettings();
      res.json({
        success: true,
        data: {
          activeDesign: settings.activeDesign,
          updatedAt: settings.updatedAt
        }
      });
    } catch (error) {
      console.error('Error fetching product card settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product card settings',
        error: error.message
      });
    }
  },

  /**
   * Get product card settings (public - for storefront)
   */
  getSettingsPublic: async (req, res) => {
    try {
      const settings = await ProductCardSettings.getSettings();
      res.json({
        success: true,
        data: {
          activeDesign: settings.activeDesign
        }
      });
    } catch (error) {
      console.error('Error fetching product card settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product card settings',
        error: error.message
      });
    }
  },

  /**
   * Update product card settings
   */
  updateSettings: async (req, res) => {
    try {
      const { activeDesign } = req.body;

      if (!activeDesign) {
        return res.status(400).json({
          success: false,
          message: 'activeDesign is required'
        });
      }

      if (!['classic', 'modern'].includes(activeDesign)) {
        return res.status(400).json({
          success: false,
          message: 'activeDesign must be either "classic" or "modern"'
        });
      }

      const settings = await ProductCardSettings.updateSettings({ activeDesign });

      res.json({
        success: true,
        message: 'Product card settings updated successfully',
        data: {
          activeDesign: settings.activeDesign,
          updatedAt: settings.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating product card settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product card settings',
        error: error.message
      });
    }
  }
};

module.exports = productCardSettingsController;
