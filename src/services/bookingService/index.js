const { getAvailableSlots } = require('./slotGenerator');
const { createSlotHold, releaseHold } = require('./createSlotHold');
const { createBookingFromHold, createAdminBooking } = require('./createBooking');
const { confirmBookingPayment, handleBookingPaymentFailed } = require('./confirmBooking');
const { cancelBooking } = require('./cancelBooking');
const { rescheduleBooking } = require('./rescheduleBooking');
const { generateBookingNumber } = require('./generateBookingNumber');

module.exports = {
  getAvailableSlots,
  createSlotHold,
  releaseHold,
  createBookingFromHold,
  createAdminBooking,
  confirmBookingPayment,
  handleBookingPaymentFailed,
  cancelBooking,
  rescheduleBooking,
  generateBookingNumber,
};
