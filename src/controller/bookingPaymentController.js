const mongoose = require('mongoose');
const Booking = require('../models/booking');
const BookingPackage = require('../models/bookingPackage');
const BookingSlotHold = require('../models/bookingSlotHold');
const { amountsMatch } = require('../utils/bookingPricingUtils');
const {
  resolveStripeForAccount,
  resolveStripeForPackage,
  retrievePaymentIntentAnyAccount,
} = require('../services/stripe/resolveStripeAccount');
const {
  auditStarted,
  auditSuccess,
  auditFailure,
  startTimer,
} = require('../services/audit/checkoutAudit');

/**
 * Client for an existing booking — always the account its PaymentIntent was
 * created on, so a package re-pointed at a different account afterwards does
 * not orphan in-flight payments.
 */
const getStripeForBooking = async (booking) =>
  resolveStripeForAccount(booking?.stripeAccountId || null);

const bookingPaymentController = {
  createBookingPaymentIntent: async (req, res) => {
    const elapsed = startTimer();
    const { bookingId: reqBookingId, holdId: reqHoldId } = req.body || {};

    auditStarted({
      req,
      event: 'booking.payment_intent.requested',
      stage: 'payment_intent',
      flow: 'booking',
      message: 'Customer reached payment — requesting a client secret',
      bookingId: reqBookingId || undefined,
      data: { holdId: reqHoldId, requestedAmount: req.body?.amount },
    });

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
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Invalid bookingId',
            message: 'Invalid bookingId', durationMs: elapsed(), httpStatus: 400, data: { bookingId },
          });
          return res.status(400).json({ error: 'Invalid bookingId', status: 400 });
        }

        booking = await Booking.findOne({ _id: bookingId, isdeleted: false });
        if (!booking) {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Booking not found',
            message: 'Booking not found', durationMs: elapsed(), httpStatus: 404, bookingId,
          });
          return res.status(404).json({ error: 'Booking not found', status: 404 });
        }

        if (booking.paymentStatus === 'paid') {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Booking already paid',
            message: 'Booking already paid', durationMs: elapsed(), httpStatus: 400, bookingId, bookingNumber: booking.bookingNumber, customerEmail: booking.customer?.email,
          });
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
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Invalid holdId',
            message: 'Invalid holdId', durationMs: elapsed(), httpStatus: 400, data: { holdId },
          });
          return res.status(400).json({ error: 'Invalid holdId', status: 400 });
        }

        hold = await BookingSlotHold.findOne({
          _id: holdId,
          status: { $in: ['active', 'converting'] },
          expiresAt: { $gt: new Date() },
        });

        if (!hold) {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Hold not found or expired',
            message: 'Hold not found or expired', durationMs: elapsed(), httpStatus: 404, stage: 'slot_hold', data: { holdId }, severity: 'warn',
          });
          return res.status(404).json({ error: 'Hold not found or expired', status: 404 });
        }

        pkg = await BookingPackage.findById(hold.packageId).lean();
        expectedAmount = Number(pkg?.price) || 0;
      } else {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'bookingId or holdId is required',
            message: 'bookingId or holdId is required', durationMs: elapsed(), httpStatus: 400,
          });
        return res.status(400).json({ error: 'bookingId or holdId is required', status: 400 });
      }

      if (!pkg) {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Package not found',
            message: 'Package not found', durationMs: elapsed(), httpStatus: 404,
          });
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      if (expectedAmount <= 0) {
          auditFailure({
            req, event: 'booking.payment_intent.rejected', stage: 'payment_intent',
            flow: 'booking', failureReason: 'Invalid booking amount',
            message: 'Invalid booking amount', durationMs: elapsed(), httpStatus: 400, expectedAmount, packageId: pkg._id, packageName: pkg.name,
          });
        return res.status(400).json({ error: 'Invalid booking amount', status: 400 });
      }

      if (amount != null && !amountsMatch(expectedAmount, amount)) {
        auditFailure({
          req, event: 'booking.payment_intent.amount_mismatch', stage: 'payment_intent',
          flow: 'booking', severity: 'critical',
          failureReason: 'Payment amount does not match booking total',
          message: `Client sent ${amount} but server computed ${expectedAmount}`,
          httpStatus: 400, amount, expectedAmount, bookingId,
          packageId: pkg._id, packageName: pkg.name, durationMs: elapsed(),
        });
        return res.status(400).json({
          error: 'Payment amount does not match booking total',
          status: 400,
          expectedAmount,
        });
      }

      // The package decides which Stripe account collects this payment.
      const stripeCtx = await resolveStripeForPackage(pkg);
      const { stripe } = stripeCtx;
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
          // Lets the webhook pick the right keys without another package lookup.
          stripeAccountId: stripeCtx.accountId || 'platform',
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
        const paymentFields = {
          stripePaymentIntentId: paymentIntent.id,
          stripeAccountId: stripeCtx.accountId || null,
        };
        if (booking.bookingGroupId) {
          await Booking.updateMany(
            { bookingGroupId: booking.bookingGroupId, isdeleted: false },
            paymentFields
          );
        } else {
          booking.stripePaymentIntentId = paymentFields.stripePaymentIntentId;
          booking.stripeAccountId = paymentFields.stripeAccountId;
          await booking.save();
        }
      }

      auditSuccess({
        req,
        event: 'booking.payment_intent.created',
        stage: 'payment_intent',
        flow: pkg.type === 'editing' ? 'editing' : 'booking',
        message: `PaymentIntent created for ${expectedAmount} ${currencyCode} on "${stripeCtx.label}"`,
        bookingId: bookingId || undefined,
        bookingNumber: bookingNumber || undefined,
        packageId: pkg._id,
        packageName: pkg.name,
        packageType: pkg.type,
        amount: expectedAmount,
        expectedAmount,
        currency: currencyCode,
        paymentIntentId: paymentIntent.id,
        paymentIntentStatus: paymentIntent.status,
        stripeAccountId: stripeCtx.accountId || null,
        stripeAccountLabel: stripeCtx.label,
        stripeMode: stripeCtx.mode,
        customerEmail: booking?.customer?.email,
        customerName: booking?.customer?.name,
        durationMs: elapsed(),
        data: { holdId: holdId || undefined, groupSlots: groupBookingIds.length || undefined },
      });

      return res.json({
        message: 'Payment intent created successfully',
        status: 200,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: expectedAmount,
        currency: currencyCode,
        // The card form must mount with the SAME account's publishable key.
        publishableKey: stripeCtx.publishableKey,
        stripeAccountLabel: stripeCtx.label,
      });
    } catch (error) {
      console.error('Error creating booking payment intent:', error.message);
      const isConfigError = error.statusCode === 503 || error.type === 'StripeAuthenticationError';

      auditFailure({
        req,
        error,
        event: isConfigError
          ? 'booking.payment_intent.stripe_misconfigured'
          : 'booking.payment_intent.crashed',
        stage: 'payment_intent',
        flow: 'booking',
        severity: 'critical',
        failureReason: isConfigError
          ? 'Stripe is not configured correctly'
          : 'Unhandled error creating PaymentIntent',
        message: error.message,
        bookingId: reqBookingId || undefined,
        durationMs: elapsed(),
        data: { holdId: reqHoldId },
      });

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

      const PAYMENT_FIELDS =
        'bookingNumber groupBookingNumber paymentStatus paymentDetails stripePaymentIntentId stripeAccountId status';

      let booking = await Booking.findOne({ _id: bookingId, isdeleted: false })
        .select(PAYMENT_FIELDS)
        .lean();

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      const { syncBookingPaymentIfNeeded } = require('../services/bookingService/confirmBooking');
      const synced = await syncBookingPaymentIfNeeded(booking);
      if (synced?._id) {
        booking = await Booking.findOne({ _id: synced._id, isdeleted: false })
          .select(PAYMENT_FIELDS)
          .lean();
      }

      let stripeStatus = null;

      if (booking.stripePaymentIntentId) {
        try {
          const { stripe } = await getStripeForBooking(booking);
          const paymentIntent = await stripe.paymentIntents.retrieve(
            booking.stripePaymentIntentId
          );
          stripeStatus = paymentIntent.status;
        } catch (stripeError) {
          console.error('Error fetching Stripe payment status:', stripeError.message);
          auditFailure({
            req,
            error: stripeError,
            event: 'booking.payment_status.stripe_read_failed',
            stage: 'payment_result',
            flow: 'booking',
            severity: 'warn',
            failureReason: 'Could not read PaymentIntent status from Stripe',
            paymentIntentId: booking.stripePaymentIntentId,
            bookingId: booking._id,
            bookingNumber: booking.bookingNumber,
          });
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
    const elapsed = startTimer();
    try {
      const { bookingId, bookingNumber, paymentIntentId } = req.body;

      auditStarted({
        req,
        event: 'booking.confirm.requested',
        stage: 'confirm',
        flow: 'booking',
        message: 'Client is confirming a completed payment',
        bookingId: bookingId || undefined,
        bookingNumber: bookingNumber || undefined,
        paymentIntentId: paymentIntentId || undefined,
      });

      if (!paymentIntentId) {
        auditFailure({
          req, event: 'booking.confirm.rejected', stage: 'confirm', flow: 'booking',
          failureReason: 'paymentIntentId is required', httpStatus: 400, durationMs: elapsed(),
        });
        return res.status(400).json({ error: 'paymentIntentId is required', status: 400 });
      }

      // Find the booking first — it names the Stripe account whose keys can
      // read this PaymentIntent. Without a booking we probe every account.
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
      }

      const retrieved = await retrievePaymentIntentAnyAccount(
        paymentIntentId,
        booking?.stripeAccountId
      );

      if (!retrieved) {
        auditFailure({
          req,
          event: 'booking.confirm.payment_intent_missing',
          stage: 'confirm',
          flow: 'booking',
          severity: 'critical',
          failureReason: 'PaymentIntent not found on any configured Stripe account',
          message: 'Customer may have been charged on an account we can no longer read',
          paymentIntentId,
          bookingId: booking?._id,
          bookingNumber: booking?.bookingNumber,
          httpStatus: 404,
          durationMs: elapsed(),
        });
        return res.status(404).json({
          error: 'PaymentIntent not found on any configured Stripe account',
          status: 404,
        });
      }

      const { paymentIntent } = retrieved;

      if (paymentIntent.status !== 'succeeded') {
        auditFailure({
          req,
          event: 'booking.confirm.payment_not_succeeded',
          stage: 'payment_result',
          flow: 'booking',
          severity: 'warn',
          failureReason: `Payment status is ${paymentIntent.status}`,
          message: `Stripe reports "${paymentIntent.status}" — booking not confirmed`,
          paymentIntentId,
          paymentIntentStatus: paymentIntent.status,
          bookingId: booking?._id,
          bookingNumber: booking?.bookingNumber,
          amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
          currency: paymentIntent.currency,
          httpStatus: 400,
          durationMs: elapsed(),
          data: { lastPaymentError: paymentIntent.last_payment_error || undefined },
        });
        return res.status(400).json({
          error: 'Payment has not succeeded yet',
          status: 400,
          stripeStatus: paymentIntent.status,
        });
      }

      if (!booking && paymentIntent.metadata?.bookingId) {
        booking = await Booking.findOne({
          _id: paymentIntent.metadata.bookingId,
          isdeleted: false,
        });
      }

      if (!booking) {
        auditFailure({
          req,
          event: 'booking.confirm.booking_missing',
          stage: 'confirm',
          flow: 'booking',
          severity: 'critical',
          failureReason: 'Booking not found for a succeeded payment',
          message: 'PAID BUT UNMATCHED — customer charged with no booking attached',
          paymentIntentId,
          paymentIntentStatus: paymentIntent.status,
          amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
          httpStatus: 404,
          durationMs: elapsed(),
          data: { metadata: paymentIntent.metadata },
        });
        return res.status(404).json({ error: 'Booking not found', status: 404 });
      }

      const piMatchesBooking =
        booking.stripePaymentIntentId === paymentIntent.id ||
        paymentIntent.metadata?.bookingId === String(booking._id) ||
        paymentIntent.metadata?.bookingNumber === booking.bookingNumber ||
        paymentIntent.metadata?.bookingNumber === booking.groupBookingNumber;

      if (!piMatchesBooking) {
        auditFailure({
          req,
          event: 'booking.confirm.payment_intent_mismatch',
          stage: 'confirm',
          flow: 'booking',
          severity: 'critical',
          failureReason: 'PaymentIntent does not belong to this booking',
          message: 'Possible tampering: PaymentIntent paired with a different booking',
          paymentIntentId,
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          customerEmail: booking.customer?.email,
          httpStatus: 400,
          durationMs: elapsed(),
          data: { bookingPi: booking.stripePaymentIntentId, metadata: paymentIntent.metadata },
        });
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
        auditFailure({
          req,
          event: 'booking.confirm.failed',
          stage: 'confirm',
          flow: 'booking',
          severity: 'critical',
          failureReason: result.error || 'Failed to confirm booking payment',
          message: 'PAID BUT NOT CONFIRMED — payment succeeded, booking did not complete',
          paymentIntentId,
          bookingId: booking._id,
          bookingNumber: booking.bookingNumber,
          customerEmail: booking.customer?.email,
          customerName: booking.customer?.name,
          amount: booking.totalAmount,
          httpStatus: 400,
          durationMs: elapsed(),
        });
        return res.status(400).json({ error: result.error || 'Failed to confirm booking payment', status: 400 });
      }

      auditSuccess({
        req,
        event: 'booking.completed',
        stage: 'complete',
        flow: 'booking',
        message: `Booking ${result.booking.bookingNumber} confirmed and paid`,
        paymentIntentId,
        paymentIntentStatus: paymentIntent.status,
        bookingId: result.booking._id || result.booking.bookingId,
        bookingNumber: result.booking.bookingNumber,
        customerEmail: booking.customer?.email,
        customerName: booking.customer?.name,
        customerPhone: booking.customer?.phone,
        packageId: booking.packageId,
        amount: paymentIntent.amount ? paymentIntent.amount / 100 : booking.totalAmount,
        currency: paymentIntent.currency,
        paymentMethodType: 'Card',
        durationMs: elapsed(),
      });

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
      auditFailure({
        req,
        error,
        event: 'booking.confirm.crashed',
        stage: 'confirm',
        flow: 'booking',
        severity: 'critical',
        failureReason: 'Unhandled error confirming booking payment',
        message: error.message,
        paymentIntentId: req.body?.paymentIntentId,
        bookingId: req.body?.bookingId,
        bookingNumber: req.body?.bookingNumber,
        durationMs: elapsed(),
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingPaymentController;
