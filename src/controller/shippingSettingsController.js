const ShippingSettings = require('../models/shippingSettings');

const shippingSettingsController = {
  /**
   * Get all shipping settings
   */
  getSettings: async (req, res) => {
    try {
      const settings = await ShippingSettings.getSettings();

      res.json({
        success: true,
        data: {
          methods: settings.methods,
          freeShippingThreshold: settings.freeShippingThreshold,
          freeShippingEnabled: settings.freeShippingEnabled,
          updatedAt: settings.updatedAt,
          updatedBy: settings.updatedBy
        }
      });
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shipping settings',
        error: error.message
      });
    }
  },

  /**
   * Get active shipping methods (for public/checkout use)
   */
  getActiveMethods: async (req, res) => {
    try {
      const methods = await ShippingSettings.getActiveMethods();
      const settings = await ShippingSettings.getSettings();

      res.json({
        success: true,
        data: {
          methods,
          freeShippingThreshold: settings.freeShippingEnabled ? settings.freeShippingThreshold : null,
          freeShippingEnabled: settings.freeShippingEnabled
        }
      });
    } catch (error) {
      console.error('Error fetching active shipping methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shipping methods',
        error: error.message
      });
    }
  },

  /**
   * Add a new shipping method
   */
  addMethod: async (req, res) => {
    try {
      const { name, description, price, estimatedDays, isActive } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required'
        });
      }

      const settings = await ShippingSettings.getSettings();

      // Get the highest order number
      const maxOrder = settings.methods.reduce((max, m) => Math.max(max, m.order || 0), -1);

      settings.methods.push({
        name,
        description: description || '',
        price: parseFloat(price),
        estimatedDays: estimatedDays || '',
        isActive: isActive !== false,
        order: maxOrder + 1
      });

      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: 'Shipping method added successfully',
        data: settings.methods[settings.methods.length - 1]
      });
    } catch (error) {
      console.error('Error adding shipping method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add shipping method',
        error: error.message
      });
    }
  },

  /**
   * Update a shipping method
   */
  updateMethod: async (req, res) => {
    try {
      const { methodId } = req.params;
      const { name, description, price, estimatedDays, isActive } = req.body;

      const settings = await ShippingSettings.getSettings();
      const methodIndex = settings.methods.findIndex(m => m._id.toString() === methodId);

      if (methodIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Shipping method not found'
        });
      }

      // Update fields if provided
      if (name !== undefined) settings.methods[methodIndex].name = name;
      if (description !== undefined) settings.methods[methodIndex].description = description;
      if (price !== undefined) settings.methods[methodIndex].price = parseFloat(price);
      if (estimatedDays !== undefined) settings.methods[methodIndex].estimatedDays = estimatedDays;
      if (isActive !== undefined) settings.methods[methodIndex].isActive = isActive;

      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: 'Shipping method updated successfully',
        data: settings.methods[methodIndex]
      });
    } catch (error) {
      console.error('Error updating shipping method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update shipping method',
        error: error.message
      });
    }
  },

  /**
   * Delete a shipping method
   */
  deleteMethod: async (req, res) => {
    try {
      const { methodId } = req.params;

      const settings = await ShippingSettings.getSettings();
      const methodIndex = settings.methods.findIndex(m => m._id.toString() === methodId);

      if (methodIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Shipping method not found'
        });
      }

      settings.methods.splice(methodIndex, 1);
      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: 'Shipping method deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting shipping method:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete shipping method',
        error: error.message
      });
    }
  },

  /**
   * Toggle shipping method status
   */
  toggleMethodStatus: async (req, res) => {
    try {
      const { methodId } = req.params;

      const settings = await ShippingSettings.getSettings();
      const methodIndex = settings.methods.findIndex(m => m._id.toString() === methodId);

      if (methodIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Shipping method not found'
        });
      }

      settings.methods[methodIndex].isActive = !settings.methods[methodIndex].isActive;
      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: `Shipping method ${settings.methods[methodIndex].isActive ? 'activated' : 'deactivated'}`,
        data: settings.methods[methodIndex]
      });
    } catch (error) {
      console.error('Error toggling shipping method status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle shipping method status',
        error: error.message
      });
    }
  },

  /**
   * Update free shipping settings
   */
  updateFreeShipping: async (req, res) => {
    try {
      const { freeShippingThreshold, freeShippingEnabled } = req.body;

      const settings = await ShippingSettings.getSettings();

      if (freeShippingThreshold !== undefined) {
        settings.freeShippingThreshold = parseFloat(freeShippingThreshold);
      }
      if (freeShippingEnabled !== undefined) {
        settings.freeShippingEnabled = freeShippingEnabled;
      }

      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: 'Free shipping settings updated successfully',
        data: {
          freeShippingThreshold: settings.freeShippingThreshold,
          freeShippingEnabled: settings.freeShippingEnabled
        }
      });
    } catch (error) {
      console.error('Error updating free shipping settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update free shipping settings',
        error: error.message
      });
    }
  },

  /**
   * Reorder shipping methods
   */
  reorderMethods: async (req, res) => {
    try {
      const { methodIds } = req.body;

      if (!Array.isArray(methodIds)) {
        return res.status(400).json({
          success: false,
          message: 'methodIds must be an array'
        });
      }

      const settings = await ShippingSettings.getSettings();

      // Update order for each method
      methodIds.forEach((id, index) => {
        const method = settings.methods.find(m => m._id.toString() === id);
        if (method) {
          method.order = index;
        }
      });

      settings.updatedBy = req.user?.id || null;
      await settings.save();

      res.json({
        success: true,
        message: 'Shipping methods reordered successfully',
        data: settings.methods.sort((a, b) => a.order - b.order)
      });
    } catch (error) {
      console.error('Error reordering shipping methods:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder shipping methods',
        error: error.message
      });
    }
  }
};

module.exports = shippingSettingsController;
