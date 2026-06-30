const ANALYTICS_TIMEZONE = 'Europe/London';
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value.trim())) return false;
  const [y, m, d] = value.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseCalendarDate(value) {
  if (!isValidCalendarDate(value)) return null;
  return value.trim();
}

function normalizeWallClockParts(parts) {
  let hour = Number(parts.hour);
  let day = Number(parts.day);
  let month = Number(parts.month);
  let year = Number(parts.year);

  // Node/ICU can format UK midnight as hour 24 on the same calendar day.
  if (hour === 24) {
    hour = 0;
  }

  return { year, month, day, hour, minute: Number(parts.minute), second: Number(parts.second) };
}

/**
 * Find the UTC instant that corresponds to a UK-local wall-clock time.
 */
function ukLocalToUtc(year, month, day, hour, minute, second, millisecond = 0) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ANALYTICS_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let guess = Date.UTC(year, month - 1, day, hour, minute, second, 0);

  for (let i = 0; i < 6; i += 1) {
    const raw = {};
    dtf.formatToParts(new Date(guess)).forEach((part) => {
      if (part.type !== 'literal') raw[part.type] = part.value;
    });
    const parts = normalizeWallClockParts(raw);

    const currentAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = targetAsUtc - currentAsUtc;

    if (delta === 0) break;
    guess += delta;
  }

  return new Date(guess + millisecond);
}

function ukStartOfDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return ukLocalToUtc(year, month, day, 0, 0, 0, 0);
}

function ukEndOfDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return ukLocalToUtc(year, month, day, 23, 59, 59, 999);
}

function getUkCalendarDateString(utcDate = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: ANALYTICS_TIMEZONE,
  }).format(utcDate);
}

function addUkCalendarDays(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const noonUtc = ukLocalToUtc(year, month, day, 12, 0, 0, 0);
  const shifted = new Date(noonUtc.getTime() + days * 24 * 60 * 60 * 1000);
  return getUkCalendarDateString(shifted);
}

function formatUkLocalLabel(dateStr, timeLabel) {
  return `${dateStr} ${timeLabel}`;
}

function formatUkRangeLabel(startDateStr, endDateStr) {
  const labelOpts = { day: 'numeric', month: 'short', year: 'numeric', timeZone: ANALYTICS_TIMEZONE };
  const start = ukStartOfDay(startDateStr).toLocaleDateString('en-GB', labelOpts);
  const end = ukStartOfDay(endDateStr).toLocaleDateString('en-GB', labelOpts);
  return `${start} – ${end}`;
}

/**
 * Resolve analytics date window from query params in UK business timezone.
 * Defaults to the last 30 UK calendar days (inclusive).
 * @param {{ startDate?: string, endDate?: string }} query
 */
function resolveAnalyticsDateRange(query = {}) {
  let queryStartDate = parseCalendarDate(query.startDate);
  let queryEndDate = parseCalendarDate(query.endDate);

  if (!queryStartDate || !queryEndDate) {
    queryEndDate = getUkCalendarDateString(new Date());
    queryStartDate = addUkCalendarDays(queryEndDate, -29);
  }

  if (queryStartDate > queryEndDate) {
    const swap = queryStartDate;
    queryStartDate = queryEndDate;
    queryEndDate = swap;
  }

  const startDate = ukStartOfDay(queryStartDate);
  const endDate = ukEndOfDay(queryEndDate);

  return {
    timezone: ANALYTICS_TIMEZONE,
    queryStartDate,
    queryEndDate,
    startDate,
    endDate,
    startDateLocal: formatUkLocalLabel(queryStartDate, '00:00:00.000'),
    endDateLocal: formatUkLocalLabel(queryEndDate, '23:59:59.999'),
    selectedRangeLabel: formatUkRangeLabel(queryStartDate, queryEndDate),
  };
}

module.exports = {
  ANALYTICS_TIMEZONE,
  isValidCalendarDate,
  ukStartOfDay,
  ukEndOfDay,
  resolveAnalyticsDateRange,
  formatUkRangeLabel,
  getUkCalendarDateString,
  addUkCalendarDays,
};
