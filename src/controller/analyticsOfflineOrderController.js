const { upsertOfflineOrder } = require('../services/analytics/offlineOrdersService');

const analyticsOfflineOrderController = {
  upsert: async (req, res) => {
    try {
      const result = await upsertOfflineOrder(req.body || {});
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: result.reason || 'Invalid offline order payload',
        });
      }
      return res.status(200).json({
        success: true,
        status: 200,
        id: result.id,
      });
    } catch (error) {
      console.error('[analytics] upsertOfflineOrder:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsOfflineOrderController;
