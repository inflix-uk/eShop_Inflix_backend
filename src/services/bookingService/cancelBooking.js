const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const StripeSettings = require('../../models/stripeSettings');

let stripeInstance = require('stripe')(process.env.STRIPE_SECRET_KEY);

const getStripeInstance = async () => {
  try {
    const keys = await StripeSettings.getActiveKeys();
    if (keys.secretKey) {
      return require('stripe')(keys.secretKey);
    }
  } catch (error) {
    console.error('Error getting Stripe keys from DB:', error.message);
  }
  return stripeInstance;
};

async function cancelBooking({
  bookingId,
  cancelReason,
  initiatedBy,
  processRefund = false,
  refundAmount = null,
}) {
  if (!bookingId) {
    return { success: false, error: 'bookingId is required' };
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    isdeleted: false,
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.status === 'cancelled') {
    return { success: false, error: 'Booking is already cancelled' };
  }

  if (booking.status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed booking' };
  }

  try {
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = cancelReason || '';

    let refundResult = null;

    if (processRefund && booking.paymentStatus === 'paid' && booking.stripePaymentIntentId) {
      const stripe = await getStripeInstance();

      try {
        const refundParams = { payment_intent: booking.stripePaymentIntentId };

        if (refundAmount !== null && refundAmount > 0) {
          refundParams.amount = Math.round(refundAmount * 100);
        }

        const refund = await stripe.refunds.create(refundParams);

        booking.paymentStatus = 'refunded';
        booking.paymentDetails = {
          ...booking.paymentDetails,
          refundId: refund.id,
          refundAmount: refund.amount / 100,
          refundStatus: refund.status,
          refundedAt: new Date(),
        };

        refundResult = {
          refundId: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
        };

        console.log('Refund processed:', refund.id, 'for booking:', booking.bookingNumber);
      } catch (refundError) {
        console.error('Error processing refund:', refundError.message);
        refundResult = { error: refundError.message };
      }
    }

    await booking.save();

    if (booking.holdId) {
      await BookingSlotHold.findByIdAndUpdate(booking.holdId, { status: 'released' });
    }

    const populated = await Booking.findById(booking._id)
      .populate('packageId', 'name price durationMinutes durationDisplayUnit type')
      .lean();

    const { notifyBookingStatusEmail } = require('../email/bookingStatusEmailService');
    notifyBookingStatusEmail({
      eventType: 'cancelled',
      booking: populated || booking.toObject?.() || booking,
      pkg: populated?.packageId,
      cancelReason: booking.cancelReason,
      refund: refundResult,
    });

    return {
      success: true,
      booking: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        paymentStatus: booking.paymentStatus,
      },
      refund: refundResult,
    };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { success: false, error: 'Failed to cancel booking' };
  }
}

module.exports = {
  cancelBooking,
};
