const mongoose = require('mongoose');
const BookingBlockedDate = require('../models/bookingBlockedDate');
const { BOOKING_PACKAGE_TYPES } = require('../models/bookingPackage');

function isValidPackageType(type) {
  return BOOKING_PACKAGE_TYPES.includes(type);
}

function isValidDateYYYYMMDD(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

const bookingBlockedDateController = {
  getBlockedDates: async (req, res) => {
    try {
      const { type } = req.query;

      const filter = { isActive: true };
      if (type) {
        if (!isValidPackageType(type)) {
          return res.status(400).json({ error: 'Invalid package type', status: 400 });
        }
        filter.type = type;
      }

      const blockedDates = await BookingBlockedDate.find(filter)
        .sort({ date: 1 })
        .lean();

      return res.json({
        message: 'Blocked dates fetched successfully',
        status: 200,
        blockedDates,
      });
    } catch (error) {
      console.error('Error fetching blocked dates:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createBlockedDate: async (req, res) => {
    try {
      const { type, date, reason } = req.body;

      if (!type || !date) {
        return res.status(400).json({
          error: 'type and date are required',
          status: 400,
        });
      }

      if (!isValidPackageType(type)) {
        return res.status(400).json({ error: 'Invalid package type', status: 400 });
      }

      if (!isValidDateYYYYMMDD(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD', status: 400 });
      }

      const existing = await BookingBlockedDate.findOne({
        type,
        date: date.trim(),
        isActive: true,
      });

      if (existing) {
        return res.status(400).json({ error: 'This date is already blocked', status: 400 });
      }

      const newBlockedDate = new BookingBlockedDate({
        type,
        date: date.trim(),
        reason: reason || '',
        isActive: true,
      });

      await newBlockedDate.save();

      return res.json({
        message: 'Blocked date created successfully',
        status: 201,
        blockedDate: newBlockedDate,
      });
    } catch (error) {
      console.error('Error creating blocked date:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteBlockedDate: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid blocked date id', status: 400 });
      }

      const deleted = await BookingBlockedDate.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Blocked date not found', status: 404 });
      }

      return res.json({
        message: 'Blocked date deleted successfully',
        status: 200,
      });
    } catch (error) {
      console.error('Error deleting blocked date:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingBlockedDateController;
