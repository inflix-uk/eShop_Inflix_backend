const { setOrderMarketingFraud } = require('../services/analytics/fraudInsightsService');

const analyticsOrderFraudController = {
  setFraudFlag: async (req, res) => {
    try {
      const { id } = req.params;
      const { flagged, reason } = req.body || {};
      const flaggedBy = req.user?.email || req.user?.id || req.user?._id || null;

      const result = await setOrderMarketingFraud(id, { flagged, reason, flaggedBy });
      if (!result.ok) {
        return res.status(result.status || 400).json({
          success: false,
          status: result.status || 400,
          message: result.message,
        });
      }

      return res.status(200).json({
        success: true,
        status: 200,
        message: result.message,
        order: result.order,
      });
    } catch (error) {
      console.error('[analytics] setFraudFlag:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsOrderFraudController;
