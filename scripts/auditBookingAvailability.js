/**
 * Read-only audit: compare admin booking config vs API slot generation.
 * Usage: node scripts/auditBookingAvailability.js [packageId]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { getAvailableSlots } = require('../src/services/bookingService/slotGenerator');
const BookingPackage = require('../src/models/bookingPackage');
const BookingSettings = require('../src/models/bookingSettings');
const BookingAvailability = require('../src/models/bookingAvailability');
const BookingBlockedDate = require('../src/models/bookingBlockedDate');
const { getCurrentDateInTimezone } = require('../src/services/bookingService/timeUtils');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PACKAGE_ID = process.argv[2] || '6a4561616817afd688597360';

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().split('T')[0];
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected (read-only audit)\n');

  const pkg = await BookingPackage.findById(PACKAGE_ID).lean();
  if (!pkg) {
    console.error(`Package not found: ${PACKAGE_ID}`);
    process.exit(1);
  }

  const settings = await BookingSettings.getSettings();
  const timezone = settings.timezone || 'Europe/London';
  const maxDays = settings.maxAdvanceBookingDays || 60;
  const today = getCurrentDateInTimezone(timezone);
  const maxDate = addDays(today, maxDays);

  const availability = await BookingAvailability.find({ type: pkg.type, isActive: true })
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();

  const blockedDates = await BookingBlockedDate.find({
    type: pkg.type,
    isActive: true,
    date: { $gte: today, $lte: maxDate },
  })
    .sort({ date: 1 })
    .lean();

  console.log('=== PACKAGE ===');
  console.log(`  ID: ${pkg._id}`);
  console.log(`  Name: ${pkg.name}`);
  console.log(`  Type: ${pkg.type}`);
  console.log(`  Duration: ${pkg.durationMinutes} min`);
  console.log(`  Active: ${pkg.isActive}`);

  console.log('\n=== ADMIN SETTINGS ===');
  console.log(`  Enabled: ${settings.isEnabled}`);
  console.log(`  Timezone: ${timezone}`);
  console.log(`  Slot interval: ${settings.slotIntervalMinutes} min`);
  console.log(`  Min advance hours: ${settings.minAdvanceBookingHours}`);
  console.log(`  Max advance days: ${maxDays}`);
  console.log(`  Bookable window: ${today} → ${maxDate}`);

  console.log('\n=== ADMIN AVAILABILITY WINDOWS (by day of week) ===');
  if (!availability.length) {
    console.log('  (none configured)');
  } else {
    for (const w of availability) {
      console.log(
        `  ${DAY_NAMES[w.dayOfWeek]} (${w.dayOfWeek}): ${w.startTime} - ${w.endTime}`
      );
    }
  }

  const activeDays = [...new Set(availability.map((w) => w.dayOfWeek))].sort();
  console.log(`\n  Days with availability: ${activeDays.map((d) => DAY_NAMES[d]).join(', ') || 'none'}`);

  console.log('\n=== BLOCKED DATES (in window) ===');
  if (!blockedDates.length) {
    console.log('  (none)');
  } else {
    for (const b of blockedDates) {
      console.log(`  ${b.date}${b.reason ? ` — ${b.reason}` : ''}`);
    }
  }

  console.log('\n=== API SLOT SCAN (per date) ===');
  let datesWithSlots = 0;
  let datesBlocked = 0;
  let datesNoAvailability = 0;
  let datesOutsideWindow = 0;
  let datesEmpty = 0;
  let totalSlots = 0;
  const sampleDates = [];

  for (let i = 0; i <= maxDays; i++) {
    const date = addDays(today, i);
    const result = await getAvailableSlots(PACKAGE_ID, date);

    if (!result.success) {
      if (result.error?.includes('outside')) datesOutsideWindow++;
      continue;
    }

    if (result.blocked) {
      datesBlocked++;
      continue;
    }

    if (result.noAvailability) {
      datesNoAvailability++;
      continue;
    }

    const count = result.slots?.length || 0;
    if (count > 0) {
      datesWithSlots++;
      totalSlots += count;
      if (sampleDates.length < 8) {
        sampleDates.push({
          date,
          day: DAY_NAMES[result.dayOfWeek],
          count,
          times: result.slots.map((s) => s.startTime).join(', '),
        });
      }
    } else {
      datesEmpty++;
    }
  }

  console.log(`  Total days scanned: ${maxDays + 1}`);
  console.log(`  Days WITH slots: ${datesWithSlots}`);
  console.log(`  Days blocked: ${datesBlocked}`);
  console.log(`  Days no weekly availability: ${datesNoAvailability}`);
  console.log(`  Days empty (past min-advance etc.): ${datesEmpty}`);
  console.log(`  Total bookable slots: ${totalSlots}`);

  console.log('\n=== SAMPLE DATES (first dates with slots) ===');
  for (const s of sampleDates) {
    console.log(`  ${s.date} (${s.day}): ${s.count} slots → ${s.times}`);
  }

  // Theoretical: count weekdays in window that have admin windows
  let theoreticalBookableDays = 0;
  for (let i = 0; i <= maxDays; i++) {
    const date = addDays(today, i);
    const d = new Date(`${date}T12:00:00`);
    const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone });
    const dayName = formatter.format(d);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dow = dayMap[dayName];
    if (activeDays.includes(dow) && !blockedDates.some((b) => b.date === date)) {
      theoreticalBookableDays++;
    }
  }

  console.log('\n=== COMPARISON ===');
  console.log(`  Admin active weekdays: ${activeDays.length} day(s) per week`);
  console.log(`  Theoretical bookable calendar days in window: ~${theoreticalBookableDays}`);
  console.log(`  API days actually showing slots: ${datesWithSlots}`);
  if (theoreticalBookableDays !== datesWithSlots) {
    console.log(
      `  ⚠ Difference likely due to: past times today (minAdvanceBookingHours), existing bookings/holds`
    );
  } else {
    console.log('  ✓ Calendar days with slots match admin weekday config (minus blocks)');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
