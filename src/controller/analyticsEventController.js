const { recordMarketingEvent } = require('../services/analytics/recordMarketingEvent');

const analyticsEventController = {
  record: async (req, res) => {
    try {
      const body = req.body || {};
      const result = await recordMarketingEvent(body);

      if (!result.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: result.reason || 'Invalid event payload',
        });
      }

      return res.json({
        success: true,
        status: 200,
        duplicate: result.duplicate === true,
      });
    } catch (error) {
      console.error('analyticsEventController.record:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Failed to record marketing event',
      });
    }
  },
};

module.exports = analyticsEventController;
