const {
  recordCampaignClick,
  getCampaignAnalytics,
  getCampaignOrders,
} = require('../services/analytics/campaignTracking');

const analyticsCampaignController = {
  /** PUBLIC — guide §4.4 POST /analytics/campaign/click */
  trackClick: async (req, res) => {
    try {
      const result = await recordCampaignClick(req.body || {});
      if (!result.ok) {
        return res.status(200).json({
          success: true,
          recorded: false,
          reason: result.reason || 'skipped',
        });
      }
      return res.status(200).json({
        success: true,
        recorded: true,
        id: result.id,
      });
    } catch (error) {
      console.error('[analytics] trackCampaignClick:', error);
      // Best-effort public endpoint — do not fail the storefront hard
      return res.status(200).json({
        success: true,
        recorded: false,
        reason: 'error',
      });
    }
  },

  getCampaignAnalytics: async (req, res) => {
    try {
      const payload = await getCampaignAnalytics(req.query);
      return res.status(200).json(payload);
    } catch (error) {
      console.error('[analytics] getCampaignAnalytics:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },

  getCampaignOrders: async (req, res) => {
    try {
      const payload = await getCampaignOrders(req.query);
      if (payload.success === false) {
        return res.status(payload.status || 400).json(payload);
      }
      return res.status(200).json(payload);
    } catch (error) {
      console.error('[analytics] getCampaignOrders:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsCampaignController;
