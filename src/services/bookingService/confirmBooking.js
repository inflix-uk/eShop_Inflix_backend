const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const StripeSettings = require('../../models/stripeSettings');
const { checkOverlap } = require('./overlapValidator');

function normalizeBookingNumber(bookingNumber) {
  const value = String(bookingNumber || '').trim();
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function getStripe() {
  try {
    const keys = await StripeSettings.getActiveKeys();
    if (keys.secretKey) {
      return require('stripe')(keys.secretKey);
    }
  } catch (error) {
    console.error('Error getting Stripe keys:', error.message);
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

async function findBookingsByNumber(normalizedNumber) {
  const primary = await Booking.findOne({
    $or: [{ bookingNumber: normalizedNumber }, { groupBookingNumber: normalizedNumber }],
    isdeleted: false,
  });

  if (!primary) return [];

  if (primary.bookingGroupId) {
    return Booking.find({ bookingGroupId: primary.bookingGroupId, isdeleted: false }).sort({
      date: 1,
      startTime: 1,
    });
  }

  return [primary];
}

async function confirmBookingPayment(bookingNumber, paymentIntent, paymentMethodDetails = {}) {
  const normalizedNumber = normalizeBookingNumber(bookingNumber);

  if (!normalizedNumber) {
    return { success: false, error: 'bookingNumber is required' };
  }

  const bookings = await findBookingsByNumber(normalizedNumber);
  if (bookings.length === 0) {
    return { success: false, error: 'Booking not found' };
  }

  const allPaid = bookings.every((b) => b.status === 'confirmed' && b.paymentStatus === 'paid');
  if (allPaid) {
    return { success: true, alreadyConfirmed: true, booking: bookings[0], bookings };
  }

  const confirmedBookings = [];
  const failedBookings = [];
  const slotCount = bookings.length;

  for (const booking of bookings) {
    if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
      confirmedBookings.push(booking);
      continue;
    }

    const conflict = await checkOverlap(
      booking.type,
      booking.date,
      booking.startTime,
      booking.endTime,
      { excludeBookingIds: bookings.map((b) => b._id) }
    );

    if (conflict.hasConflict) {
      booking.status = 'cancelled';
      booking.paymentStatus = 'refunded';
      booking.cancelReason = 'Slot conflict detected during payment confirmation';
      booking.cancelledAt = new Date();
      await booking.save();
      failedBookings.push(booking);
      continue;
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.stripePaymentIntentId = paymentIntent.id;
    booking.paymentDetails = {
      paymentIntentId: paymentIntent.id,
      paymentType: paymentMethodDetails.paymentType || 'Card',
      cardDetails: paymentMethodDetails.cardDetails || {},
      amount: paymentIntent.amount / 100 / slotCount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      paidAt: new Date(),
      groupBookingNumber: bookings[0].groupBookingNumber || bookings[0].bookingNumber,
      slotCount,
    };

    await booking.save();

    if (booking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'converted' });
    }

    confirmedBookings.push(booking);
  }

  if (failedBookings.length > 0 && confirmedBookings.length === 0) {
    return {
      success: false,
      error: 'Slot conflict - another booking was confirmed for one or more slots',
      needsRefund: true,
      booking: bookings[0],
      bookings: failedBookings,
    };
  }

  return {
    success: true,
    booking: confirmedBookings[0] || bookings[0],
    bookings: confirmedBookings,
    partialFailure: failedBookings.length > 0,
    failedBookings,
  };
}

async function handleBookingPaymentFailed(bookingNumber, paymentIntent) {
  const normalizedNumber = normalizeBookingNumber(bookingNumber);

  if (!normalizedNumber) {
    return { success: false, error: 'bookingNumber is required' };
  }

  const bookings = await findBookingsByNumber(normalizedNumber);
  if (bookings.length === 0) {
    return { success: false, error: 'Booking not found' };
  }

  for (const booking of bookings) {
    booking.paymentStatus = 'failed';
    booking.paymentDetails = {
      paymentIntentId: paymentIntent.id,
      status: 'failed',
      error: paymentIntent.last_payment_error?.message || 'Payment failed',
      failedAt: new Date(),
    };
    await booking.save();

    if (booking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'released' });
    }
  }

  return { success: true, booking: bookings[0], bookings };
}

async function syncBookingPaymentIfNeeded(booking) {
  if (!booking || booking.paymentStatus === 'paid' || !booking.stripePaymentIntentId) {
    return booking;
  }

  try {
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const lookupNumber = booking.groupBookingNumber || booking.bookingNumber;
      const result = await confirmBookingPayment(lookupNumber, paymentIntent, {});
      if (result.success && result.booking) {
        return result.booking;
      }
    }
  } catch (error) {
    console.error('Error syncing booking payment:', error.message);
  }

  return booking;
}

module.exports = {
  confirmBookingPayment,
  handleBookingPaymentFailed,
  normalizeBookingNumber,
  syncBookingPaymentIfNeeded,
};
