const { getAvailableSlots } = require('./slotGenerator');
const { createSlotHold, createMultiSlotHold, releaseHold, releaseHolds } = require('./createSlotHold');
const { createBookingFromHold, createBookingsFromHolds, createAdminBooking } = require('./createBooking');
const { confirmBookingPayment, handleBookingPaymentFailed } = require('./confirmBooking');
const { cancelBooking } = require('./cancelBooking');
const { rescheduleBooking } = require('./rescheduleBooking');
const { generateBookingNumber } = require('./generateBookingNumber');
const { expireStalePendingBookings } = require('./expireStalePendingBookings');
const { verifyActiveHolds } = require('./verifySlotHolds');

module.exports = {
  getAvailableSlots,
  createSlotHold,
  createMultiSlotHold,
  releaseHold,
  releaseHolds,
  createBookingFromHold,
  createBookingsFromHolds,
  createAdminBooking,
  confirmBookingPayment,
  handleBookingPaymentFailed,
  cancelBooking,
  rescheduleBooking,
  generateBookingNumber,
  expireStalePendingBookings,
  verifyActiveHolds,
};
