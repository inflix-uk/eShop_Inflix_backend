const Booking = require('../../models/booking');
const { checkOverlap } = require('./overlapValidator');

async function restoreBooking({ bookingId, initiatedBy }) {
  if (!bookingId) {
    return { success: false, error: 'bookingId is required' };
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    isdeleted: false,
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status !== 'cancelled') {
    return { success: false, error: 'Only cancelled bookings can be restored' };
  }

  const replacementBooking = await Booking.findOne({
    rescheduledFrom: booking._id,
    isdeleted: false,
    status: { $in: ['pending', 'confirmed', 'completed'] },
  })
    .select('bookingNumber date startTime')
    .lean();

  if (replacementBooking) {
    return {
      success: false,
      error: `This booking was rescheduled to ${replacementBooking.bookingNumber}. Cancel or complete the replacement booking before restoring.`,
    };
  }

  const conflict = await checkOverlap(
    booking.type,
    booking.date,
    booking.startTime,
    booking.endTime,
    { excludeBookingId: booking._id }
  );

  if (conflict.hasConflict) {
    return {
      success: false,
      error: 'Cannot restore: the original time slot is no longer available',
      conflict: conflict.conflictWith,
    };
  }

  try {
    // Refunded is not used in admin cancel flow — normalize so UI stays unpaid/paid.
    if (booking.paymentStatus === 'refunded') {
      booking.paymentStatus = 'unpaid';
    }

    const restoredStatus = booking.paymentStatus === 'paid' ? 'confirmed' : 'pending';

    booking.status = restoredStatus;
    booking.cancelledAt = null;
    booking.cancelReason = '';

    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
      .lean();

    const { notifyBookingStatusEmail } = require('../email/bookingStatusEmailService');
    notifyBookingStatusEmail({
      eventType: 'restored',
      booking: populated || booking.toObject?.() || booking,
      pkg: populated?.packageId,
    });

    return {
      success: true,
      booking: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        restoredBy: initiatedBy || 'admin',
      },
    };
  } catch (error) {
    console.error('Error restoring booking:', error);

    if (error?.code === 11000) {
      return {
        success: false,
        error: 'Cannot restore: the original time slot is no longer available',
      };
    }

    return { success: false, error: 'Failed to restore booking' };
  }
}

module.exports = {
  restoreBooking,
};
