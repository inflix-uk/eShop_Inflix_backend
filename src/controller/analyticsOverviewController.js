const { getAnalyticsOverview } = require('../services/analytics/analyticsOverviewService');

const analyticsOverviewController = {
  getOverview: async (req, res) => {
    try {
      const payload = await getAnalyticsOverview(req.query);
      return res.status(200).json({
        success: true,
        status: 200,
        ...payload,
      });
    } catch (error) {
      console.error('[analytics] getOverview:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsOverviewController;
