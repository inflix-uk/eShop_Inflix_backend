const mongoose = require('mongoose');
const Booking = require('../../models/booking');
const BookingPackage = require('../../models/bookingPackage');
const BookingSettings = require('../../models/bookingSettings');
const { generateBookingNumber } = require('./generateBookingNumber');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');
const {
  validateExtrasAgainstPackage,
  applyHourlyExtras,
  computeBookingTotals,
  resolveExtraMics,
  buildExtraMicLineItem,
  resolveEditingAddOn,
} = require('../../utils/bookingPricingUtils');
const {
  claimActiveHold,
  releaseClaimedHold,
  finalizeClaimedHold,
  isDuplicateKeyError,
} = require('./slotReservation');
const { expireStalePendingBookings } = require('./expireStalePendingBookings');
const { validateSlotEligibility } = require('./slotEligibility');

async function rollbackPartialGroupBooking(createdBookings, claimedHolds) {
  if (createdBookings.length > 0) {
    await Booking.updateMany(
      { _id: { $in: createdBookings.map((b) => b._id) } },
      { status: 'cancelled', paymentStatus: 'unpaid' }
    );
  }
  for (const hold of claimedHolds) {
    await releaseClaimedHold(hold._id);
  }
}

async function createBookingFromHold({
  holdId,
  customer,
  userId,
  notes,
  source,
  extras,
  extraMics,
  guestCount,
  editingPackageId,
}) {
  if (!holdId) {
    return { success: false, error: 'holdId is required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  await expireStalePendingBookings();

  const hold = await claimActiveHold(holdId);

  if (!hold) {
    return { success: false, error: 'Hold not found, expired, or already used' };
  }

  const pkg = await BookingPackage.findOne({
    _id: hold.packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    await releaseClaimedHold(holdId);
    return { success: false, error: 'Package not found or inactive' };
  }

  const extraResult = validateExtrasAgainstPackage(extras, pkg.extras, {
    maxQuantity: guestCount,
  });
  if (extraResult.error) {
    await releaseClaimedHold(holdId);
    return { success: false, error: extraResult.error };
  }

  const eligibility = await validateSlotEligibility({
    packageId: hold.packageId,
    date: hold.date,
    startTime: hold.startTime,
    endTime: hold.endTime,
    type: hold.type,
    pkg,
  });

  if (!eligibility.valid) {
    await releaseClaimedHold(holdId);
    return { success: false, error: eligibility.error };
  }

  try {
    const conflict = await checkOverlap(hold.type, hold.date, hold.startTime, hold.endTime, {
      excludeHoldId: hold._id,
    });

    if (conflict.hasConflict) {
      await releaseClaimedHold(holdId);
      return { success: false, error: 'Slot conflict detected', conflict: conflict.conflictWith };
    }

    const settings = await BookingSettings.getSettings();
    const resolvedMics = resolveExtraMics({
      extraMics,
      includedMics: pkg.includedMics,
      studioMicCapacity: settings.studioMicCapacity,
      maxGuests: pkg.maxGuests,
    });
    const hourlyExtras = applyHourlyExtras(extraResult.extras, 1);
    const micLine = buildExtraMicLineItem({
      extraMics: resolvedMics,
      pricePerHour: settings.extraMicPricePerHour,
      hours: 1,
    });
    const editingResult = await resolveEditingAddOn(editingPackageId);
    if (editingResult.error) {
      await releaseClaimedHold(holdId);
      return { success: false, error: editingResult.error };
    }
    const bookingExtras = [
      ...hourlyExtras.extras,
      ...(micLine ? [micLine] : []),
      ...(editingResult.line ? [editingResult.line] : []),
    ];
    const extrasWithMic =
      hourlyExtras.extrasSubtotal +
      (micLine ? micLine.price : 0) +
      (editingResult.subtotal || 0);

    const bookingNumber = await generateBookingNumber();
    const { slotsSubtotal, extrasSubtotal, totalAmount } = computeBookingTotals(
      pkg.price,
      1,
      extrasWithMic
    );

    const guestNote =
      guestCount != null && Number(guestCount) > 0
        ? `Guests: ${Math.max(1, Math.floor(Number(guestCount)))}`
        : '';
    const combinedNotes = [notes || '', guestNote].filter(Boolean).join('\n');

    const booking = new Booking({
      bookingNumber,
      packageId: hold.packageId,
      type: hold.type,
      userId: userId || null,
      customer: {
        name: String(customer.name).trim(),
        email: String(customer.email).trim().toLowerCase(),
        phone: customer.phone ? String(customer.phone).trim() : '',
      },
      date: hold.date,
      startTime: hold.startTime,
      endTime: hold.endTime,
      status: 'pending',
      paymentStatus: 'unpaid',
      holdId: hold._id,
      source: source || 'online',
      notes: combinedNotes,
      extras: bookingExtras,
      extrasSubtotal,
      slotsSubtotal,
      totalAmount,
    });

    await booking.save();
    await finalizeClaimedHold(hold._id, booking._id);

    const bookingResult = {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      packageId: booking.packageId,
      type: booking.type,
      customer: booking.customer,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      source: booking.source,
      notes: booking.notes,
      package: {
        name: pkg.name,
        price: pkg.price,
        durationMinutes: pkg.durationMinutes,
        durationDisplayUnit: pkg.durationDisplayUnit || 'minutes',
      },
      extras: booking.extras,
      extrasSubtotal: booking.extrasSubtotal,
      slotsSubtotal: booking.slotsSubtotal,
      totalAmount: booking.totalAmount,
    };

    const { notifyBookingCreatedAdminEmail } = require('../email/bookingCreatedAdminEmailService');
    notifyBookingCreatedAdminEmail({
      booking: bookingResult,
      pkg,
    });

    return {
      success: true,
      booking: bookingResult,
    };
  } catch (error) {
    console.error('Error creating booking from hold:', error);
    await releaseClaimedHold(holdId);
    if (isDuplicateKeyError(error)) {
      return { success: false, error: 'Slot is no longer available' };
    }
    return { success: false, error: 'Failed to create booking' };
  }
}

async function createAdminBooking({ packageId, date, startTime, customer, userId, notes, paymentStatus, status }) {
  if (!packageId || !date || !startTime) {
    return { success: false, error: 'packageId, date, and startTime are required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  if (!isValidDateYYYYMMDD(date)) {
    return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }

  if (!isValidTimeHHmm(startTime)) {
    return { success: false, error: 'Invalid startTime format. Use HH:mm' };
  }

  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found' };
  }

  const endTime = addMinutesToTime(startTime, pkg.durationMinutes);

  const settings = await BookingSettings.getSettings();
  const eligibility = await validateSlotEligibility({
    packageId,
    date,
    startTime,
    endTime,
    type: pkg.type,
    settings,
    pkg,
  });

  if (!eligibility.valid) {
    return { success: false, error: eligibility.error };
  }

  const conflict = await checkOverlap(pkg.type, date, startTime, endTime);
  if (conflict.hasConflict) {
    return { success: false, error: 'Slot is already booked', conflict: conflict.conflictWith };
  }

  const bookingNumber = await generateBookingNumber();

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
    date,
    startTime,
    endTime,
    status: status || 'confirmed',
    paymentStatus: paymentStatus || 'paid',
    source: 'admin',
    notes: notes || '',
  });

  try {
    await booking.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { success: false, error: 'Slot is already booked' };
    }
    throw error;
  }

  const bookingResult = {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    packageId: booking.packageId,
    type: booking.type,
    customer: booking.customer,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    source: booking.source,
    notes: booking.notes,
    package: {
      name: pkg.name,
      price: pkg.price,
      durationMinutes: pkg.durationMinutes,
      durationDisplayUnit: pkg.durationDisplayUnit || 'minutes',
    },
  };

  const { notifyBookingCreatedAdminEmail } = require('../email/bookingCreatedAdminEmailService');
  notifyBookingCreatedAdminEmail({
    booking: {
      ...bookingResult,
      totalAmount: Number(pkg.price) || 0,
    },
    pkg,
  });

  return {
    success: true,
    booking: bookingResult,
  };
}

async function createBookingsFromHolds({
  holdIds,
  customer,
  userId,
  notes,
  source,
  extras,
  extraMics,
  guestCount,
  editingPackageId,
}) {
  if (!Array.isArray(holdIds) || holdIds.length === 0) {
    return { success: false, error: 'holdIds array is required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  await expireStalePendingBookings();

  const claimedHolds = [];
  const createdBookings = [];

  try {
    for (const holdId of holdIds) {
      const hold = await claimActiveHold(holdId);
      if (!hold) {
        throw new Error('HOLD_CLAIM_FAILED');
      }
      claimedHolds.push(hold);
    }

    claimedHolds.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      return dateCmp !== 0 ? dateCmp : a.startTime.localeCompare(b.startTime);
    });

    const packageId = claimedHolds[0].packageId;
    const pkg = await BookingPackage.findOne({
      _id: packageId,
      isdeleted: false,
      isActive: true,
    }).lean();

    if (!pkg) {
      throw new Error('PACKAGE_NOT_FOUND');
    }

    const extraResult = validateExtrasAgainstPackage(extras, pkg.extras, {
      maxQuantity: guestCount,
    });
    if (extraResult.error) {
      await rollbackPartialGroupBooking(createdBookings, claimedHolds);
      return { success: false, error: extraResult.error };
    }

    const bookingGroupId = new mongoose.Types.ObjectId();
    const groupSettings = await BookingSettings.getSettings();
    const hoursBooked = claimedHolds.length;
    const resolvedMics = resolveExtraMics({
      extraMics,
      includedMics: pkg.includedMics,
      studioMicCapacity: groupSettings.studioMicCapacity,
      maxGuests: pkg.maxGuests,
    });
    const hourlyExtras = applyHourlyExtras(extraResult.extras, hoursBooked);
    const micLine = buildExtraMicLineItem({
      extraMics: resolvedMics,
      pricePerHour: groupSettings.extraMicPricePerHour,
      hours: hoursBooked,
    });
    const editingResult = await resolveEditingAddOn(editingPackageId);
    if (editingResult.error) {
      await rollbackPartialGroupBooking(createdBookings, claimedHolds);
      return { success: false, error: editingResult.error };
    }
    // Editing is per episode (flat) — attach once on the group total, not × hours.
    const bookingExtras = [
      ...hourlyExtras.extras,
      ...(micLine ? [micLine] : []),
      ...(editingResult.line ? [editingResult.line] : []),
    ];
    const extrasWithMic =
      hourlyExtras.extrasSubtotal +
      (micLine ? micLine.price : 0) +
      (editingResult.subtotal || 0);
    const { slotsSubtotal, extrasSubtotal, totalAmount } = computeBookingTotals(
      pkg.price,
      hoursBooked,
      extrasWithMic
    );
    const guestNote =
      guestCount != null && Number(guestCount) > 0
        ? `Guests: ${Math.max(1, Math.floor(Number(guestCount)))}`
        : '';
    const combinedNotes = [notes || '', guestNote].filter(Boolean).join('\n');

    for (const hold of claimedHolds) {
      if (String(hold.packageId) !== String(packageId)) {
        await rollbackPartialGroupBooking(createdBookings, claimedHolds);
        return { success: false, error: 'All holds must belong to the same package' };
      }

      const eligibility = await validateSlotEligibility({
        packageId: hold.packageId,
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        type: hold.type,
        settings: groupSettings,
        pkg,
      });

      if (!eligibility.valid) {
        await rollbackPartialGroupBooking(createdBookings, claimedHolds);
        return { success: false, error: eligibility.error };
      }

      const conflict = await checkOverlap(hold.type, hold.date, hold.startTime, hold.endTime, {
        excludeHoldIds: claimedHolds.map((h) => h._id),
        excludeBookingIds: createdBookings.map((b) => b._id),
      });

      if (conflict.hasConflict) {
        await rollbackPartialGroupBooking(createdBookings, claimedHolds);
        return { success: false, error: 'Slot conflict detected', conflict: conflict.conflictWith };
      }

      const bookingNumber = await generateBookingNumber();
      const booking = new Booking({
        bookingNumber,
        packageId: hold.packageId,
        type: hold.type,
        userId: userId || null,
        customer: {
          name: String(customer.name).trim(),
          email: String(customer.email).trim().toLowerCase(),
          phone: customer.phone ? String(customer.phone).trim() : '',
        },
        date: hold.date,
        startTime: hold.startTime,
        endTime: hold.endTime,
        status: 'pending',
        paymentStatus: 'unpaid',
        holdId: hold._id,
        bookingGroupId,
        groupBookingNumber:
          createdBookings.length === 0 ? bookingNumber : createdBookings[0].bookingNumber,
        source: source || 'online',
        notes: combinedNotes,
        extras: bookingExtras,
        extrasSubtotal,
        slotsSubtotal: pkg.price,
        totalAmount,
      });

      await booking.save();
      await finalizeClaimedHold(hold._id, booking._id);
      createdBookings.push(booking);
    }

    const groupBookingNumber = createdBookings[0].bookingNumber;
    if (createdBookings.length > 1) {
      await Booking.updateMany(
        { _id: { $in: createdBookings.map((b) => b._id) } },
        { groupBookingNumber }
      );
      createdBookings.forEach((b) => {
        b.groupBookingNumber = groupBookingNumber;
      });
    }

    const bookingPayload = (booking) => ({
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      packageId: booking.packageId,
      type: booking.type,
      customer: booking.customer,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      source: booking.source,
      notes: booking.notes,
      package: {
        name: pkg.name,
        price: pkg.price,
        durationMinutes: pkg.durationMinutes,
        durationDisplayUnit: pkg.durationDisplayUnit || 'minutes',
      },
      extras: booking.extras,
      extrasSubtotal: booking.extrasSubtotal,
      slotsSubtotal: booking.slotsSubtotal,
      totalAmount: booking.totalAmount,
    });

    const primary = bookingPayload(createdBookings[0]);

    const { notifyBookingCreatedAdminEmail } = require('../email/bookingCreatedAdminEmailService');
    notifyBookingCreatedAdminEmail({
      booking: {
        ...primary,
        slotCount: createdBookings.length,
        totalAmount,
      },
      pkg,
      groupBookingNumber,
      slots: createdBookings.map((b) => ({
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        bookingNumber: b.bookingNumber,
      })),
    });

    return {
      success: true,
      bookingGroupId,
      groupBookingNumber,
      bookings: createdBookings.map(bookingPayload),
      totalAmount,
      booking: {
        ...primary,
        slotCount: createdBookings.length,
      },
    };
  } catch (error) {
    console.error('Error creating bookings from holds:', error);
    await rollbackPartialGroupBooking(createdBookings, claimedHolds);
    if (error.message === 'HOLD_CLAIM_FAILED') {
      return { success: false, error: 'One or more holds not found, expired, or already used' };
    }
    if (error.message === 'PACKAGE_NOT_FOUND') {
      return { success: false, error: 'Package not found or inactive' };
    }
    if (isDuplicateKeyError(error)) {
      return { success: false, error: 'Slot is no longer available' };
    }
    return { success: false, error: 'Failed to create bookings' };
  }
}

module.exports = {
  createBookingFromHold,
  createBookingsFromHolds,
  createAdminBooking,
};
