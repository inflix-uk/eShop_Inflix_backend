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

function normalizeExcludeIds(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getBlockingBookings(type, date, excludeBookingIds = [], session = null) {
  const filter = {
    type,
    date,
    status: { $in: ['pending', 'confirmed', 'completed'] },
    isdeleted: false,
  };

  const excluded = normalizeExcludeIds(excludeBookingIds);
  if (excluded.length === 1) {
    filter._id = { $ne: excluded[0] };
  } else if (excluded.length > 1) {
    filter._id = { $nin: excluded };
  }

  let query = Booking.find(filter).select('startTime endTime').lean();
  if (session) query = query.session(session);
  return query;
}

async function getActiveHolds(type, date, excludeHoldIds = [], session = null) {
  const filter = {
    type,
    date,
    status: { $in: ['active', 'converting'] },
    expiresAt: { $gt: new Date() },
  };

  const excluded = normalizeExcludeIds(excludeHoldIds);
  if (excluded.length === 1) {
    filter._id = { $ne: excluded[0] };
  } else if (excluded.length > 1) {
    filter._id = { $nin: excluded };
  }

  let query = BookingSlotHold.find(filter).select('startTime endTime').lean();
  if (session) query = query.session(session);
  return query;
}

async function getBlockingIntervals(type, date, options = {}) {
  const { excludeBookingId, excludeBookingIds, excludeHoldId, excludeHoldIds, session } = options;
  const bookingExclusions = excludeBookingIds || excludeBookingId;
  const holdExclusions = excludeHoldIds || excludeHoldId;

  const [bookings, holds] = await Promise.all([
    getBlockingBookings(type, date, bookingExclusions, session),
    getActiveHolds(type, date, holdExclusions, session),
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
