const Booking = require('../../models/booking');

const BOOKING_PREFIX = 'B';

async function generateBookingNumber() {
  const currentYear = new Date().getFullYear();
  const yearStr = String(currentYear);
  const prefix = BOOKING_PREFIX;
  const headerLen = prefix.length + yearStr.length;
  const pattern = new RegExp(`^${prefix}${yearStr}`);

  const lastBooking = await Booking.findOne({
    bookingNumber: pattern,
  })
    .sort({ bookingNumber: -1 })
    .select('bookingNumber')
    .lean();

  if (lastBooking && lastBooking.bookingNumber && lastBooking.bookingNumber.length >= headerLen) {
    const lastNum = parseInt(lastBooking.bookingNumber.slice(headerLen), 10);
    if (!Number.isNaN(lastNum)) {
      return `${prefix}${yearStr}${String(lastNum + 1).padStart(4, '0')}`;
    }
  }

  return `${prefix}${yearStr}0001`;
}

module.exports = {
  generateBookingNumber,
  BOOKING_PREFIX,
};
