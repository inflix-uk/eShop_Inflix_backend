const Booking = require('../../models/booking');
const BookingPackage = require('../../models/bookingPackage');
const BookingSettings = require('../../models/bookingSettings');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');
const { validateSlotEligibility } = require('./slotEligibility');
const { isDuplicateKeyError } = require('./slotReservation');

const EDITABLE_STATUSES = ['pending', 'confirmed'];
const BLOCKED_EDIT_STATUSES = ['cancelled', 'completed', 'no_show'];
const EDITABLE_PAYMENT_STATUSES = ['unpaid', 'paid'];

async function updateBooking({
  bookingId,
  packageId,
  date,
  startTime,
  customer,
  notes,
  paymentStatus,
  status,
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

  if (BLOCKED_EDIT_STATUSES.includes(booking.status)) {
    return {
      success: false,
      error: `Cannot edit a ${booking.status.replace('_', ' ')} booking`,
    };
  }

  if (customer) {
    if (!customer.name || !customer.email) {
      return { success: false, error: 'customer.name and customer.email are required' };
    }
    booking.customer = {
      name: String(customer.name).trim(),
      email: String(customer.email).trim().toLowerCase(),
      phone: customer.phone ? String(customer.phone).trim() : '',
    };
  }

  if (notes !== undefined) {
    booking.notes = notes == null ? '' : String(notes);
  }

  if (paymentStatus !== undefined) {
    if (!EDITABLE_PAYMENT_STATUSES.includes(paymentStatus)) {
      return { success: false, error: 'Invalid paymentStatus. Use unpaid or paid' };
    }
    booking.paymentStatus = paymentStatus;
  }

  if (status !== undefined) {
    if (!EDITABLE_STATUSES.includes(status)) {
      return { success: false, error: 'Invalid status. Use pending or confirmed' };
    }
    booking.status = status;
  }

  const nextPackageId = packageId || booking.packageId;
  const nextDate = date || booking.date;
  const nextStartTime = startTime || booking.startTime;

  const scheduleOrPackageChanged =
    String(nextPackageId) !== String(booking.packageId) ||
    nextDate !== booking.date ||
    nextStartTime !== booking.startTime;

  if (scheduleOrPackageChanged) {
    if (!isValidDateYYYYMMDD(nextDate)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
    }
    if (!isValidTimeHHmm(nextStartTime)) {
      return { success: false, error: 'Invalid startTime format. Use HH:mm' };
    }

    const pkg = await BookingPackage.findOne({
      _id: nextPackageId,
      isdeleted: false,
    }).lean();

    if (!pkg) {
      return { success: false, error: 'Package not found' };
    }

    const nextEndTime = addMinutesToTime(nextStartTime, pkg.durationMinutes);
    const settings = await BookingSettings.getSettings();
    const eligibility = await validateSlotEligibility({
      packageId: nextPackageId,
      date: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      type: pkg.type,
      settings,
      pkg,
    });

    if (!eligibility.valid) {
      return { success: false, error: eligibility.error };
    }

    const conflict = await checkOverlap(pkg.type, nextDate, nextStartTime, nextEndTime, {
      excludeBookingId: booking._id,
    });

    if (conflict.hasConflict) {
      return {
        success: false,
        error: 'Slot is already booked',
        conflict: conflict.conflictWith,
      };
    }

    booking.packageId = nextPackageId;
    booking.type = pkg.type;
    booking.date = nextDate;
    booking.startTime = nextStartTime;
    booking.endTime = nextEndTime;

    // Keep pricing in sync when package/slot changes (admin edit without extras rewrite).
    if (!Array.isArray(booking.extras) || booking.extras.length === 0) {
      booking.slotsSubtotal = Number(pkg.price) || 0;
      booking.extrasSubtotal = 0;
      booking.totalAmount = Number(pkg.price) || 0;
    }
  }

  try {
    await booking.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { success: false, error: 'Slot is already booked' };
    }
    console.error('Error updating booking:', error);
    return { success: false, error: 'Failed to update booking' };
  }

  const populated = await Booking.findById(booking._id)
    .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
    .lean();

  return {
    success: true,
    booking: populated || booking.toObject?.() || booking,
  };
}

module.exports = {
  updateBooking,
};
