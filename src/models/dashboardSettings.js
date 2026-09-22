const mongoose = require('mongoose');

const DASHBOARD_WIDGETS = ['orders', 'bookings'];

const dashboardSettingsSchema = new mongoose.Schema(
  {
    widget: {
      type: String,
      enum: DASHBOARD_WIDGETS,
      default: 'orders',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DashboardSettings', dashboardSettingsSchema);
module.exports.DASHBOARD_WIDGETS = DASHBOARD_WIDGETS;
