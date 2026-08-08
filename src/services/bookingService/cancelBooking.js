const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');

async function cancelBooking({
  bookingId,
  cancelReason,
  initiatedBy,
}) {
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

  if (booking.status === 'cancelled') {
    return { success: false, error: 'Booking is already cancelled' };
  }

  if (booking.status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed booking' };
  }

  try {
    // Cancel only changes booking status — keep paymentStatus as-is (unpaid/paid).
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = cancelReason || '';

    await booking.save();

    if (booking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'released' });
    }

    const populated = await Booking.findById(booking._id)
      .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
      .lean();

    const { notifyBookingStatusEmail } = require('../email/bookingStatusEmailService');
    notifyBookingStatusEmail({
      eventType: 'cancelled',
      booking: populated || booking.toObject?.() || booking,
      pkg: populated?.packageId,
      cancelReason: booking.cancelReason,
    });

    return {
      success: true,
      booking: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        paymentStatus: booking.paymentStatus,
      },
    };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Failed to cancel booking' };
  }
}

module.exports = {
  cancelBooking,
};
