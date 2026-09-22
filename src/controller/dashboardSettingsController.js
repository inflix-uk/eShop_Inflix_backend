const DashboardSettings = require('../models/dashboardSettings');

const ALLOWED_WIDGETS = ['orders', 'bookings'];

const getAdminIdentifier = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-admin-id'] ||
  req.headers['authorization']?.substring(0, 20) ||
  req.ip ||
  'unknown';

const getDashboardSettings = async (_req, res) => {
  try {
    const data = await DashboardSettings.findOne();
    return res.status(200).json({
      success: true,
      data: {
        widget: ALLOWED_WIDGETS.includes(data?.widget) ? data.widget : 'orders',
        updatedAt: data?.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard settings',
      error: error.message,
    });
  }
};

const saveDashboardSettings = async (req, res) => {
  try {
    const widget = req.body?.widget;
    if (!ALLOWED_WIDGETS.includes(widget)) {
      return res.status(400).json({
        success: false,
        message: 'Choose either orders or bookings',
      });
    }

    const data = await DashboardSettings.findOneAndUpdate(
      {},
      { widget },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const adminId = getAdminIdentifier(req);
    console.log(
      `[ADMIN ACTION] Admin ${adminId} saved dashboard settings (${widget}) at ${new Date().toISOString()}`
    );

    return res.status(200).json({
      success: true,
      message: 'Dashboard settings saved successfully',
      data: {
        widget: data.widget,
        updatedAt: data.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Error saving dashboard settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save dashboard settings',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardSettings,
  saveDashboardSettings,
};
