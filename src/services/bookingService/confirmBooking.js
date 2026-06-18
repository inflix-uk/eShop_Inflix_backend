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

async function confirmBookingPayment(bookingNumber, paymentIntent, paymentMethodDetails = {}) {
  const normalizedNumber = normalizeBookingNumber(bookingNumber);

  if (!normalizedNumber) {
    return { success: false, error: 'bookingNumber is required' };
  }

  const booking = await Booking.findOne({ bookingNumber: normalizedNumber, isdeleted: false });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status === 'confirmed' && booking.paymentStatus === 'paid') {
    return { success: true, alreadyConfirmed: true, booking };
  }

  const conflict = await checkOverlap(
    booking.type,
    booking.date,
    booking.startTime,
    booking.endTime,
    { excludeBookingId: booking._id }
  );

  if (conflict.hasConflict) {
    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    booking.cancelReason = 'Slot conflict detected during payment confirmation';
    booking.cancelledAt = new Date();
    await booking.save();

    return {
      success: false,
      error: 'Slot conflict - another booking was confirmed for this slot',
      needsRefund: true,
      booking,
    };
  }

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.stripePaymentIntentId = paymentIntent.id;
  booking.paymentDetails = {
    paymentIntentId: paymentIntent.id,
    paymentType: paymentMethodDetails.paymentType || 'Card',
    cardDetails: paymentMethodDetails.cardDetails || {},
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    paidAt: new Date(),
  };

  await booking.save();

  if (booking.holdId) {
    await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'converted' });
  }

  return { success: true, booking };
}

async function handleBookingPaymentFailed(bookingNumber, paymentIntent) {
  const normalizedNumber = normalizeBookingNumber(bookingNumber);

  if (!normalizedNumber) {
    return { success: false, error: 'bookingNumber is required' };
  }

  const booking = await Booking.findOne({ bookingNumber: normalizedNumber, isdeleted: false });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

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

  return { success: true, booking };
}

async function syncBookingPaymentIfNeeded(booking) {
  if (!booking || booking.paymentStatus === 'paid' || !booking.stripePaymentIntentId) {
    return booking;
  }

  try {
    const stripe = await getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      const result = await confirmBookingPayment(booking.bookingNumber, paymentIntent, {});
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
