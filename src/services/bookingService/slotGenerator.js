const BookingSettings = require('../../models/bookingSettings');
const Booking = require('../../models/booking');
const BookingPackage = require('../../models/bookingPackage');
const BookingAvailability = require('../../models/bookingAvailability');
const BookingBlockedDate = require('../../models/bookingBlockedDate');
const BookingSlotHold = require('../../models/bookingSlotHold');
const { getBlockingIntervals, intervalsOverlap } = require('./overlapValidator');
const { expireStalePendingBookings } = require('./expireStalePendingBookings');
const {
  timeToMinutes,
  minutesToTime,
  getDayOfWeekInTimezone,
  getCurrentDateInTimezone,
  isTimeInPast,
  isValidDateYYYYMMDD,
} = require('./timeUtils');

async function getAvailableSlots(packageId, date, options = {}) {
  if (!isValidDateYYYYMMDD(date)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD', slots: [] };
  }

  await expireStalePendingBookings();

  const settings = await BookingSettings.getSettings();
  if (!settings.isEnabled) {
    return { success: false, error: 'Booking is disabled', slots: [] };
  }

  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive', slots: [] };
  }

  const timezone = settings.timezone || 'Europe/London';
  const dayOfWeek = getDayOfWeekInTimezone(date, timezone);
  const maxAdvanceDays = settings.maxAdvanceBookingDays || 60;
  const currentDate = getCurrentDateInTimezone(timezone);
  const [curY, curM, curD] = currentDate.split('-').map(Number);
  const maxDt = new Date(Date.UTC(curY, curM - 1, curD));
  maxDt.setUTCDate(maxDt.getUTCDate() + maxAdvanceDays);
  const maxDateStr = maxDt.toISOString().split('T')[0];

  if (date < currentDate || date > maxDateStr) {
    return { success: false, error: 'Date is outside the allowed booking window', slots: [] };
  }

  const isBlocked = await BookingBlockedDate.findOne({
    type: pkg.type,
    date,
    isActive: true,
  }).lean();

  if (isBlocked) {
    return { success: true, error: null, slots: [], blocked: true, reason: isBlocked.reason };
  }

  const availabilityWindows = await BookingAvailability.find({
    type: pkg.type,
    dayOfWeek,
    isActive: true,
  })
    .sort({ startTime: 1 })
    .lean();

  if (availabilityWindows.length === 0) {
    return { success: true, error: null, slots: [], noAvailability: true };
  }

  const slotInterval = settings.slotIntervalMinutes || 30;
  const minAdvanceHours = settings.minAdvanceBookingHours || 0;
  const packageDuration = pkg.durationMinutes;

  let candidates = [];

  for (const window of availabilityWindows) {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);

    let t = windowStart;
    while (t + packageDuration <= windowEnd) {
      const startTime = minutesToTime(t);
      const endTime = minutesToTime(t + packageDuration);
      candidates.push({ startTime, endTime });
      t += slotInterval;
    }
  }

  const blockingIntervals = await getBlockingIntervals(pkg.type, date, {
    excludeBookingId: options.excludeBookingId || undefined,
  });

  const slots = candidates.map((slot) => {
    if (isTimeInPast(date, slot.startTime, minAdvanceHours, timezone)) {
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: false,
        unavailableReason: 'past',
      };
    }

    for (const interval of blockingIntervals) {
      if (intervalsOverlap(slot.startTime, slot.endTime, interval.startTime, interval.endTime)) {
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          available: false,
          unavailableReason: 'booked',
        };
      }
    }

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: true,
    };
  });

  const availableCount = slots.filter((s) => s.available).length;
  const bookableOrBookedCount = slots.filter((s) => s.unavailableReason !== 'past').length;
  const fullyBooked = bookableOrBookedCount > 0 && availableCount === 0;

  return {
    success: true,
    error: null,
    slots,
    availableCount,
    fullyBooked,
    package: {
      id: pkg._id,
      name: pkg.name,
      type: pkg.type,
      durationMinutes: pkg.durationMinutes,
      durationDisplayUnit: pkg.durationDisplayUnit || 'minutes',
      price: pkg.price,
    },
    date,
    dayOfWeek,
    timezone,
  };
}

/**
 * Month overview for calendar dots.
 * status per date: 'good' | 'low' | 'full' | 'closed' | 'past'
 */
async function getMonthAvailability(packageId, month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) {
    return { success: false, error: 'Invalid month format. Use YYYY-MM', days: {} };
  }

  await expireStalePendingBookings();

  const settings = await BookingSettings.getSettings();
  if (!settings.isEnabled) {
    return { success: false, error: 'Booking is disabled', days: {} };
  }

  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive', days: {} };
  }

  const timezone = settings.timezone || 'Europe/London';
  const slotInterval = settings.slotIntervalMinutes || 30;
  const minAdvanceHours = settings.minAdvanceBookingHours || 0;
  const packageDuration = pkg.durationMinutes;
  const maxAdvanceDays = settings.maxAdvanceBookingDays || 60;
  const currentDate = getCurrentDateInTimezone(timezone);
  const [curY, curM, curD] = currentDate.split('-').map(Number);
  const maxDt = new Date(Date.UTC(curY, curM - 1, curD));
  maxDt.setUTCDate(maxDt.getUTCDate() + maxAdvanceDays);
  const maxDateStr = maxDt.toISOString().split('T')[0];

  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const [availabilityWindows, blockedDates, bookings, holds] = await Promise.all([
    BookingAvailability.find({ type: pkg.type, isActive: true }).sort({ startTime: 1 }).lean(),
    BookingBlockedDate.find({
      type: pkg.type,
      isActive: true,
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .select('date')
      .lean(),
    Booking.find({
      type: pkg.type,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['pending', 'confirmed', 'completed'] },
      isdeleted: false,
    })
      .select('date startTime endTime')
      .lean(),
    BookingSlotHold.find({
      type: pkg.type,
      date: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ['active', 'converting'] },
      expiresAt: { $gt: new Date() },
    })
      .select('date startTime endTime')
      .lean(),
  ]);

  const windowsByDow = {};
  for (const w of availabilityWindows) {
    const dow = Number(w.dayOfWeek);
    if (!windowsByDow[dow]) windowsByDow[dow] = [];
    windowsByDow[dow].push(w);
  }

  const blockedSet = new Set(blockedDates.map((b) => b.date));
  const intervalsByDate = {};
  for (const row of [...bookings, ...holds]) {
    if (!intervalsByDate[row.date]) intervalsByDate[row.date] = [];
    intervalsByDate[row.date].push({ startTime: row.startTime, endTime: row.endTime });
  }

  const candidatesByDow = {};
  for (const [dow, windows] of Object.entries(windowsByDow)) {
    const candidates = [];
    for (const window of windows) {
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);
      let t = windowStart;
      while (t + packageDuration <= windowEnd) {
        candidates.push({
          startTime: minutesToTime(t),
          endTime: minutesToTime(t + packageDuration),
        });
        t += slotInterval;
      }
    }
    candidatesByDow[dow] = candidates;
  }

  const days = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    if (date < currentDate || date > maxDateStr) {
      days[date] = { status: 'past', availableCount: 0, totalCount: 0 };
      continue;
    }
    if (blockedSet.has(date)) {
      days[date] = { status: 'full', availableCount: 0, totalCount: 0 };
      continue;
    }

    const dow = getDayOfWeekInTimezone(date, timezone);
    const candidates = candidatesByDow[dow] || [];
    if (candidates.length === 0) {
      days[date] = { status: 'closed', availableCount: 0, totalCount: 0 };
      continue;
    }

    const intervals = intervalsByDate[date] || [];
    let availableCount = 0;
    let bookableCount = 0;

    for (const slot of candidates) {
      if (isTimeInPast(date, slot.startTime, minAdvanceHours, timezone)) {
        continue;
      }
      bookableCount += 1;
      let blocked = false;
      for (const interval of intervals) {
        if (intervalsOverlap(slot.startTime, slot.endTime, interval.startTime, interval.endTime)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) availableCount += 1;
    }

    if (bookableCount === 0) {
      days[date] = { status: 'full', availableCount: 0, totalCount: 0 };
      continue;
    }

    if (availableCount === 0) {
      days[date] = { status: 'full', availableCount: 0, totalCount: bookableCount };
      continue;
    }

    const ratio = availableCount / bookableCount;
    // ≤40% open (or ≤3 slots left on larger days) = filling up
    const status =
      ratio <= 0.4 || (bookableCount >= 6 && availableCount <= 3) ? 'low' : 'good';

    days[date] = { status, availableCount, totalCount: bookableCount };
  }

  return {
    success: true,
    error: null,
    month,
    timezone,
    days,
  };
}

module.exports = {
  getAvailableSlots,
  getMonthAvailability,
};
