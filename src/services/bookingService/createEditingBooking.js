const mongoose = require('mongoose');
const Booking = require('../../models/booking');
const BookingPackage = require('../../models/bookingPackage');
const BookingSettings = require('../../models/bookingSettings');
const { generateBookingNumber } = require('./generateBookingNumber');
const { getCurrentDateInTimezone } = require('./timeUtils');
const {
  isEditingPackage,
  validateExtrasAgainstPackage,
  applyEditingExtras,
  computeBookingTotals,
} = require('../../utils/bookingPricingUtils');

const FILE_SOURCES = ['studio', 'link'];
const EPISODE_COUNT_MAX = 20;
let slotIndexMigrated = false;

async function dropIndexIfPresent(name) {
  try {
    const indexes = await Booking.collection.indexes();
    if (indexes.some((idx) => idx.name === name)) {
      await Booking.collection.dropIndex(name);
    }
  } catch (error) {
    if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) {
      console.warn(`Could not drop ${name}:`, error.message);
    }
  }
}

/**
 * Drop incompatible unique indexes so queue (editing) bookings can insert.
 * Mongo rejects $ne in partial indexes; unique holdId_1 treats null as a key.
 * Safe to call repeatedly.
 */
async function ensureQueueFriendlySlotIndex() {
  if (slotIndexMigrated) return;

  try {
    await Booking.updateMany(
      { bookingMode: { $exists: false } },
      { $set: { bookingMode: 'slot' } }
    );
  } catch (error) {
    console.warn('Could not backfill bookingMode:', error.message);
  }

  await dropIndexIfPresent('unique_active_booking_slot');
  await dropIndexIfPresent('unique_active_booking_slot_v2');
  await dropIndexIfPresent('holdId_1');

  try {
    await Booking.syncIndexes();
    slotIndexMigrated = true;
  } catch (error) {
    console.warn('Booking.syncIndexes failed:', error.message);
  }
}

function normalizeEpisodeCount(value) {
  const n = Math.floor(Number(value) || 1);
  return Math.min(EPISODE_COUNT_MAX, Math.max(1, n));
}

function normalizeEpisodeLength(value, pkg) {
  const requested = Math.floor(Number(value) || 0);
  const covered = Math.max(1, Math.floor(Number(pkg?.durationMinutes) || 60));
  return requested > 0 ? requested : covered;
}

function normalizeFileSource(value) {
  const src = String(value || '').trim().toLowerCase();
  return FILE_SOURCES.includes(src) ? src : 'link';
}

async function createEditingBooking({
  packageId,
  customer,
  userId,
  notes,
  extras,
  episodeCount,
  episodeLengthMinutes,
  fileSource,
  fileLink,
  fileLinkLater,
  source = 'online',
}) {
  if (!packageId || !mongoose.Types.ObjectId.isValid(String(packageId))) {
    return { success: false, error: 'packageId is required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  await ensureQueueFriendlySlotIndex();

  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive' };
  }

  if (!isEditingPackage(pkg)) {
    return { success: false, error: 'This package requires a studio time slot' };
  }

  const coveredMinutes = Math.max(1, Math.floor(Number(pkg.durationMinutes) || 60));
  const episodes = normalizeEpisodeCount(episodeCount);
  const length = normalizeEpisodeLength(episodeLengthMinutes, pkg);

  if (length > coveredMinutes) {
    return {
      success: false,
      error: `${pkg.name} covers up to ${coveredMinutes} min. Choose a shorter episode or switch package.`,
    };
  }

  const sourceKind = normalizeFileSource(fileSource);
  const later = Boolean(fileLinkLater) && sourceKind === 'link';
  const link = sourceKind === 'link' && !later ? String(fileLink || '').trim() : '';

  const extraResult = validateExtrasAgainstPackage(extras, pkg.extras, {
    maxQuantity: EPISODE_COUNT_MAX,
  });
  if (extraResult.error) {
    return { success: false, error: extraResult.error };
  }

  const pricedExtras = applyEditingExtras(extraResult.extras, episodes);
  const { slotsSubtotal, extrasSubtotal, totalAmount } = computeBookingTotals(
    pkg.price,
    episodes,
    pricedExtras.extrasSubtotal
  );

  const settings = await BookingSettings.getSettings();
  const timezone = settings.timezone || 'Europe/London';
  const placedDate = getCurrentDateInTimezone(timezone);

  const bookingNumber = await generateBookingNumber();
  const fileNoteParts = [];
  if (sourceKind === 'studio') {
    fileNoteParts.push('Files: recorded at the studio');
  } else if (later) {
    fileNoteParts.push('Files: link to be sent within 48 hrs');
  } else if (link) {
    fileNoteParts.push(`Files: ${link}`);
  }
  const extraNotes = [notes, ...fileNoteParts].filter(Boolean).join('\n');

  const booking = new Booking({
    bookingNumber,
    packageId,
    type: pkg.type,
    userId: userId || null,
    customer: {
      name: String(customer.name).trim(),
      email: String(customer.email).trim().toLowerCase(),
      phone: customer.phone ? String(customer.phone).trim() : '',
    },
    bookingMode: 'queue',
    episodeCount: episodes,
    episodeLengthMinutes: length,
    fileSource: sourceKind,
    fileLink: link,
    fileLinkLater: later,
    date: placedDate,
    startTime: '',
    endTime: '',
    status: 'pending',
    paymentStatus: 'unpaid',
    source,
    notes: extraNotes,
    extras: pricedExtras.extras,
    extrasSubtotal,
    slotsSubtotal,
    totalAmount,
  });

  await booking.save();

  const bookingResult = {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    packageId: booking.packageId,
    type: booking.type,
    bookingMode: 'queue',
    customer: booking.customer,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    source: booking.source,
    notes: booking.notes,
    extras: booking.extras,
    extrasSubtotal,
    slotsSubtotal,
    totalAmount,
    episodeCount: episodes,
    episodeLengthMinutes: length,
    fileSource: sourceKind,
    fileLink: link,
    fileLinkLater: later,
    package: {
      name: pkg.name,
      price: pkg.price,
      durationMinutes: pkg.durationMinutes,
      durationDisplayUnit: pkg.durationDisplayUnit || 'minutes',
      pricingMode: pkg.pricingMode || 'hourly',
    },
  };

  try {
    const { notifyBookingCreatedAdminEmail } = require('../email/bookingCreatedAdminEmailService');
    notifyBookingCreatedAdminEmail({
      booking: bookingResult,
      pkg,
    });
  } catch (err) {
    console.error('Editing booking admin email failed:', err.message);
  }

  return { success: true, booking: bookingResult, totalAmount };
}

module.exports = {
  createEditingBooking,
  ensureQueueFriendlySlotIndex,
};
