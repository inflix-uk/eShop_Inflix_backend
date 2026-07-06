const BookingSettings = require('../../models/bookingSettings');
const BookingPackage = require('../../models/bookingPackage');
const BookingAvailability = require('../../models/bookingAvailability');
const BookingBlockedDate = require('../../models/bookingBlockedDate');
const {
  timeToMinutes,
  getDayOfWeekInTimezone,
  getCurrentDateInTimezone,
  isTimeInPast,
  isValidDateYYYYMMDD,
  isValidTimeHHmm,
  addMinutesToTime,
} = require('./timeUtils');

function getMaxDateStr(currentDate, maxAdvanceDays) {
  const [curY, curM, curD] = currentDate.split('-').map(Number);
  const maxDt = new Date(Date.UTC(curY, curM - 1, curD));
  maxDt.setUTCDate(maxDt.getUTCDate() + maxAdvanceDays);
  return maxDt.toISOString().split('T')[0];
}

/**
 * Enforce booking settings: window, blocked dates, availability windows, min advance hours.
 */
async function validateSlotEligibility({
  packageId,
  date,
  startTime,
  endTime,
  type,
  settings,
  pkg,
}) {
  if (!isValidDateYYYYMMDD(date)) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }

  if (!isValidTimeHHmm(startTime)) {
    return { valid: false, error: 'Invalid startTime format. Use HH:mm' };
  }

  const resolvedSettings = settings || (await BookingSettings.getSettings());
  if (!resolvedSettings.isEnabled) {
    return { valid: false, error: 'Booking is disabled' };
  }

  let resolvedPkg = pkg;
  if (!resolvedPkg && packageId) {
    resolvedPkg = await BookingPackage.findOne({
      _id: packageId,
      isdeleted: false,
      isActive: true,
    }).lean();
  }

  if (!resolvedPkg) {
    return { valid: false, error: 'Package not found or inactive' };
  }

  const slotType = type || resolvedPkg.type;
  const timezone = resolvedSettings.timezone || 'Europe/London';
  const currentDate = getCurrentDateInTimezone(timezone);
  const maxAdvanceDays = resolvedSettings.maxAdvanceBookingDays || 60;
  const maxDateStr = getMaxDateStr(currentDate, maxAdvanceDays);

  if (date < currentDate || date > maxDateStr) {
    return { valid: false, error: 'Date is outside the allowed booking window' };
  }

  const blocked = await BookingBlockedDate.findOne({
    type: slotType,
    date,
    isActive: true,
  }).lean();

  if (blocked) {
    return { valid: false, error: blocked.reason || 'This date is blocked' };
  }

  const minAdvanceHours = resolvedSettings.minAdvanceBookingHours || 0;
  if (isTimeInPast(date, startTime, minAdvanceHours, timezone)) {
    return { valid: false, error: 'This slot is too soon to book' };
  }

  const dayOfWeek = getDayOfWeekInTimezone(date, timezone);
  const windows = await BookingAvailability.find({
    type: slotType,
    dayOfWeek,
    isActive: true,
  }).lean();

  if (windows.length === 0) {
    return { valid: false, error: 'No availability on this day' };
  }

  const slotEnd = endTime || addMinutesToTime(startTime, resolvedPkg.durationMinutes);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(slotEnd);

  const fitsWindow = windows.some((window) => {
    const windowStart = timeToMinutes(window.startTime);
    const windowEnd = timeToMinutes(window.endTime);
    return startMin >= windowStart && endMin <= windowEnd;
  });

  if (!fitsWindow) {
    return { valid: false, error: 'Slot is outside available hours' };
  }

  return { valid: true, pkg: resolvedPkg, settings: resolvedSettings };
}

module.exports = {
  validateSlotEligibility,
  getMaxDateStr,
};
