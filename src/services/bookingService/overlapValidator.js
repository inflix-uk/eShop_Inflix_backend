const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const { timeToMinutes } = require('./timeUtils');

function intervalsOverlap(startA, endA, startB, endB) {
  const startAMin = timeToMinutes(startA);
  const endAMin = timeToMinutes(endA);
  const startBMin = timeToMinutes(startB);
  const endBMin = timeToMinutes(endB);

  return startAMin < endBMin && endAMin > startBMin;
}

async function getBlockingBookings(type, date, excludeBookingId = null) {
  const filter = {
    type,
    date,
    status: { $in: ['pending', 'confirmed', 'completed'] },
    isdeleted: false,
  };

  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }

  return Booking.find(filter).select('startTime endTime').lean();
}

async function getActiveHolds(type, date, excludeHoldId = null) {
  const filter = {
    type,
    date,
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  if (excludeHoldId) {
    filter._id = { $ne: excludeHoldId };
  }

  return BookingSlotHold.find(filter).select('startTime endTime').lean();
}

async function getBlockingIntervals(type, date, options = {}) {
  const { excludeBookingId, excludeHoldId } = options;

  const [bookings, holds] = await Promise.all([
    getBlockingBookings(type, date, excludeBookingId),
    getActiveHolds(type, date, excludeHoldId),
  ]);

  const intervals = [];

  for (const b of bookings) {
    intervals.push({ startTime: b.startTime, endTime: b.endTime, source: 'booking' });
  }

  for (const h of holds) {
    intervals.push({ startTime: h.startTime, endTime: h.endTime, source: 'hold' });
  }

  return intervals;
}

async function checkOverlap(type, date, startTime, endTime, options = {}) {
  const intervals = await getBlockingIntervals(type, date, options);

  for (const interval of intervals) {
    if (intervalsOverlap(startTime, endTime, interval.startTime, interval.endTime)) {
      return {
        hasConflict: true,
        conflictWith: interval,
      };
    }
  }

  return { hasConflict: false, conflictWith: null };
}

module.exports = {
  intervalsOverlap,
  getBlockingIntervals,
  checkOverlap,
};
