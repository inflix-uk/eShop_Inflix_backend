const Booking = require('../../models/booking');
const BookingSlotHold = require('../../models/bookingSlotHold');
const BookingSettings = require('../../models/bookingSettings');

/** Unpaid pending bookings block slots — expire after hold window + grace period. */
const DEFAULT_PAYMENT_PENDING_MINUTES = 45;

async function expireStalePendingBookings() {
  try {
    const settings = await BookingSettings.getSettings();
    const holdMinutes = Number(settings.holdDurationMinutes) || 15;
    const pendingMinutes = Math.max(
      DEFAULT_PAYMENT_PENDING_MINUTES,
      holdMinutes + 30
    );
    const cutoff = new Date(Date.now() - pendingMinutes * 60 * 1000);

    const stale = await Booking.find({
      status: 'pending',
      paymentStatus: { $in: ['unpaid', 'failed'] },
      isdeleted: false,
      createdAt: { $lt: cutoff },
    }).select('_id holdId');

    if (stale.length === 0) return { expired: 0 };

    const holdIds = stale.map((b) => b.holdId).filter(Boolean);

    await Booking.updateMany(
      { _id: { $in: stale.map((b) => b._id) } },
      {
        $set: {
          status: 'cancelled',
          cancelReason: 'Payment not completed in time',
          cancelledAt: new Date(),
        },
      }
    );

    if (holdIds.length > 0) {
      await BookingSlotHold.updateMany(
        { _id: { $in: holdIds }, status: { $in: ['active', 'converted'] } },
        { $set: { status: 'released' } }
      );
    }

    return { expired: stale.length };
  } catch (error) {
    console.error('Error expiring stale pending bookings:', error);
    return { expired: 0 };
  }
}

module.exports = { expireStalePendingBookings, DEFAULT_PAYMENT_PENDING_MINUTES };
