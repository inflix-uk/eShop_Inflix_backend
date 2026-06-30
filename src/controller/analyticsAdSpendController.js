const { upsertMarketingAdSpend } = require('../services/analytics/adSpendRoasService');

const analyticsAdSpendController = {
  upsert: async (req, res) => {
    try {
      const result = await upsertMarketingAdSpend(req.body || {});
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: result.reason || 'Invalid ad spend payload',
        });
      }
      return res.status(200).json({
        success: true,
        status: 200,
        id: result.id,
      });
    } catch (error) {
      console.error('[analytics] upsertAdSpend:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsAdSpendController;
