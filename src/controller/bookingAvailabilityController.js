const mongoose = require('mongoose');
const BookingAvailability = require('../models/bookingAvailability');
const { BOOKING_PACKAGE_TYPES } = require('../models/bookingPackage');
const { isValidTimeHHmm } = require('../utils/bookingStoreContext');

function isValidPackageType(type) {
  return BOOKING_PACKAGE_TYPES.includes(type);
}

function isValidDayOfWeek(day) {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

const bookingAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      const { type } = req.query;

      const filter = {};
      if (type) {
        if (!isValidPackageType(type)) {
          return res.status(400).json({ error: 'Invalid package type', status: 400 });
        }
        filter.type = type;
      }

      const availability = await BookingAvailability.find(filter)
        .sort({ dayOfWeek: 1, startTime: 1 })
        .lean();

      return res.json({
        message: 'Availability fetched successfully',
        status: 200,
        availability,
      });
    } catch (error) {
      console.error('Error fetching booking availability:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createAvailability: async (req, res) => {
    try {
      const { type, dayOfWeek, startTime, endTime, isActive } = req.body;

      if (!type || dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({
          error: 'type, dayOfWeek, startTime, and endTime are required',
          status: 400,
        });
      }

      if (!isValidPackageType(type)) {
        return res.status(400).json({ error: 'Invalid package type', status: 400 });
      }

      if (!isValidDayOfWeek(Number(dayOfWeek))) {
        return res.status(400).json({ error: 'dayOfWeek must be 0-6', status: 400 });
      }

      if (!isValidTimeHHmm(startTime) || !isValidTimeHHmm(endTime)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:mm', status: 400 });
      }

      const newAvailability = new BookingAvailability({
        type,
        dayOfWeek: Number(dayOfWeek),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      await newAvailability.save();

      return res.json({
        message: 'Availability created successfully',
        status: 201,
        availability: newAvailability,
      });
    } catch (error) {
      console.error('Error creating booking availability:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateAvailability: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid availability id', status: 400 });
      }

      const existing = await BookingAvailability.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Availability not found', status: 404 });
      }

      const { type, dayOfWeek, startTime, endTime, isActive } = req.body;

      if (type !== undefined) {
        if (!isValidPackageType(type)) {
          return res.status(400).json({ error: 'Invalid package type', status: 400 });
        }
        existing.type = type;
      }

      if (dayOfWeek !== undefined) {
        if (!isValidDayOfWeek(Number(dayOfWeek))) {
          return res.status(400).json({ error: 'dayOfWeek must be 0-6', status: 400 });
        }
        existing.dayOfWeek = Number(dayOfWeek);
      }

      if (startTime !== undefined) {
        if (!isValidTimeHHmm(startTime)) {
          return res.status(400).json({ error: 'Invalid startTime format. Use HH:mm', status: 400 });
        }
        existing.startTime = startTime.trim();
      }

      if (endTime !== undefined) {
        if (!isValidTimeHHmm(endTime)) {
          return res.status(400).json({ error: 'Invalid endTime format. Use HH:mm', status: 400 });
        }
        existing.endTime = endTime.trim();
      }

      if (isActive !== undefined) {
        existing.isActive = Boolean(isActive);
      }

      await existing.save();

      return res.json({
        message: 'Availability updated successfully',
        status: 200,
        availability: existing,
      });
    } catch (error) {
      console.error('Error updating booking availability:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  deleteAvailability: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid availability id', status: 400 });
      }

      const deleted = await BookingAvailability.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Availability not found', status: 404 });
      }

      return res.json({
        message: 'Availability deleted successfully',
        status: 200,
      });
    } catch (error) {
      console.error('Error deleting booking availability:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingAvailabilityController;
