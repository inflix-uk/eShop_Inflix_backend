const { recordVisitorSession } = require('../services/analytics/recordVisitorSession');

const analyticsVisitorSessionController = {
  record: async (req, res) => {
    try {
      const result = await recordVisitorSession(req.body || {});
      if (!result.ok) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'sessionId is required',
        });
      }
      return res.status(200).json({ success: true, status: 200 });
    } catch (error) {
      console.error('[analytics] recordVisitorSession:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsVisitorSessionController;
