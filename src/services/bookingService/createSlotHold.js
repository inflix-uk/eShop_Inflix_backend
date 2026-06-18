const mongoose = require('mongoose');
const BookingSlotHold = require('../../models/bookingSlotHold');
const BookingPackage = require('../../models/bookingPackage');
const BookingSettings = require('../../models/bookingSettings');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');

async function createSlotHold({ packageId, date, startTime, sessionId, userId }) {
  if (!packageId || !date || !startTime) {
    return { success: false, error: 'packageId, date, and startTime are required' };
  }

  if (!isValidDateYYYYMMDD(date)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }

  if (!isValidTimeHHmm(startTime)) {
    return { success: false, error: 'Invalid startTime format. Use HH:mm' };
  }

  const settings = await BookingSettings.getSettings();
  if (!settings.isEnabled) {
    return { success: false, error: 'Booking is disabled' };
  }

  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive' };
  }

  const endTime = addMinutesToTime(startTime, pkg.durationMinutes);

  try {
    const conflict = await checkOverlap(pkg.type, date, startTime, endTime);

    if (conflict.hasConflict) {
      return {
        success: false,
        error: 'Slot is no longer available',
        conflict: conflict.conflictWith,
      };
    }

    const holdDurationMinutes = settings.holdDurationMinutes || 15;
    const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);

    const hold = new BookingSlotHold({
      packageId,
      type: pkg.type,
      date,
      startTime,
      endTime,
      sessionId: sessionId || null,
      userId: userId || null,
      status: 'active',
      expiresAt,
    });

    await hold.save();

    return {
      success: true,
      hold: {
        holdId: hold._id,
        packageId: hold.packageId,
        type: hold.type,
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        expiresAt: hold.expiresAt,
      },
    };
  } catch (error) {
    console.error('Error creating slot hold:', error);
    return { success: false, error: 'Failed to create slot hold' };
  }
}

async function releaseHold(holdId) {
  const hold = await BookingSlotHold.findOneAndUpdate(
    { _id: holdId, status: 'active' },
    { status: 'released' },
    { new: true }
  );

  return hold ? { success: true } : { success: false, error: 'Hold not found or already released' };
}

module.exports = {
  createSlotHold,
  releaseHold,
};
