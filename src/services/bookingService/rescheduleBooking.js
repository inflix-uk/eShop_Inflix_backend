const Booking = require('../../models/booking');
const BookingPackage = require('../../models/bookingPackage');
const BookingSlotHold = require('../../models/bookingSlotHold');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');
const { generateBookingNumber } = require('./generateBookingNumber');

async function rescheduleBooking({
  bookingId,
  newDate,
  newStartTime,
  rescheduleReason,
  initiatedBy,
}) {
  if (!bookingId || !newDate || !newStartTime) {
    return { success: false, error: 'bookingId, newDate, and newStartTime are required' };
  }

  if (!isValidDateYYYYMMDD(newDate)) {
    return { success: false, error: 'Invalid newDate format. Use YYYY-MM-DD' };
  }

  if (!isValidTimeHHmm(newStartTime)) {
    return { success: false, error: 'Invalid newStartTime format. Use HH:mm' };
  }

  const originalBooking = await Booking.findOne({
    _id: bookingId,
    isdeleted: false,
  });

  if (!originalBooking) {
    return { success: false, error: 'Booking not found' };
  }

  if (originalBooking.status === 'cancelled') {
    return { success: false, error: 'Cannot reschedule a cancelled booking' };
  }

  if (originalBooking.status === 'completed') {
    return { success: false, error: 'Cannot reschedule a completed booking' };
  }

  const pkg = await BookingPackage.findOne({
    _id: originalBooking.packageId,
    isdeleted: false,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found' };
  }

  const newEndTime = addMinutesToTime(newStartTime, pkg.durationMinutes);

  const conflict = await checkOverlap(originalBooking.type, newDate, newStartTime, newEndTime, {
    excludeBookingId: originalBooking._id,
  });

  if (conflict.hasConflict) {
    return {
      success: false,
      error: 'New time slot is not available',
      conflict: conflict.conflictWith,
    };
  }

  try {
    const newBookingNumber = await generateBookingNumber();

    const newBooking = new Booking({
      bookingNumber: newBookingNumber,
      packageId: originalBooking.packageId,
      type: originalBooking.type,
      userId: originalBooking.userId,
      customer: originalBooking.customer,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: originalBooking.paymentStatus === 'paid' ? 'confirmed' : 'pending',
      paymentStatus: originalBooking.paymentStatus,
      paymentDetails: originalBooking.paymentDetails,
      stripePaymentIntentId: originalBooking.stripePaymentIntentId,
      source: originalBooking.source,
      notes: originalBooking.notes,
      rescheduledFrom: originalBooking._id,
    });

    await newBooking.save();

    originalBooking.status = 'cancelled';
    originalBooking.cancelledAt = new Date();
    originalBooking.cancelReason = rescheduleReason
      ? `Rescheduled: ${rescheduleReason}`
      : `Rescheduled to ${newDate} ${newStartTime}`;

    await originalBooking.save();

    if (originalBooking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(originalBooking.holdId, { status: 'released' });
    }

    const originalPopulated = await Booking.findById(originalBooking._id)
      .populate('packageId', 'name price durationMinutes type')
      .lean();

    const { notifyBookingStatusEmail } = require('../email/bookingStatusEmailService');
    notifyBookingStatusEmail({
      eventType: 'rescheduled',
      booking: originalPopulated || originalBooking.toObject?.() || originalBooking,
      pkg,
      newBooking: {
        bookingNumber: newBooking.bookingNumber,
        date: newBooking.date,
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
      },
      cancelReason: rescheduleReason || originalBooking.cancelReason,
    });

    return {
      success: true,
      originalBooking: {
        bookingId: originalBooking._id,
        bookingNumber: originalBooking.bookingNumber,
        status: originalBooking.status,
      },
      newBooking: {
        bookingId: newBooking._id,
        bookingNumber: newBooking.bookingNumber,
        date: newBooking.date,
        startTime: newBooking.startTime,
        endTime: newBooking.endTime,
        status: newBooking.status,
        paymentStatus: newBooking.paymentStatus,
        package: {
          name: pkg.name,
          price: pkg.price,
          durationMinutes: pkg.durationMinutes,
        },
      },
    };
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return { success: false, error: 'Failed to reschedule booking' };
  }
}

module.exports = {
  rescheduleBooking,
};
