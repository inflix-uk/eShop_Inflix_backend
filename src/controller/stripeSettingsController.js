const StripeSettings = require('../models/stripeSettings');

/**
 * Mask a key to only show the last 4 characters
 * @param {string} key - The key to mask
 * @returns {string} - Masked key (e.g., "••••••••1234")
 */
const maskKey = (key) => {
  if (!key || key.length < 8) return '';
  return '••••••••' + key.slice(-4);
};

const stripeSettingsController = {
  /**
   * Get current Stripe settings (with masked keys for display)
   */
  getSettings: async (req, res) => {
    try {
      const settings = await StripeSettings.getSettings();

      res.json({
        success: true,
        data: {
          secretKey: maskKey(settings.secretKey),
          publishableKey: maskKey(settings.publishableKey),
          webhookSecret: maskKey(settings.webhookSecret),
          isActive: settings.isActive,
          hasSecretKey: !!settings.secretKey,
          hasPublishableKey: !!settings.publishableKey,
          hasWebhookSecret: !!settings.webhookSecret,
          updatedAt: settings.updatedAt,
          updatedBy: settings.updatedBy
        }
      });
    } catch (error) {
      console.error('Error fetching Stripe settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch Stripe settings',
        error: error.message
      });
    }
  },

  /**
   * Save/update Stripe settings
   */
  saveSettings: async (req, res) => {
    try {
      const { secretKey, publishableKey, webhookSecret, isActive } = req.body;

      // Get existing settings
      let settings = await StripeSettings.findOne();

      // Prepare update object
      const updateData = {
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: req.user?.id || null
      };

      // Only update keys if new values are provided (not masked values)
      if (secretKey && !secretKey.startsWith('••••')) {
        // Validate secret key format (sk_test_ or sk_live_)
        if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Secret Key format. Must start with sk_test_ or sk_live_'
          });
        }
        updateData.secretKey = secretKey;
      }

      if (publishableKey && !publishableKey.startsWith('••••')) {
        // Validate publishable key format (pk_test_ or pk_live_)
        if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Publishable Key format. Must start with pk_test_ or pk_live_'
          });
        }
        updateData.publishableKey = publishableKey;
      }

      if (webhookSecret && !webhookSecret.startsWith('••••')) {
        // Validate webhook secret format (whsec_)
        if (!webhookSecret.startsWith('whsec_')) {
          return res.status(400).json({
            success: false,
            message: 'Invalid Webhook Secret format. Must start with whsec_'
          });
        }
        updateData.webhookSecret = webhookSecret;
      }

      // Upsert settings
      if (settings) {
        settings = await StripeSettings.findByIdAndUpdate(
          settings._id,
          updateData,
          { new: true }
        );
      } else {
        settings = await StripeSettings.create(updateData);
      }

      res.json({
        success: true,
        message: 'Stripe settings saved successfully',
        data: {
          secretKey: maskKey(settings.secretKey),
          publishableKey: maskKey(settings.publishableKey),
          webhookSecret: maskKey(settings.webhookSecret),
          isActive: settings.isActive,
          hasSecretKey: !!settings.secretKey,
          hasPublishableKey: !!settings.publishableKey,
          hasWebhookSecret: !!settings.webhookSecret,
          updatedAt: settings.updatedAt
        }
      });
    } catch (error) {
      console.error('Error saving Stripe settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save Stripe settings',
        error: error.message
      });
    }
  },

  /**
   * Get active keys for internal use (full keys, not masked)
   * This should only be called internally, not exposed via API
   */
  getActiveKeys: async () => {
    return await StripeSettings.getActiveKeys();
  },

  /**
   * Test Stripe connection with current settings
   */
  testConnection: async (req, res) => {
    try {
      const keys = await StripeSettings.getActiveKeys();

      if (!keys.secretKey) {
        return res.status(400).json({
          success: false,
          message: 'No Stripe Secret Key configured'
        });
      }

      // Create a temporary Stripe instance and test the connection
      const stripe = require('stripe')(keys.secretKey);

      // Try to retrieve account info to test the connection
      const account = await stripe.accounts.retrieve();

      res.json({
        success: true,
        message: 'Stripe connection successful',
        data: {
          accountId: account.id,
          isFromDatabase: keys.isFromDatabase
        }
      });
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      res.status(400).json({
        success: false,
        message: 'Stripe connection failed',
        error: error.message
      });
    }
  }
};

module.exports = stripeSettingsController;
