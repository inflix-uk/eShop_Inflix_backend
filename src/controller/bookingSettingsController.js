const BookingSettings = require('../models/bookingSettings');

const bookingSettingsController = {
  getPublicSettings: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        message: 'Booking settings fetched successfully',
        status: 200,
        settings: {
          isEnabled: settings.isEnabled,
          slotIntervalMinutes: settings.slotIntervalMinutes,
          holdDurationMinutes: settings.holdDurationMinutes,
          timezone: settings.timezone,
          minAdvanceBookingHours: settings.minAdvanceBookingHours,
          maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
        },
      });
    } catch (error) {
      console.error('Error fetching public booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAdminSettings: async (req, res) => {
    try {
      const settings = await BookingSettings.getSettings();
      return res.json({
        message: 'Booking settings fetched successfully',
        status: 200,
        settings,
      });
    } catch (error) {
      console.error('Error fetching admin booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const {
        isEnabled,
        slotIntervalMinutes,
        holdDurationMinutes,
        timezone,
        minAdvanceBookingHours,
        maxAdvanceBookingDays,
        updatedBy,
      } = req.body;

      const settings = await BookingSettings.getSettings();

      if (isEnabled !== undefined) settings.isEnabled = Boolean(isEnabled);
      if (slotIntervalMinutes !== undefined) settings.slotIntervalMinutes = Number(slotIntervalMinutes);
      if (holdDurationMinutes !== undefined) settings.holdDurationMinutes = Number(holdDurationMinutes);
      if (timezone !== undefined) settings.timezone = String(timezone).trim();
      if (minAdvanceBookingHours !== undefined) {
        settings.minAdvanceBookingHours = Number(minAdvanceBookingHours);
      }
      if (maxAdvanceBookingDays !== undefined) {
        settings.maxAdvanceBookingDays = Number(maxAdvanceBookingDays);
      }
      if (updatedBy) settings.updatedBy = updatedBy;

      await settings.save();

      return res.json({
        message: 'Booking settings updated successfully',
        status: 200,
        settings,
      });
    } catch (error) {
      console.error('Error updating booking settings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingSettingsController;
