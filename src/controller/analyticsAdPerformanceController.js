const { getAdPerformanceReport } = require('../services/analytics/adPerformanceReport');
const { getAdPerformanceOrders } = require('../services/analytics/adPerformanceOrders');

const analyticsAdPerformanceController = {
  getAdPerformance: async (req, res) => {
    try {
      const payload = await getAdPerformanceReport(req.query);
      return res.status(200).json(payload);
    } catch (error) {
      console.error('[analytics] getAdPerformance:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },

  getAdPerformanceOrders: async (req, res) => {
    try {
      const payload = await getAdPerformanceOrders(req.query);
      if (payload.success === false) {
        return res.status(payload.status || 400).json(payload);
      }
      return res.status(200).json(payload);
    } catch (error) {
      console.error('[analytics] getAdPerformanceOrders:', error);
      return res.status(500).json({
        success: false,
        status: 500,
        message: 'Internal server error',
      });
    }
  },
};

module.exports = analyticsAdPerformanceController;
