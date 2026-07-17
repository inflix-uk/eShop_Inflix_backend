const mongoose = require('mongoose');
const Booking = require('../models/booking');
const BookingPackage = require('../models/bookingPackage');
const bookingService = require('../services/bookingService');
const { normalizeEmail } = require('../utils/bookingPricingUtils');
const {
  resolveScopedUserId,
  getRequesterId,
  isAdminUser,
} = require('../utils/ownershipAuth');

const bookingController = {
  getAvailableSlots: async (req, res) => {
    try {
      const { packageId, date } = req.query;

      if (!packageId || !date) {
        return res.status(400).json({ error: 'packageId and date are required', status: 400 });
      }

      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        return res.status(400).json({ error: 'Invalid packageId', status: 400 });
      }

      const result = await bookingService.getAvailableSlots(packageId, date);

      if (!result.success) {
        return res.status(400).json({ error: result.error, status: 400 });
      }

      return res.json({
        message: 'Available slots fetched successfully',
        status: 200,
        ...result,
      });
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createSlotHold: async (req, res) => {
    try {
      const { packageId, date, startTime, slots, sessionId, userId } = req.body;

      if (Array.isArray(slots) && slots.length > 0) {
        if (!packageId || !mongoose.Types.ObjectId.isValid(packageId)) {
          return res.status(400).json({ error: 'Valid packageId is required', status: 400 });
        }

        const result = await bookingService.createMultiSlotHold({
          packageId,
          slots,
          sessionId,
          userId,
        });

        if (!result.success) {
          const statusCode = result.error.includes('no longer available') ? 409 : 400;
          return res.status(statusCode).json({ error: result.error, status: statusCode, conflict: result.conflict });
        }

        return res.json({
          message: 'Slot holds created successfully',
          status: 201,
          holds: result.holds,
          hold: result.holds[0],
          expiresAt: result.expiresAt,
        });
      }

      if (!packageId || !date || !startTime) {
        return res.status(400).json({
          error: 'packageId, date, and startTime are required',
          status: 400,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        return res.status(400).json({ error: 'Invalid packageId', status: 400 });
      }

      const result = await bookingService.createSlotHold({
        packageId,
        date,
        startTime,
        sessionId,
        userId,
      });

      if (!result.success) {
        const statusCode = result.error.includes('no longer available') ? 409 : 400;
        return res.status(statusCode).json({ error: result.error, status: statusCode, conflict: result.conflict });
      }

      return res.json({
        message: 'Slot hold created successfully',
        status: 201,
        hold: result.hold,
      });
    } catch (error) {
      console.error('Error creating slot hold:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  verifySlotHolds: async (req, res) => {
    try {
      const { holdIds, sessionId } = req.body;

      if (!Array.isArray(holdIds) || holdIds.length === 0) {
        return res.status(400).json({ error: 'holdIds array is required', status: 400 });
      }

      const invalid = holdIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
      if (invalid) {
        return res.status(400).json({ error: 'All holdIds must be valid', status: 400 });
      }

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return res.status(400).json({ error: 'sessionId is required', status: 400 });
      }

      const result = await bookingService.verifyActiveHolds({
        holdIds,
        sessionId: sessionId.trim(),
      });

      if (!result.valid) {
        const statusCode = result.expired ? 410 : 400;
        return res.status(statusCode).json({ error: result.error, status: statusCode, valid: false });
      }

      return res.json({
        message: 'Holds are valid',
        status: 200,
        valid: true,
        expiresAt: result.expiresAt,
        holdCount: result.holdCount,
      });
    } catch (error) {
      console.error('Error verifying slot holds:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  releaseSlotHold: async (req, res) => {
    try {
      const { holdId, holdIds, sessionId } = req.body;

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        return res.status(400).json({ error: 'sessionId is required', status: 400 });
      }

      if (Array.isArray(holdIds) && holdIds.length > 0) {
        const invalid = holdIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalid) {
          return res.status(400).json({ error: 'All holdIds must be valid', status: 400 });
        }

        const result = await bookingService.releaseHolds(holdIds, sessionId.trim());
        if (!result.success) {
          return res.status(403).json({ error: result.error, status: 403 });
        }

        return res.json({ message: 'Holds released successfully', status: 200, releasedCount: result.releasedCount });
      }

      if (!holdId || !mongoose.Types.ObjectId.isValid(holdId)) {
        return res.status(400).json({ error: 'Valid holdId is required', status: 400 });
      }

      const result = await bookingService.releaseHold(holdId, sessionId.trim());

      if (!result.success) {
        return res.status(403).json({ error: result.error, status: 403 });
      }

      return res.json({ message: 'Hold released successfully', status: 200 });
    } catch (error) {
      console.error('Error releasing slot hold:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createBooking: async (req, res) => {
    try {
      const { holdId, holdIds, customer, userId, notes, extras } = req.body;

      if (Array.isArray(holdIds) && holdIds.length > 0) {
        const invalid = holdIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
        if (invalid) {
          return res.status(400).json({ error: 'All holdIds must be valid', status: 400 });
        }

        const result = await bookingService.createBookingsFromHolds({
          holdIds,
          customer,
          userId,
          notes,
          extras,
          source: 'online',
        });

        if (!result.success) {
          const statusCode = result.error.includes('conflict') ? 409 : 400;
          return res.status(statusCode).json({ error: result.error, status: statusCode });
        }

        return res.json({
          message: 'Bookings created successfully',
          status: 201,
          booking: result.booking,
          bookings: result.bookings,
          groupBookingNumber: result.groupBookingNumber,
          totalAmount: result.totalAmount,
        });
      }

      if (!holdId) {
        return res.status(400).json({ error: 'holdId or holdIds is required', status: 400 });
      }

      if (!mongoose.Types.ObjectId.isValid(holdId)) {
        return res.status(400).json({ error: 'Invalid holdId', status: 400 });
      }

      const result = await bookingService.createBookingFromHold({
        holdId,
        customer,
        userId,
        notes,
        extras,
        source: 'online',
      });

      if (!result.success) {
        const statusCode = result.error.includes('conflict') ? 409 : 400;
        return res.status(statusCode).json({ error: result.error, status: statusCode });
      }

      return res.json({
        message: 'Booking created successfully',
        status: 201,
        booking: result.booking,
        totalAmount: result.booking?.totalAmount,
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getBookingByNumber: async (req, res) => {
    try {
      const { bookingNumber } = req.params;
      const emailParam = req.query.email;
      const { normalizeBookingNumber, syncBookingPaymentIfNeeded } = require('../services/bookingService/confirmBooking');
      const normalizedNumber = normalizeBookingNumber(bookingNumber);

      if (!emailParam || !String(emailParam).trim()) {
        return res.status(400).json({
          error: 'email query parameter is required to view booking details',
          status: 400,
        });
      }

      const requestEmail = normalizeEmail(emailParam);

      let booking = await Booking.findOne({
        bookingNumber: normalizedNumber,
        isdeleted: false,
      })
        .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
        .lean();

      if (!booking) {
        booking = await Booking.findOne({
          groupBookingNumber: normalizedNumber,
          isdeleted: false,
        })
          .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
          .lean();
      }

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      if (normalizeEmail(booking.customer?.email) !== requestEmail) {
        return res.status(403).json({ error: 'Email does not match this booking', status: 403 });
      }

      const syncedBooking = await syncBookingPaymentIfNeeded(booking);
      if (syncedBooking && syncedBooking._id) {
        booking = await Booking.findOne({ _id: syncedBooking._id })
          .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
          .lean();
      }

      let groupSlots = null;
      if (booking.bookingGroupId) {
        const groupBookings = await Booking.find({
          bookingGroupId: booking.bookingGroupId,
          isdeleted: false,
        })
          .select('date startTime endTime bookingNumber status paymentStatus')
          .sort({ date: 1, startTime: 1 })
          .lean();

        groupSlots = groupBookings.map((b) => ({
          bookingNumber: b.bookingNumber,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          paymentStatus: b.paymentStatus,
        }));
      }

      return res.json({
        message: 'Booking fetched successfully',
        status: 200,
        booking,
        groupSlots,
        slotCount: groupSlots ? groupSlots.length : 1,
      });
    } catch (error) {
      console.error('Error fetching booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getUserBookings: async (req, res) => {
    try {
      const { userId: clientUserId, email } = req.body;

      const scope = resolveScopedUserId(req, clientUserId);
      if (!scope.ok) {
        return res.status(scope.status).json({ error: scope.message, status: scope.status });
      }

      const filter = { isdeleted: false, userId: scope.userId };

      if (email) {
        const normalizedEmail = normalizeEmail(email);
        const requesterEmail = normalizeEmail(req?.user?.email);
        if (!isAdminUser(req) && normalizedEmail !== requesterEmail) {
          return res.status(403).json({ error: 'Forbidden', status: 403 });
        }
        filter['customer.email'] = normalizedEmail;
      }

      const bookings = await Booking.find(filter)
        .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
        .sort({ date: -1, startTime: -1 })
        .lean();

      return res.json({
        message: 'User bookings fetched successfully',
        status: 200,
        bookings,
      });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getMyBookings: async (req, res, next) => {
    req.body = { userId: getRequesterId(req) };
    return bookingController.getUserBookings(req, res, next);
  },

  getAdminBookings: async (req, res) => {
    try {
      const { type, date, status, page = 1, limit = 20 } = req.query;

      const filter = { isdeleted: false };

      if (type) filter.type = type;
      if (date) filter.date = date;
      if (status) filter.status = status;

      const skip = (Number(page) - 1) * Number(limit);

      const [bookings, total] = await Promise.all([
        Booking.find(filter)
          .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Booking.countDocuments(filter),
      ]);

      return res.json({
        message: 'Bookings fetched successfully',
        status: 200,
        bookings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching admin bookings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAdminBookingById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid booking id', status: 400 });
      }

      const booking = await Booking.findOne({ _id: id })
        .populate('packageId', 'name price durationMinutes durationDisplayUnit type description image')
        .lean();

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      return res.json({
        message: 'Booking fetched successfully',
        status: 200,
        booking,
      });
    } catch (error) {
      console.error('Error fetching admin booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createAdminBooking: async (req, res) => {
    try {
      const { packageId, date, startTime, customer, userId, notes, paymentStatus, status } = req.body;

      const result = await bookingService.createAdminBooking({
        packageId,
        date,
        startTime,
        customer,
        userId,
        notes,
        paymentStatus,
        status,
      });

      if (!result.success) {
        const statusCode = result.error.includes('already booked') ? 409 : 400;
        return res.status(statusCode).json({ error: result.error, status: statusCode, conflict: result.conflict });
      }

      return res.json({
        message: 'Booking created successfully',
        status: 201,
        booking: result.booking,
      });
    } catch (error) {
      console.error('Error creating admin booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updateBookingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, cancelReason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid booking id', status: 400 });
      }

      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status', status: 400 });
      }

      const update = { status };

      if (status === 'cancelled') {
        update.cancelledAt = new Date();
        if (cancelReason) update.cancelReason = cancelReason;
      }

      const booking = await Booking.findOneAndUpdate(
        { _id: id },
        update,
        { new: true }
      ).populate('packageId', 'name price durationMinutes durationDisplayUnit type');

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      if (status === 'no_show' || status === 'cancelled') {
        const { notifyBookingStatusEmail } = require('../services/email/bookingStatusEmailService');
        const bookingObj = booking.toObject ? booking.toObject() : booking;
        notifyBookingStatusEmail({
          eventType: status === 'no_show' ? 'no_show' : 'cancelled',
          booking: bookingObj,
          pkg: bookingObj.packageId,
          cancelReason: cancelReason || bookingObj.cancelReason,
        });
      }

      return res.json({
        message: 'Booking status updated successfully',
        status: 200,
        booking,
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updatePaymentStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentDetails } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid booking id', status: 400 });
      }

      const validPaymentStatuses = ['unpaid', 'paid', 'failed', 'refunded'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ error: 'Invalid paymentStatus', status: 400 });
      }

      const update = { paymentStatus };
      if (paymentDetails) update.paymentDetails = paymentDetails;

      const booking = await Booking.findOneAndUpdate(
        { _id: id },
        update,
        { new: true }
      ).populate('packageId', 'name price durationMinutes durationDisplayUnit type');

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      return res.json({
        message: 'Payment status updated successfully',
        status: 200,
        booking,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  cancelBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const { cancelReason, processRefund, refundAmount } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid booking id', status: 400 });
      }

      const result = await bookingService.cancelBooking({
        bookingId: id,
        cancelReason,
        initiatedBy: 'admin',
        processRefund: processRefund || false,
        refundAmount: refundAmount || null,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error, status: 400 });
      }

      return res.json({
        message: 'Booking cancelled successfully',
        status: 200,
        booking: result.booking,
        refund: result.refund,
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  rescheduleBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const { newDate, newStartTime, rescheduleReason } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid booking id', status: 400 });
      }

      if (!newDate || !newStartTime) {
        return res.status(400).json({ error: 'newDate and newStartTime are required', status: 400 });
      }

      const result = await bookingService.rescheduleBooking({
        bookingId: id,
        newDate,
        newStartTime,
        rescheduleReason,
        initiatedBy: 'admin',
      });

      if (!result.success) {
        const statusCode = result.error.includes('not available') ? 409 : 400;
        return res.status(statusCode).json({ error: result.error, status: statusCode, conflict: result.conflict });
      }

      return res.json({
        message: 'Booking rescheduled successfully',
        status: 200,
        originalBooking: result.originalBooking,
        newBooking: result.newBooking,
      });
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAdminSlotsForDate: async (req, res) => {
    try {
      const { packageId, date } = req.query;

      if (!packageId || !date) {
        return res.status(400).json({ error: 'packageId and date are required', status: 400 });
      }

      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        return res.status(400).json({ error: 'Invalid packageId', status: 400 });
      }

      const result = await bookingService.getAvailableSlots(packageId, date);

      if (!result.success) {
        return res.status(400).json({ error: result.error, status: 400 });
      }

      return res.json({
        message: 'Available slots fetched successfully',
        status: 200,
        ...result,
      });
    } catch (error) {
      console.error('Error fetching admin slots:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingController;
