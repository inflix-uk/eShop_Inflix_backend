const mongoose = require('mongoose');
const BookingSlotHold = require('../../models/bookingSlotHold');
const { checkOverlap } = require('./overlapValidator');

function isDuplicateKeyError(error) {
  return error && (error.code === 11000 || error.code === 11001);
}

/**
 * Re-check overlap immediately before persisting, then save inside an optional transaction.
 */
async function reserveWithOverlapCheck({
  type,
  date,
  startTime,
  endTime,
  excludeHoldIds,
  excludeBookingIds,
  saveFn,
}) {
  const run = async (session) => {
    const conflict = await checkOverlap(type, date, startTime, endTime, {
      excludeHoldIds,
      excludeBookingIds,
      session,
    });

    if (conflict.hasConflict) {
      return { success: false, error: 'Slot is no longer available', conflict: conflict.conflictWith };
    }

    try {
      const result = await saveFn(session);
      return { success: true, ...result };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return { success: false, error: 'Slot is no longer available' };
      }
      throw error;
    }
  };

  let session;
  try {
    session = await mongoose.startSession();
    let outcome;
    await session.withTransaction(async () => {
      outcome = await run(session);
      if (!outcome.success) {
        throw new Error('SLOT_CONFLICT_ABORT');
      }
    });
    return outcome;
  } catch (error) {
    if (error.message === 'SLOT_CONFLICT_ABORT') {
      return outcome;
    }
    if (
      error.message?.includes('Transaction numbers are only allowed on a replica set') ||
      error.message?.includes('replica set')
    ) {
      return run(null);
    }
    if (isDuplicateKeyError(error)) {
      return { success: false, error: 'Slot is no longer available' };
    }
    throw error;
  } finally {
    if (session) session.endSession();
  }
}

/**
 * Atomically claim an active hold before creating a booking (prevents double conversion).
 */
async function claimActiveHold(holdId) {
  return BookingSlotHold.findOneAndUpdate(
    {
      _id: holdId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: 'converting' } },
    { new: true }
  );
}

async function releaseClaimedHold(holdId) {
  await BookingSlotHold.findOneAndUpdate(
    { _id: holdId, status: 'converting' },
    { $set: { status: 'active', bookingId: null } }
  );
}

async function finalizeClaimedHold(holdId, bookingId) {
  await BookingSlotHold.findOneAndUpdate(
    { _id: holdId, status: 'converting' },
    { $set: { status: 'converted', bookingId } }
  );
}

module.exports = {
  isDuplicateKeyError,
  reserveWithOverlapCheck,
  claimActiveHold,
  releaseClaimedHold,
  finalizeClaimedHold,
};
