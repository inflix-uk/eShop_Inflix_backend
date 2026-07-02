const mongoose = require('mongoose');
const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const BookingPackage = require('../../models/bookingPackage');
const { generateBookingNumber } = require('./generateBookingNumber');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');

function normalizeBookingExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras
    .map((item) => ({
      image: item?.image ? String(item.image).trim() : '',
      title: item?.title ? String(item.title).trim() : '',
      price:
        item?.price !== undefined && item?.price !== null && !Number.isNaN(Number(item.price))
          ? Math.max(0, Number(item.price))
          : 0,
      description: item?.description ? String(item.description).trim() : '',
    }))
    .filter((item) => item.title.length > 0);
}

function computeExtrasSubtotal(extras) {
  return extras.reduce((sum, extra) => sum + (extra.price || 0), 0);
}

async function createBookingFromHold({ holdId, customer, userId, notes, source, extras }) {
  if (!holdId) {
    return { success: false, error: 'holdId is required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  const hold = await BookingSlotHold.findOne({
    _id: holdId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });

  if (!hold) {
    return { success: false, error: 'Hold not found, expired, or already used' };
  }

  const pkg = await BookingPackage.findOne({
    _id: hold.packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive' };
  }

  try {
    const conflict = await checkOverlap(hold.type, hold.date, hold.startTime, hold.endTime, {
      excludeHoldId: hold._id,
    });

    if (conflict.hasConflict) {
      return { success: false, error: 'Slot conflict detected', conflict: conflict.conflictWith };
    }

    const bookingNumber = await generateBookingNumber();
    const normalizedExtras = normalizeBookingExtras(extras);
    const extrasSubtotal = computeExtrasSubtotal(normalizedExtras);
    const slotsSubtotal = pkg.price;
    const totalAmount = slotsSubtotal + extrasSubtotal;

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
      notes: notes || '',
      extras: normalizedExtras,
      extrasSubtotal,
      slotsSubtotal,
      totalAmount,
    });

    await booking.save();

    hold.status = 'converted';
    hold.bookingId = booking._id;
    await hold.save();

    return {
      success: true,
      booking: {
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
        package: {
          name: pkg.name,
          price: pkg.price,
          durationMinutes: pkg.durationMinutes,
        },
        extras: booking.extras,
        extrasSubtotal: booking.extrasSubtotal,
        slotsSubtotal: booking.slotsSubtotal,
        totalAmount: booking.totalAmount,
      },
    };
  } catch (error) {
    console.error('Error creating booking from hold:', error);
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

  await booking.save();

  return {
    success: true,
    booking: {
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
      package: {
        name: pkg.name,
        price: pkg.price,
        durationMinutes: pkg.durationMinutes,
      },
    },
  };
}

async function createBookingsFromHolds({ holdIds, customer, userId, notes, source, extras }) {
  if (!Array.isArray(holdIds) || holdIds.length === 0) {
    return { success: false, error: 'holdIds array is required' };
  }

  if (!customer || !customer.name || !customer.email) {
    return { success: false, error: 'customer.name and customer.email are required' };
  }

  const holds = await BookingSlotHold.find({
    _id: { $in: holdIds },
    status: 'active',
    expiresAt: { $gt: new Date() },
  }).sort({ date: 1, startTime: 1 });

  if (holds.length !== holdIds.length) {
    return { success: false, error: 'One or more holds not found, expired, or already used' };
  }

  const packageId = holds[0].packageId;
  const pkg = await BookingPackage.findOne({
    _id: packageId,
    isdeleted: false,
    isActive: true,
  }).lean();

  if (!pkg) {
    return { success: false, error: 'Package not found or inactive' };
  }

  const bookingGroupId = new mongoose.Types.ObjectId();
  const createdBookings = [];
  const normalizedExtras = normalizeBookingExtras(extras);
  const extrasSubtotal = computeExtrasSubtotal(normalizedExtras);
  const slotsSubtotal = pkg.price * holds.length;
  const totalAmount = slotsSubtotal + extrasSubtotal;

  try {
    for (const hold of holds) {
      if (String(hold.packageId) !== String(packageId)) {
        return { success: false, error: 'All holds must belong to the same package' };
      }

      const conflict = await checkOverlap(hold.type, hold.date, hold.startTime, hold.endTime, {
        excludeHoldIds: holds.map((h) => h._id),
        excludeBookingIds: createdBookings.map((b) => b._id),
      });

      if (conflict.hasConflict) {
        for (const booking of createdBookings) {
          await Booking.findByIdAndDelete(booking._id);
        }
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
        groupBookingNumber: createdBookings.length === 0 ? bookingNumber : createdBookings[0].bookingNumber,
        source: source || 'online',
        notes: notes || '',
        extras: normalizedExtras,
        extrasSubtotal,
        slotsSubtotal: pkg.price,
        totalAmount,
      });

      await booking.save();
      hold.status = 'converted';
      hold.bookingId = booking._id;
      await hold.save();
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
      package: {
        name: pkg.name,
        price: pkg.price,
        durationMinutes: pkg.durationMinutes,
      },
      extras: booking.extras,
      extrasSubtotal: booking.extrasSubtotal,
      slotsSubtotal: booking.slotsSubtotal,
      totalAmount: booking.totalAmount,
    });

    return {
      success: true,
      bookingGroupId,
      groupBookingNumber,
      bookings: createdBookings.map(bookingPayload),
      totalAmount,
      booking: {
        ...bookingPayload(createdBookings[0]),
        slotCount: createdBookings.length,
      },
    };
  } catch (error) {
    console.error('Error creating bookings from holds:', error);
    for (const booking of createdBookings) {
      await Booking.findByIdAndDelete(booking._id);
    }
    return { success: false, error: 'Failed to create bookings' };
  }
}

module.exports = {
  createBookingFromHold,
  createBookingsFromHolds,
  createAdminBooking,
};
