const BookingSettings = require('../../models/bookingSettings');
const BookingPackage = require('../../models/bookingPackage');
const BookingAvailability = require('../../models/bookingAvailability');
const BookingBlockedDate = require('../../models/bookingBlockedDate');
const { getBlockingIntervals, intervalsOverlap } = require('./overlapValidator');
const {
  timeToMinutes,
  minutesToTime,
  getDayOfWeekInTimezone,
  getCurrentDateInTimezone,
  isTimeInPast,
  isValidDateYYYYMMDD,
} = require('./timeUtils');

async function getAvailableSlots(packageId, date) {
  if (!isValidDateYYYYMMDD(date)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD', slots: [] };
  }

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

  const blockingIntervals = await getBlockingIntervals(pkg.type, date);

  const availableSlots = candidates.filter((slot) => {
    if (isTimeInPast(date, slot.startTime, minAdvanceHours, timezone)) {
      return false;
    }

    for (const interval of blockingIntervals) {
      if (intervalsOverlap(slot.startTime, slot.endTime, interval.startTime, interval.endTime)) {
        return false;
      }
    }

    return true;
  });

  return {
    success: true,
    error: null,
    slots: availableSlots,
    package: {
      id: pkg._id,
      name: pkg.name,
      type: pkg.type,
      durationMinutes: pkg.durationMinutes,
      price: pkg.price,
    },
    date,
    dayOfWeek,
    timezone,
  };
}

module.exports = {
  getAvailableSlots,
};
