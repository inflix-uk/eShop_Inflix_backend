const mongoose = require('mongoose');

/**
 * Forensic trail for a customer's journey through checkout.
 *
 * The existing CheckoutLog is a thin, order-centric breadcrumb. This is the
 * dedicated audit record: every stage a customer reaches, every failure with
 * the reason attached, and enough context to reconstruct what happened without
 * asking them. Nothing here is rendered in Admin — it is written for querying
 * with a script after the fact.
 *
 * Design rules:
 *  - Writing must NEVER break checkout. All writes are fire-and-forget.
 *  - Every row carries `checkoutSessionId` so one journey can be stitched
 *    together from the first click to the final charge, including the steps
 *    that happen before a PaymentIntent or booking number exists.
 *  - Fields worth filtering on are real columns, not buried in `data`.
 */

const STAGES = [
  'page_view',        // landed on checkout
  'package_selected', // chose a package
  'slot_hold',        // reserving time slots
  'details',          // entering customer details
  'booking_create',   // turning holds into a booking
  'payment_intent',   // asking Stripe for a client secret
  'payment_submit',   // customer pressed Pay
  'payment_result',   // Stripe told us what happened
  'webhook',          // async confirmation from Stripe
  'confirm',          // marking the booking paid/confirmed
  'complete',         // finished successfully
  'abandoned',        // left without finishing
  'other',
];

const OUTCOMES = ['started', 'success', 'failure', 'blocked', 'retry', 'info'];
const SEVERITIES = ['debug', 'info', 'warn', 'error', 'critical'];
const SOURCES = ['frontend', 'backend', 'webhook', 'system', 'admin'];
const FLOWS = ['booking', 'shop', 'editing', 'unknown'];

const checkoutAuditLogSchema = new mongoose.Schema(
  {
    // ---- correlation -------------------------------------------------
    /** Ties every row of one customer journey together. Issued by the client. */
    checkoutSessionId: { type: String, index: true },
    /** Canonical dotted event name, e.g. "booking.payment_intent.failed". */
    event: { type: String, required: true, index: true },
    stage: { type: String, enum: STAGES, default: 'other', index: true },
    outcome: { type: String, enum: OUTCOMES, default: 'info', index: true },
    severity: { type: String, enum: SEVERITIES, default: 'info', index: true },
    source: { type: String, enum: SOURCES, default: 'backend', index: true },
    flow: { type: String, enum: FLOWS, default: 'unknown', index: true },
    /** Human sentence — what a person reading the log needs to understand. */
    message: { type: String },

    // ---- who ---------------------------------------------------------
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerEmail: { type: String, index: true, lowercase: true, trim: true },
    customerName: { type: String },
    customerPhone: { type: String },
    ip: { type: String },
    userAgent: { type: String },

    // ---- what they were buying ---------------------------------------
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingPackage', index: true },
    packageName: { type: String },
    packageType: { type: String },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', index: true },
    bookingNumber: { type: String, index: true },
    orderNumber: { type: String, index: true },
    holdIds: { type: [String], default: undefined },
    slots: { type: mongoose.Schema.Types.Mixed },
    guestCount: { type: Number },
    extraMics: { type: Number },
    hours: { type: Number },
    extras: { type: mongoose.Schema.Types.Mixed },

    // ---- money -------------------------------------------------------
    amount: { type: Number },
    expectedAmount: { type: Number },
    currency: { type: String },

    // ---- stripe ------------------------------------------------------
    paymentIntentId: { type: String, index: true },
    paymentIntentStatus: { type: String },
    paymentMethodType: { type: String },
    stripeAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'StripeAccount', default: null },
    stripeAccountLabel: { type: String },
    stripeMode: { type: String },
    stripeErrorCode: { type: String, index: true },
    stripeErrorType: { type: String },
    stripeDeclineCode: { type: String },
    stripeRequestId: { type: String },

    // ---- failure detail ----------------------------------------------
    /** The reason, in the app's own words — e.g. "Slot is no longer available". */
    failureReason: { type: String, index: true },
    errorName: { type: String },
    errorMessage: { type: String },
    errorStack: { type: String },
    httpStatus: { type: Number },

    // ---- timing ------------------------------------------------------
    durationMs: { type: Number },

    /** Anything not worth a column. Truncated and redacted before storage. */
    data: { type: mongoose.Schema.Types.Mixed },

    // No `index: true` here — the TTL index below covers createdAt. Declaring
    // both makes Mongoose skip one of them and the TTL silently never applies.
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false, minimize: false }
);

// Query patterns this is built for:
//   "show me everything that happened in this one journey"
checkoutAuditLogSchema.index({ checkoutSessionId: 1, createdAt: 1 });
//   "show me today's failures, worst first"
checkoutAuditLogSchema.index({ outcome: 1, createdAt: -1 });
checkoutAuditLogSchema.index({ severity: 1, createdAt: -1 });
//   "what happened to this customer / this booking"
checkoutAuditLogSchema.index({ customerEmail: 1, createdAt: -1 });
checkoutAuditLogSchema.index({ bookingNumber: 1, createdAt: 1 });
//   "which step is losing people"
checkoutAuditLogSchema.index({ flow: 1, stage: 1, createdAt: -1 });

/**
 * Keep 180 days. Long enough for chargeback windows and seasonal comparison,
 * short enough that the collection cannot grow without bound.
 */
checkoutAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 }
);

module.exports = mongoose.model('CheckoutAuditLog', checkoutAuditLogSchema);
module.exports.STAGES = STAGES;
module.exports.OUTCOMES = OUTCOMES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.SOURCES = SOURCES;
module.exports.FLOWS = FLOWS;
