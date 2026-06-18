const mongoose = require('mongoose');
const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const BookingPackage = require('../../models/bookingPackage');
const { generateBookingNumber } = require('./generateBookingNumber');
const { checkOverlap } = require('./overlapValidator');
const { addMinutesToTime, isValidTimeHHmm, isValidDateYYYYMMDD } = require('./timeUtils');

async function createBookingFromHold({ holdId, customer, userId, notes, source }) {
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

module.exports = {
  createBookingFromHold,
  createAdminBooking,
};
