const BookingSlotHold = require('../../models/bookingSlotHold');
const BookingPackage = require('../../models/bookingPackage');
const BookingSettings = require('../../models/bookingSettings');
const { checkOverlap, intervalsOverlap } = require('./overlapValidator');
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

function slotsOverlapInBatch(slots) {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (
        slots[i].date === slots[j].date &&
        intervalsOverlap(slots[i].startTime, slots[i].endTime, slots[j].startTime, slots[j].endTime)
      ) {
        return true;
      }
    }
  }
  return false;
}

async function createMultiSlotHold({ packageId, slots, sessionId, userId }) {
  if (!packageId || !Array.isArray(slots) || slots.length === 0) {
    return { success: false, error: 'packageId and slots array are required' };
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

  const normalizedSlots = [];
  for (const slot of slots) {
    if (!slot?.date || !slot?.startTime) {
      return { success: false, error: 'Each slot requires date and startTime' };
    }
    if (!isValidDateYYYYMMDD(slot.date)) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
    }
    if (!isValidTimeHHmm(slot.startTime)) {
      return { success: false, error: 'Invalid startTime format. Use HH:mm' };
    }
    normalizedSlots.push({
      date: slot.date,
      startTime: slot.startTime,
      endTime: addMinutesToTime(slot.startTime, pkg.durationMinutes),
    });
  }

  if (slotsOverlapInBatch(normalizedSlots)) {
    return { success: false, error: 'Selected slots overlap with each other' };
  }

  const holdDurationMinutes = settings.holdDurationMinutes || 15;
  const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000);
  const createdHolds = [];

  try {
    for (const slot of normalizedSlots) {
      const conflict = await checkOverlap(pkg.type, slot.date, slot.startTime, slot.endTime, {
        excludeHoldIds: createdHolds.map((h) => h._id),
      });

      if (conflict.hasConflict) {
        if (createdHolds.length > 0) {
          await BookingSlotHold.updateMany(
            { _id: { $in: createdHolds.map((h) => h._id) } },
            { status: 'released' }
          );
        }
        return {
          success: false,
          error: `Slot ${slot.date} ${slot.startTime} is no longer available`,
          conflict: conflict.conflictWith,
        };
      }

      const hold = new BookingSlotHold({
        packageId,
        type: pkg.type,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionId: sessionId || null,
        userId: userId || null,
        status: 'active',
        expiresAt,
      });

      await hold.save();
      createdHolds.push(hold);
    }

    return {
      success: true,
      holds: createdHolds.map((hold) => ({
        holdId: hold._id,
        packageId: hold.packageId,
        type: hold.type,
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        expiresAt: hold.expiresAt,
      })),
      expiresAt,
    };
  } catch (error) {
    console.error('Error creating multi slot hold:', error);
    if (createdHolds.length > 0) {
      await BookingSlotHold.updateMany(
        { _id: { $in: createdHolds.map((h) => h._id) } },
        { status: 'released' }
      );
    }
    return { success: false, error: 'Failed to create slot holds' };
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

async function releaseHolds(holdIds = []) {
  if (!Array.isArray(holdIds) || holdIds.length === 0) {
    return { success: false, error: 'holdIds array is required' };
  }

  const result = await BookingSlotHold.updateMany(
    { _id: { $in: holdIds }, status: 'active' },
    { status: 'released' }
  );

  return { success: true, releasedCount: result.modifiedCount };
}

module.exports = {
  createSlotHold,
  createMultiSlotHold,
  releaseHold,
  releaseHolds,
};
