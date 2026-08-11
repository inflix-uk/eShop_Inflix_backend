const { getAvailableSlots, getMonthAvailability } = require('./slotGenerator');
const { createSlotHold, createMultiSlotHold, releaseHold, releaseHolds } = require('./createSlotHold');
const { createBookingFromHold, createBookingsFromHolds, createAdminBooking } = require('./createBooking');
const { confirmBookingPayment, handleBookingPaymentFailed, syncBookingPaymentIfNeeded, syncBookingsPaymentStatus } = require('./confirmBooking');
const { cancelBooking } = require('./cancelBooking');
const { restoreBooking } = require('./restoreBooking');
const { updateBooking } = require('./updateBooking');
const { rescheduleBooking } = require('./rescheduleBooking');
const { generateBookingNumber } = require('./generateBookingNumber');
const { expireStalePendingBookings } = require('./expireStalePendingBookings');
const { verifyActiveHolds } = require('./verifySlotHolds');

module.exports = {
  getAvailableSlots,
  getMonthAvailability,
  createSlotHold,
  createMultiSlotHold,
  releaseHold,
  releaseHolds,
  createBookingFromHold,
  createBookingsFromHolds,
  createAdminBooking,
  confirmBookingPayment,
  handleBookingPaymentFailed,
  syncBookingPaymentIfNeeded,
  syncBookingsPaymentStatus,
  cancelBooking,
  restoreBooking,
  updateBooking,
  rescheduleBooking,
  generateBookingNumber,
  expireStalePendingBookings,
  verifyActiveHolds,
};
