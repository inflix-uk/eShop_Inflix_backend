const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');

async function deleteBooking({ bookingId }) {
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
    return { success: false, error: 'Only cancelled bookings can be deleted' };
  }

  try {
    booking.isdeleted = true;
    await booking.save();

    if (booking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'released' });
    }

    return {
      success: true,
      booking: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
      },
    };
  } catch (error) {
    console.error('Error deleting booking:', error);
    return { success: false, error: 'Failed to delete booking' };
  }
}

module.exports = {
  deleteBooking,
};
