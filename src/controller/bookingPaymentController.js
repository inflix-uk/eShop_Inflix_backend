const mongoose = require('mongoose');
const Booking = require('../models/booking');
const BookingPackage = require('../models/bookingPackage');
const BookingSlotHold = require('../models/bookingSlotHold');
const StripeSettings = require('../models/stripeSettings');

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

const bookingPaymentController = {
  createBookingPaymentIntent: async (req, res) => {
    try {
      const { bookingId, holdId, amount, currency } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required', status: 400 });
      }

      let booking = null;
      let hold = null;
      let pkg = null;
      let bookingNumber = null;
      let groupBookingIds = [];

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

        bookingNumber = booking.groupBookingNumber || booking.bookingNumber;

        if (booking.bookingGroupId) {
          const groupBookings = await Booking.find({
            bookingGroupId: booking.bookingGroupId,
            isdeleted: false,
          }).select('_id');
          groupBookingIds = groupBookings.map((b) => b._id.toString());
        }

        pkg = await BookingPackage.findById(booking.packageId).lean();
      } else if (holdId) {
        if (!mongoose.Types.ObjectId.isValid(holdId)) {
          return res.status(400).json({ error: 'Invalid holdId', status: 400 });
        }

        hold = await BookingSlotHold.findOne({
          _id: holdId,
          status: 'active',
          expiresAt: { $gt: new Date() },
        });

        if (!hold) {
          return res.status(404).json({ error: 'Hold not found or expired', status: 404 });
        }

        pkg = await BookingPackage.findById(hold.packageId).lean();
      } else {
        return res.status(400).json({ error: 'bookingId or holdId is required', status: 400 });
      }

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      const stripe = await getStripeInstance();
      const amountInCents = Math.round(amount * 100);
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
        amount,
        currency: currencyCode,
      });
    } catch (error) {
      console.error('Error creating booking payment intent:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getPaymentStatus: async (req, res) => {
    try {
      const { bookingId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: 'Invalid bookingId', status: 400 });
      }

      const booking = await Booking.findOne({ _id: bookingId, isdeleted: false })
        .select('bookingNumber paymentStatus paymentDetails stripePaymentIntentId')
        .lean();

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
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
};

module.exports = bookingPaymentController;
