const mongoose = require('mongoose');
const Booking = require('../models/booking');
const BookingPackage = require('../models/bookingPackage');
const BookingSlotHold = require('../models/bookingSlotHold');
const StripeSettings = require('../models/stripeSettings');
const { amountsMatch } = require('../utils/bookingPricingUtils');

const getStripeInstance = async () => {
  const keys = await StripeSettings.getActiveKeys();
  if (!keys.secretKey) {
    const err = new Error(
      keys.mode === 'test'
        ? 'Stripe test mode is on but STRIPE_SECRET_KEY (sk_test_) is missing in .env'
        : 'Stripe secret key is not configured'
    );
    err.statusCode = 503;
    throw err;
  }
  return require('stripe')(keys.secretKey);
};

const bookingPaymentController = {
  createBookingPaymentIntent: async (req, res) => {
    try {
      const { bookingId, holdId, amount, currency } = req.body;

      let booking = null;
      let hold = null;
      let pkg = null;
      let bookingNumber = null;
      let groupBookingIds = [];
      let expectedAmount = 0;

      if (bookingId) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
          return res.status(400).json({ error: 'Invalid bookingId', status: 400 });
        }

        booking = await Booking.findOne({ _id: bookingId, isdeleted: false });
        if (!booking) {
          return res.status(404).json({ error: 'Booking not found', status: 404 });
        }

        if (booking.paymentStatus === 'paid') {
          return res.status(400).json({ error: 'Booking already paid', status: 400 });
        }

        expectedAmount = Number(booking.totalAmount) || 0;

        if (booking.bookingGroupId) {
          const groupBookings = await Booking.find({
            bookingGroupId: booking.bookingGroupId,
            isdeleted: false,
          }).select('_id totalAmount');
          groupBookingIds = groupBookings.map((b) => b._id.toString());
          if (groupBookings.length > 0 && groupBookings[0].totalAmount) {
            expectedAmount = Number(groupBookings[0].totalAmount);
          }
        }

        bookingNumber = booking.groupBookingNumber || booking.bookingNumber;
        pkg = await BookingPackage.findById(booking.packageId).lean();
      } else if (holdId) {
        if (!mongoose.Types.ObjectId.isValid(holdId)) {
          return res.status(400).json({ error: 'Invalid holdId', status: 400 });
        }

        hold = await BookingSlotHold.findOne({
          _id: holdId,
          status: { $in: ['active', 'converting'] },
          expiresAt: { $gt: new Date() },
        });

        if (!hold) {
          return res.status(404).json({ error: 'Hold not found or expired', status: 404 });
        }

        pkg = await BookingPackage.findById(hold.packageId).lean();
        expectedAmount = Number(pkg?.price) || 0;
      } else {
        return res.status(400).json({ error: 'bookingId or holdId is required', status: 400 });
      }

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      if (expectedAmount <= 0) {
        return res.status(400).json({ error: 'Invalid booking amount', status: 400 });
      }

      if (amount != null && !amountsMatch(expectedAmount, amount)) {
        return res.status(400).json({
          error: 'Payment amount does not match booking total',
          status: 400,
          expectedAmount,
        });
      }

      const stripe = await getStripeInstance();
      const amountInCents = Math.round(expectedAmount * 100);
      const currencyCode = currency || 'gbp';

      const paymentIntentParams = {
        amount: amountInCents,
        currency: currencyCode,
        metadata: {
          paymentType: 'booking',
          packageId: pkg._id.toString(),
          packageName: pkg.name,
          packageType: pkg.type,
        },
        automatic_payment_methods: { enabled: true },
      };

      if (bookingNumber) {
        paymentIntentParams.metadata.bookingNumber = bookingNumber;
        paymentIntentParams.metadata.bookingId = bookingId;
        if (groupBookingIds.length > 0) {
          paymentIntentParams.metadata.slotCount = String(groupBookingIds.length);
        }
      }

      if (holdId) {
        paymentIntentParams.metadata.holdId = holdId;
        if (hold) {
          paymentIntentParams.metadata.date = hold.date;
          paymentIntentParams.metadata.startTime = hold.startTime;
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      if (booking) {
        if (booking.bookingGroupId) {
          await Booking.updateMany(
            { bookingGroupId: booking.bookingGroupId, isdeleted: false },
            { stripePaymentIntentId: paymentIntent.id }
          );
        } else {
          booking.stripePaymentIntentId = paymentIntent.id;
          await booking.save();
        }
      }

      return res.json({
        message: 'Payment intent created successfully',
        status: 200,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: expectedAmount,
        currency: currencyCode,
      });
    } catch (error) {
      console.error('Error creating booking payment intent:', error.message);
      const isConfigError = error.statusCode === 503 || error.type === 'StripeAuthenticationError';
      const message = isConfigError
        ? (error.statusCode === 503
            ? error.message
            : 'Stripe rejected the API key. Restart the backend after saving sk_test_ keys in .env.')
        : (error.message || 'Internal server error');
      return res.status(isConfigError ? 503 : 500).json({ error: message });
    }
  },

  getPaymentStatus: async (req, res) => {
    try {
      const { bookingId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: 'Invalid bookingId', status: 400 });
      }

      let booking = await Booking.findOne({ _id: bookingId, isdeleted: false })
        .select('bookingNumber groupBookingNumber paymentStatus paymentDetails stripePaymentIntentId status')
        .lean();

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      const { syncBookingPaymentIfNeeded } = require('../services/bookingService/confirmBooking');
      const synced = await syncBookingPaymentIfNeeded(booking);
      if (synced?._id) {
        booking = await Booking.findOne({ _id: synced._id, isdeleted: false })
          .select('bookingNumber groupBookingNumber paymentStatus paymentDetails stripePaymentIntentId status')
          .lean();
      }

      let stripeStatus = null;

      if (booking.stripePaymentIntentId) {
        try {
          const stripe = await getStripeInstance();
          const paymentIntent = await stripe.paymentIntents.retrieve(
            booking.stripePaymentIntentId
          );
          stripeStatus = paymentIntent.status;
        } catch (stripeError) {
          console.error('Error fetching Stripe payment status:', stripeError.message);
        }
      }

      return res.json({
        message: 'Payment status fetched successfully',
        status: 200,
        payment: {
          bookingNumber: booking.bookingNumber,
          paymentStatus: booking.paymentStatus,
          stripeStatus,
          paymentDetails: booking.paymentDetails,
        },
      });
    } catch (error) {
      console.error('Error fetching payment status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  confirmBookingPayment: async (req, res) => {
    try {
      const { bookingId, bookingNumber, paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId is required', status: 400 });
      }

      const stripe = await getStripeInstance();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          error: 'Payment has not succeeded yet',
          status: 400,
          stripeStatus: paymentIntent.status,
        });
      }

      let booking = null;
      if (bookingId) {
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
          return res.status(400).json({ error: 'Invalid bookingId', status: 400 });
        }
        booking = await Booking.findOne({ _id: bookingId, isdeleted: false });
      } else if (bookingNumber) {
        const { normalizeBookingNumber } = require('../services/bookingService/confirmBooking');
        const normalized = normalizeBookingNumber(bookingNumber);
        booking = await Booking.findOne({
          $or: [{ bookingNumber: normalized }, { groupBookingNumber: normalized }],
          isdeleted: false,
        });
      } else if (paymentIntent.metadata?.bookingId) {
        booking = await Booking.findOne({
          _id: paymentIntent.metadata.bookingId,
          isdeleted: false,
        });
      }

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      const piMatchesBooking =
        booking.stripePaymentIntentId === paymentIntent.id ||
        paymentIntent.metadata?.bookingId === String(booking._id) ||
        paymentIntent.metadata?.bookingNumber === booking.bookingNumber ||
        paymentIntent.metadata?.bookingNumber === booking.groupBookingNumber;

      if (!piMatchesBooking) {
        return res.status(400).json({
          error: 'PaymentIntent does not belong to this booking',
          status: 400,
        });
      }

      const { confirmBookingPayment, syncBookingPaymentIfNeeded } = require('../services/bookingService/confirmBooking');
      const lookupNumber = booking.groupBookingNumber || booking.bookingNumber;

      let result;
      if (booking.status === 'cancelled') {
        const synced = await syncBookingPaymentIfNeeded(booking);
        result = { success: true, booking: synced };
      } else {
        result = await confirmBookingPayment(lookupNumber, paymentIntent, {
          paymentType: 'Card',
        });
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to confirm booking payment', status: 400 });
      }

      return res.json({
        message: 'Booking payment confirmed successfully',
        status: 200,
        booking: {
          bookingId: result.booking._id || result.booking.bookingId,
          bookingNumber: result.booking.bookingNumber,
          status: result.booking.status,
          paymentStatus: result.booking.paymentStatus,
        },
      });
    } catch (error) {
      console.error('Error confirming booking payment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingPaymentController;
