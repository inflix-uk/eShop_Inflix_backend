const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidTimeHHmm(value) {
  return typeof value === 'string' && TIME_REGEX.test(value.trim());
}

function isValidDateYYYYMMDD(value) {
  return typeof value === 'string' && DATE_REGEX.test(value.trim());
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addMinutesToTime(time, minutesToAdd) {
  const total = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(total);
}

function getDayOfWeekInTimezone(dateStr, timezone = 'Europe/London') {
  const date = new Date(`${dateStr}T12:00:00`);
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  });
  const dayName = formatter.format(date);
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[dayName] ?? new Date(dateStr).getDay();
}

function getCurrentTimeInTimezone(timezone = 'Europe/London') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });
  return formatter.format(now);
}

function getCurrentDateInTimezone(timezone = 'Europe/London') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
  return formatter.format(now);
}

function isTimeInPast(dateStr, timeStr, minAdvanceHours, timezone = 'Europe/London') {
  const currentDate = getCurrentDateInTimezone(timezone);
  const currentTime = getCurrentTimeInTimezone(timezone);

  if (dateStr < currentDate) return true;
  if (dateStr > currentDate) return false;

  const currentMinutes = timeToMinutes(currentTime);
  const slotMinutes = timeToMinutes(timeStr);
  const advanceMinutes = minAdvanceHours * 60;

  return slotMinutes < currentMinutes + advanceMinutes;
}

module.exports = {
  isValidTimeHHmm,
  isValidDateYYYYMMDD,
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  getDayOfWeekInTimezone,
  getCurrentTimeInTimezone,
  getCurrentDateInTimezone,
  isTimeInPast,
};
