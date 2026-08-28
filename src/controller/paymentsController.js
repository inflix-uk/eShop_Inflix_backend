// controller/paymentsController.js
const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Order = require("../models/order");
const StripeSettings = require("../models/stripeSettings");
const CheckoutLog = require("../models/checkoutLog");
const auditLogService = require("../services/auditLogService");
const { shadowLogCheckoutPricing } = require("../services/pricing/shadowLogPricing");
const { resolvePaymentIntentProductSubtotal } = require("../services/pricing/resolvePaymentIntentProductSubtotal");
const { computeCheckoutTotal } = require("../services/pricing/computeCheckoutTotal");
const { buildCheckoutSessionLineItems } = require("../services/pricing/buildCheckoutSessionLineItems");
const {
  pricingResultToHttp,
  checkoutTotalToHttp,
  logCheckoutPricingBlocked,
  logCheckoutPricingSuccess,
} = require("../services/pricing/checkoutPricingHttp");
const {
  assertPaymentIntentReadAccess,
  assertPaymentIntentMutateAccess,
  assertMetadataUpdateAccess,
  assertCheckoutSessionReadAccess,
  buildSafeCardDetailsFromPaymentMethod,
  buildSafeCardDetailsFromCharge,
  buildSafePaymentDetailsResponse,
} = require("../utils/assertPaymentIntentAccess");

// Booking payment confirmation service
const { confirmBookingPayment, handleBookingPaymentFailed } = require('../services/bookingService/confirmBooking');
const {
  logCheckout,
  auditSuccess,
  auditFailure,
} = require('../services/audit/checkoutAudit');

// Fire-and-forget logger — never throws, never blocks the caller
const writeLog = (entry) => {
  try {
    CheckoutLog.create(entry).catch((e) => {
      console.error('[CheckoutLog] write failed:', e.message);
    });
  } catch (e) {
    console.error('[CheckoutLog] write threw:', e.message);
  }
};

const logPaymentIntentAccessDenied = (route, req, result, extra = {}) => {
  writeLog({
    event: 'backend.payment_intent.access_denied',
    source: 'backend',
    paymentIntentId: req.body?.paymentIntentId || extra.paymentIntentId,
    orderNumber: req.body?.orderNumber || extra.orderNumber,
    data: {
      route,
      code: result.code,
      status: result.status,
      message: result.message,
      email: req.body?.email,
      sessionId: req.body?.sessionId,
      requesterId: req.user?.id || req.user?._id || null,
      ...extra,
    },
  });
};

const sendPaymentIntentAccessError = (res, route, req, result, extra = {}) => {
  logPaymentIntentAccessDenied(route, req, result, extra);
  return res.status(result.status || 403).json({
    success: false,
    code: result.code || 'PAYMENT_OWNERSHIP_MISMATCH',
    error: result.message,
    message: result.message,
  });
};
const crypto = require("crypto");
const dotenv = require("dotenv");
const router = require("../routes");
dotenv.config({ path: "./.env" });

// Initialize stripe with env variable as fallback (will be overridden dynamically)
let stripeInstance = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Helper function to get Stripe instance with DB keys (with fallback to env vars)
const getStripeInstance = async () => {
    const keys = await StripeSettings.getActiveKeys();
    if (keys.secretKey) {
        return require("stripe")(keys.secretKey);
    }
    const envKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
    if (envKey) {
        return require("stripe")(envKey);
    }
    const err = new Error(
        keys.mode === 'test'
            ? 'Stripe test mode is on but STRIPE_SECRET_KEY (sk_test_) is missing in .env'
            : 'Stripe secret key is not configured'
    );
    err.statusCode = 503;
    throw err;
};

// Helper function to get publishable key (for config endpoint)
const getPublishableKey = async () => {
    try {
        const keys = await StripeSettings.getActiveKeys();
        if (keys.publishableKey) {
            return keys.publishableKey;
        }
    } catch (error) {
        console.error('Error getting publishable key from DB:', error.message);
    }
    return process.env.STRIPE_PUBLISHABLE_KEY;
};

const paypal = require('paypal-rest-sdk');

paypal.configure({
    mode: 'live', // or 'live' for production
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET
  });


const calculateOrderAmount = (items) => {
    let total = 0;
    items.forEach((item) => {
        total += item.salePrice * item.qty; // Multiply sale price by quantity
    });
    return Math.round(total * 100); // Convert to smallest currency unit (e.g., pence for GBP)
};



const paymentsController = {

    // Accept a log entry from the frontend and persist it. Always 200 so
    // the client never retries or blocks the checkout flow on logging errors.
    logCheckoutEvent: async (req, res) => {
        try {
            const body = req.body || {};
            const { event, paymentIntentId, orderNumber, paymentMethodType, data } = body;
            if (!event) {
                return res.status(200).json({ ok: false, reason: 'missing event' });
            }

            // Legacy breadcrumb trail — unchanged so existing analytics keep working.
            writeLog({
                event: String(event).substring(0, 120),
                source: 'frontend',
                paymentIntentId: paymentIntentId || undefined,
                orderNumber: orderNumber || undefined,
                paymentMethodType: paymentMethodType || undefined,
                data: data || undefined,
            });

            // Richer audit trail. The browser is the only place that can see
            // steps the server never hears about — the customer reaching a
            // step, Stripe rejecting a card inline, or the tab being closed.
            //
            // This endpoint is public (checkout is anonymous), so treat every
            // field as untrusted: whitelist what we accept, clamp the rest,
            // and never let a caller set outcome/severity to something that
            // would hide a real failure elsewhere.
            const allowedStages = require('../models/checkoutAuditLog').STAGES;
            const allowedOutcomes = require('../models/checkoutAuditLog').OUTCOMES;
            const allowedSeverities = require('../models/checkoutAuditLog').SEVERITIES;
            const allowedFlows = require('../models/checkoutAuditLog').FLOWS;

            const pick = (value, allowed, fallback) =>
                allowed.includes(String(value)) ? String(value) : fallback;

            const clampNumber = (v) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : undefined;
            };

            logCheckout({
                req,
                source: 'frontend',
                event: String(event).substring(0, 160),
                stage: pick(body.stage, allowedStages, 'other'),
                outcome: pick(body.outcome, allowedOutcomes, 'info'),
                severity: pick(body.severity, allowedSeverities, 'info'),
                flow: pick(body.flow, allowedFlows, 'unknown'),
                message: body.message ? String(body.message).substring(0, 2000) : undefined,
                checkoutSessionId: body.checkoutSessionId
                    ? String(body.checkoutSessionId).substring(0, 120)
                    : undefined,
                failureReason: body.failureReason
                    ? String(body.failureReason).substring(0, 500)
                    : undefined,
                paymentIntentId: paymentIntentId || undefined,
                orderNumber: orderNumber || undefined,
                paymentMethodType: paymentMethodType || undefined,
                bookingNumber: body.bookingNumber ? String(body.bookingNumber).substring(0, 60) : undefined,
                packageName: body.packageName ? String(body.packageName).substring(0, 200) : undefined,
                customerEmail: body.customerEmail ? String(body.customerEmail).substring(0, 200) : undefined,
                amount: clampNumber(body.amount),
                currency: body.currency ? String(body.currency).substring(0, 10) : undefined,
                stripeErrorCode: body.stripeErrorCode ? String(body.stripeErrorCode).substring(0, 100) : undefined,
                stripeDeclineCode: body.stripeDeclineCode ? String(body.stripeDeclineCode).substring(0, 100) : undefined,
                stripeErrorType: body.stripeErrorType ? String(body.stripeErrorType).substring(0, 100) : undefined,
                durationMs: clampNumber(body.durationMs),
                data: data || undefined,
            });

            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('logCheckoutEvent error:', error.message);
            res.status(200).json({ ok: false });
        }
    },

    config: async (req, res, next) => {
        try {
            // A booking package may collect into its own Stripe account — the card
            // form must then mount with THAT account's publishable key. Without a
            // packageId this stays the platform default (shop checkout path).
            const { packageId } = req.query;

            let keys;
            let STRIPE_PUBLISHABLE_KEY;

            if (packageId) {
                const { resolveKeysForPackage } = require('../services/stripe/resolveStripeAccount');
                keys = await resolveKeysForPackage(String(packageId));
                STRIPE_PUBLISHABLE_KEY = keys.publishableKey;
            } else {
                STRIPE_PUBLISHABLE_KEY = await getPublishableKey();
                keys = await StripeSettings.getActiveKeys();
            }

            const STRIPE_SECRET_KEY = keys.secretKey;

            // Extract account IDs from keys for comparison (17 chars after prefix)
            const pkAccountId = STRIPE_PUBLISHABLE_KEY ? STRIPE_PUBLISHABLE_KEY.substring(8, 25) : 'NOT SET';
            const skAccountId = STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.substring(8, 25) : 'NOT SET';
            const keysMatch = pkAccountId === skAccountId;

            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║              Stripe Key Verification               ║');
            console.log('╠════════════════════════════════════════════════════╣');
            console.log(`║  Source: ${keys.source || (keys.isFromDatabase ? 'Database' : 'Environment')}`.padEnd(54) + '║');
            console.log(`║  Mode: ${keys.mode === 'test' || STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') ? 'TEST' : STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN'}`.padEnd(54) + '║');
            console.log(`║  PK Account ID: ${pkAccountId}`.padEnd(54) + '║');
            console.log(`║  SK Account ID: ${skAccountId}`.padEnd(54) + '║');
            console.log(`║  Keys Match: ${keysMatch ? '✅ YES' : '❌ NO'}`.padEnd(54) + '║');
            console.log('╚════════════════════════════════════════════════════╝');

            if (!STRIPE_PUBLISHABLE_KEY) {
                const testMode = keys.mode === 'test';
                const message = testMode
                  ? 'STRIPE_TEST_MODE=true but STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY (pk_test_ / sk_test_) are missing in .env'
                  : 'Stripe configuration missing';
                console.error(message);
                return res.status(503).json({ error: message });
            }

            res.send({
              publishableKey: STRIPE_PUBLISHABLE_KEY,
              stripeAccountId: keys.accountId || null,
              stripeAccountLabel: keys.label || 'Platform default',
            });
          } catch (error) {
            console.error('Error getting Stripe config:', error);
            res.status(500).json({ error: 'Failed to get Stripe configuration' });
          }
    },
    createPaymentIntent: async (req, res, next) => {
        try {
            const {
                cartproducts,
                coupondata,
                shippingInformation,
                contactInformation,
                orderNumber,
                isExpressCheckout,
                shippingMethod
            } = req.body;

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            console.log("Creating PaymentIntent for order:", orderNumber);

            // Validate cart products
            if (!cartproducts || !Array.isArray(cartproducts) || cartproducts.length === 0) {
                throw new Error("Cart products are required");
            }

            // Filter out trade-in products (they are credits, not charges)
            const chargeableProducts = cartproducts.filter(product => !product.isTradeIn);

            const checkout = await computeCheckoutTotal({
                req,
                cartItems: chargeableProducts,
                couponInput: coupondata,
                shippingMethodInput: shippingMethod,
            });
            const checkoutHttpError = checkoutTotalToHttp(checkout);
            if (checkoutHttpError) {
                logCheckoutPricingBlocked(
                    'POST /create-payment-intent',
                    orderNumber,
                    checkout
                );
                return res.status(checkoutHttpError.status).json(checkoutHttpError.body);
            }

            logCheckoutPricingSuccess(
                'POST /create-payment-intent',
                orderNumber,
                checkout.pricingResult
            );

            const totalSalePrice = checkout.productSubtotal;
            const totalDiscount = checkout.totalDiscount;
            const shippingCost = checkout.shippingCost;
            const adjustedTotalPrice = checkout.adjustedProductTotal;
            const finalTotal = checkout.finalTotal;
            const totalAmount = checkout.totalAmountPence;

            console.log(`Calculated amount: ${totalAmount} pence (£${finalTotal}) - Products: £${adjustedTotalPrice}, Shipping: £${shippingCost}`);

            if (totalAmount <= 0) {
                throw new Error("Invalid amount calculated");
            }

            // Build full customer name
            const customerName = `${shippingInformation?.firstName || ''} ${shippingInformation?.lastName || ''}`.trim();

            // Build full shipping address
            const fullAddress = [
                shippingInformation?.address,
                shippingInformation?.apartment,
                shippingInformation?.city,
                shippingInformation?.county,
                shippingInformation?.postalCode,
                shippingInformation?.country || 'United Kingdom'
            ].filter(Boolean).join(', ');

            // Helper to build full product name (productName + variant name)
            const getFullProductName = (p) => {
                const variantName = p.name ? p.name.replace(/\s*\(#[\d\w]+\)/, '').trim() : '';
                if (p.productName && variantName) {
                    return `${p.productName} - ${variantName}`;
                }
                return p.productName || variantName || 'Unknown Product';
            };

            // Build product summary for metadata (max 500 chars)
            const productSummary = chargeableProducts.map(p =>
                `${getFullProductName(p)} x${p.qty}`
            ).join(', ').substring(0, 500);

            // Build product details for description
            const productDetails = chargeableProducts.map(p =>
                `${getFullProductName(p)} (Qty: ${p.qty}, £${p.salePrice})`
            ).join(' | ');

            // Build comprehensive description with all order details
            const descriptionParts = [
                `ORDER${orderNumber ? ` #${orderNumber}` : ''}`,
                ``,
                `CUSTOMER:`,
                `Name: ${customerName || 'N/A'}`,
                `Email: ${contactInformation?.email || 'N/A'}`,
                `Phone: ${shippingInformation?.phoneNumber || 'N/A'}`,
                ``,
                `SHIPPING ADDRESS:`,
                `${shippingInformation?.address || ''}${shippingInformation?.apartment ? ', ' + shippingInformation.apartment : ''}`,
                `${shippingInformation?.city || ''}${shippingInformation?.county ? ', ' + shippingInformation.county : ''}`,
                `${shippingInformation?.postalCode || ''}, ${shippingInformation?.country || 'United Kingdom'}`,
                ``,
                `SHIPPING METHOD:`,
                shippingMethod ? `${shippingMethod.name} - £${parseFloat(shippingCost).toFixed(2)}${shippingMethod.estimatedDays ? ` (${shippingMethod.estimatedDays})` : ''}` : 'Not specified',
                ``,
                `ITEMS (${chargeableProducts.length}):`,
                ...chargeableProducts.map((p, i) =>
                    `${i + 1}. ${getFullProductName(p)} - Qty: ${p.qty} @ £${parseFloat(p.salePrice).toFixed(2)}`
                ),
                ``,
                `PRICING:`,
                `Subtotal: £${totalSalePrice.toFixed(2)}`,
                totalDiscount > 0 ? `Discount: -£${totalDiscount.toFixed(2)}${coupondata?.code ? ` (${coupondata.code})` : ''}` : null,
                shippingCost > 0 ? `Shipping: £${parseFloat(shippingCost).toFixed(2)}` : 'Shipping: FREE',
                `TOTAL: £${finalTotal.toFixed(2)}`
            ].filter(Boolean).join('\n');

            const fullDescription = descriptionParts.substring(0, 1000);

            // Create Stripe Customer with full details
            const customer = await stripe.customers.create({
                email: contactInformation?.email || "",
                name: customerName,
                phone: shippingInformation?.phoneNumber || "",
                address: {
                    line1: shippingInformation?.address || "",
                    line2: shippingInformation?.apartment || "",
                    city: shippingInformation?.city || "",
                    state: shippingInformation?.county || "",
                    postal_code: shippingInformation?.postalCode || "",
                    country: "GB"
                },
                metadata: {
                    userId: contactInformation?.userId || "",
                    orderNumber: orderNumber || "",
                }
            });

            // Create PaymentIntent with comprehensive details
            // For express checkout (Apple Pay/Google Pay), don't set shipping - the wallet handles it
            const paymentIntentData = {
                customer: customer.id,
                amount: totalAmount,
                currency: "gbp",
                automatic_payment_methods: { enabled: true },

                // Receipt email
                receipt_email: contactInformation?.email || "",

                // Description visible in Stripe Dashboard (comprehensive order details)
                description: fullDescription,

                // Statement descriptor (max 22 chars, appears on customer's card statement)
                statement_descriptor_suffix: orderNumber ? orderNumber.substring(0, 22) : "ORDER",

                // Comprehensive metadata (max 50 keys, each key max 40 chars, each value max 500 chars)
                metadata: {
                    // Order info
                    orderNumber: orderNumber || "pending",

                    // Customer info
                    customerEmail: contactInformation?.email || "",
                    customerPhone: shippingInformation?.phoneNumber || "",
                    customerName: customerName,
                    customerId: contactInformation?.userId || "",

                    // Shipping address
                    shippingAddress: fullAddress.substring(0, 500),
                    shippingCity: shippingInformation?.city || "",
                    shippingPostalCode: shippingInformation?.postalCode || "",

                    // Products
                    productCount: String(chargeableProducts.length),
                    totalItems: String(chargeableProducts.reduce((sum, p) => sum + p.qty, 0)),
                    products: productSummary,

                    // Pricing
                    subtotal: String(totalSalePrice.toFixed(2)),
                    discount: String(totalDiscount.toFixed(2)),
                    shippingCost: String(shippingCost.toFixed(2)),
                    finalTotal: String(finalTotal.toFixed(2)),

                    // Coupon info
                    couponCode: coupondata?.code || "",
                    couponType: coupondata?.discount_type || "",
                    couponDiscount: coupondata?.discount ? String(coupondata.discount) : "",
                    isExpressCheckout: isExpressCheckout ? "true" : "false",

                    // Shipping method info
                    shippingMethodName: shippingMethod?.name || "",
                    shippingMethodPrice: shippingMethod?.price ? String(shippingMethod.price) : "0",
                    shippingMethodEstimatedDays: shippingMethod?.estimatedDays || "",
                    shippingMethodId: shippingMethod?.methodId || ""
                }
            };

            // Never set `shipping` on the PaymentIntent from the server. If the
            // customer later pays via Link / Google Pay / Apple Pay, Stripe.js
            // (publishable key) must set shipping, and Stripe rejects that update
            // when the field was already written with a secret key. Shipping is
            // preserved in PI metadata + the Order record.
            const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

            console.log("PaymentIntent created:", paymentIntent.id, isExpressCheckout ? "(Express Checkout)" : "(Standard)");

            writeLog({
                event: 'backend.payment_intent.created',
                source: 'backend',
                paymentIntentId: paymentIntent.id,
                orderNumber: orderNumber || undefined,
                data: { amount: totalAmount, isExpressCheckout: !!isExpressCheckout },
            });

            void shadowLogCheckoutPricing({
                route: 'POST /create-payment-intent',
                req,
                cartproducts,
                orderNumber,
            });

            res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
                amount: totalAmount
            });
        } catch (error) {
            console.error("Error creating payment intent:", error.message);
            res.status(400).send({
                error: {
                    message: error.message,
                },
            });
        }
    },

    // Update PaymentIntent metadata with order number (called after order is created)
    updatePaymentIntentMetadata: async (req, res, next) => {
        try {
            const { paymentIntentId, orderNumber, email, phoneNumber, customerName, shippingAddress, shippingInformation, shippingMethod } = req.body;

            writeLog({
                event: 'backend.updatePaymentIntentMetadata.start',
                source: 'backend',
                paymentIntentId,
                orderNumber,
                data: { email, customerName, hasShippingInformation: !!shippingInformation },
            });

            if (!paymentIntentId || !orderNumber) {
                writeLog({
                    event: 'backend.updatePaymentIntentMetadata.missing_params',
                    source: 'backend',
                    paymentIntentId,
                    orderNumber,
                });
                return res.status(400).json({ error: 'paymentIntentId and orderNumber are required' });
            }

            if (!email && !req.user) {
                return res.status(400).json({ error: 'email is required for guest checkout' });
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            const access = await assertMetadataUpdateAccess(req, {
                paymentIntentId,
                orderNumber,
                email,
                stripe,
            });
            if (!access.ok) {
                return sendPaymentIntentAccessError(
                    res,
                    'POST /update-payment-intent-metadata',
                    req,
                    access,
                    { paymentIntentId, orderNumber }
                );
            }

            console.log('📝 Updating PaymentIntent metadata:', paymentIntentId, 'with orderNumber:', orderNumber);

            const existingIntent = access.paymentIntent;
            const existingMetadata = existingIntent.metadata || {};

            // Build updated comprehensive description
            const amount = existingIntent.amount / 100; // Convert from pence to pounds
            const shippingCost = shippingMethod?.price || parseFloat(existingMetadata.shippingMethodPrice || '0');
            const shippingMethodName = shippingMethod?.name || existingMetadata.shippingMethodName || '';
            const shippingMethodDays = shippingMethod?.estimatedDays || existingMetadata.shippingMethodEstimatedDays || '';

            // Derive granular shipping fields from the structured shippingInformation
            // if provided; otherwise fall back to existing metadata so stale placeholder
            // values from PaymentIntent creation do NOT leak through.
            const s = shippingInformation || {};
            const shippingCountryCodeMap = {
                'United Kingdom': 'GB',
                'UK': 'GB',
                'GB': 'GB',
            };
            const shippingCountryCode = shippingCountryCodeMap[s.country] || (s.country && s.country.length === 2 ? s.country : 'GB');
            const customerFullName = customerName
                || (s.firstName || s.lastName ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : '')
                || existingMetadata.customerName
                || '';

            const composedShippingAddress = shippingAddress || [
                s.address,
                s.apartment,
                s.city,
                s.county,
                s.postalCode,
                s.country || 'United Kingdom',
            ].filter(Boolean).join(', ') || existingMetadata.shippingAddress || '';

            const updatedDescriptionParts = [
                `ORDER #${orderNumber}`,
                ``,
                `CUSTOMER:`,
                `Name: ${customerFullName || 'N/A'}`,
                `Email: ${email || existingMetadata.customerEmail || 'N/A'}`,
                `Phone: ${phoneNumber || s.phoneNumber || existingMetadata.customerPhone || 'N/A'}`,
                ``,
                `SHIPPING ADDRESS:`,
                `${composedShippingAddress || 'Address on file'}`,
                ``,
                `SHIPPING METHOD:`,
                shippingMethodName ? `${shippingMethodName} - £${parseFloat(shippingCost).toFixed(2)}${shippingMethodDays ? ` (${shippingMethodDays})` : ''}` : 'Not specified',
                ``,
                `PRODUCTS:`,
                `${existingMetadata.products || 'See order details'}`,
                ``,
                `TOTAL: £${amount.toFixed(2)}`,
                existingMetadata.couponCode ? `Coupon: ${existingMetadata.couponCode}` : null,
                ``,
                `Order confirmed: ${new Date().toISOString()}`
            ].filter(Boolean).join('\n').substring(0, 1000);

            // Build the structured shipping object Stripe shows natively in the
            // dashboard. For wallet (Express Checkout) we skipped this at creation,
            // so fill it in here. Only set if we have at least an address + city.
            const hasStructuredAddress = !!(s.address || s.city || s.postalCode);
            const stripeShipping = hasStructuredAddress
                ? {
                    name: customerFullName || 'Customer',
                    phone: phoneNumber || s.phoneNumber || undefined,
                    address: {
                        line1: s.address || '',
                        line2: s.apartment || '',
                        city: s.city || '',
                        state: s.county || '',
                        postal_code: s.postalCode || '',
                        country: shippingCountryCode,
                    },
                }
                : undefined;

            const updatePayload = {
                description: updatedDescriptionParts,
                statement_descriptor_suffix: orderNumber.substring(0, 22),
                metadata: {
                    ...existingMetadata,
                    orderNumber: orderNumber,
                    orderStatus: 'confirmed',
                    customerEmail: email || existingMetadata.customerEmail || '',
                    customerPhone: phoneNumber || s.phoneNumber || existingMetadata.customerPhone || '',
                    customerName: customerFullName,
                    // Granular shipping fields — these overwrite the placeholder values
                    // ("London", "SW1A 1AA") that the initial PaymentIntent creation
                    // writes before the real address is known.
                    shippingAddress: composedShippingAddress,
                    shippingAddressLine1: s.address || existingMetadata.shippingAddressLine1 || '',
                    shippingAddressLine2: s.apartment || existingMetadata.shippingAddressLine2 || '',
                    shippingCity: s.city || existingMetadata.shippingCity || '',
                    shippingCounty: s.county || existingMetadata.shippingCounty || '',
                    shippingPostalCode: s.postalCode || existingMetadata.shippingPostalCode || '',
                    shippingCountry: s.country || existingMetadata.shippingCountry || 'United Kingdom',
                    confirmedAt: new Date().toISOString(),
                    // Shipping method info
                    shippingMethodName: shippingMethod?.name || existingMetadata.shippingMethodName || '',
                    shippingMethodPrice: shippingMethod?.price != null ? String(shippingMethod.price) : existingMetadata.shippingMethodPrice || '0',
                    shippingMethodEstimatedDays: shippingMethod?.estimatedDays || existingMetadata.shippingMethodEstimatedDays || '',
                    shippingMethodId: shippingMethod?.methodId || existingMetadata.shippingMethodId || ''
                }
            };
            // Intentionally NOT setting updatePayload.shipping here — see note in
            // createPaymentIntent. Writing shipping with the secret key locks out
            // the wallet's publishable-key shipping update and breaks Link / Google Pay.
            // `stripeShipping` is still used below to update the Customer default address.

            const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, updatePayload);

            console.log('✅ PaymentIntent metadata updated successfully');

            // Also update the attached Stripe Customer. At PI creation we seeded
            // it with placeholders ("Pending Customer", "pending@checkout.local",
            // phone "00000000000"). Without this call those stay visible forever
            // in the Dashboard's Customer panel, even though PI metadata is right.
            const customerId = existingIntent.customer || paymentIntent.customer;
            if (customerId) {
                try {
                    const customerUpdate = {};
                    if (email) customerUpdate.email = email;
                    if (customerFullName) customerUpdate.name = customerFullName;
                    const phoneForCustomer = phoneNumber || s.phoneNumber;
                    if (phoneForCustomer) customerUpdate.phone = phoneForCustomer;
                    if (hasStructuredAddress) {
                        customerUpdate.address = {
                            line1: s.address || '',
                            line2: s.apartment || '',
                            city: s.city || '',
                            state: s.county || '',
                            postal_code: s.postalCode || '',
                            country: shippingCountryCode,
                        };
                    }
                    if (hasStructuredAddress && stripeShipping) {
                        customerUpdate.shipping = stripeShipping;
                    }
                    if (Object.keys(customerUpdate).length > 0) {
                        await stripe.customers.update(customerId, customerUpdate);
                        writeLog({
                            event: 'backend.updateCustomer.success',
                            source: 'backend',
                            paymentIntentId: paymentIntent.id,
                            orderNumber,
                            data: { customerId, fieldsUpdated: Object.keys(customerUpdate) },
                        });
                    }
                } catch (customerErr) {
                    // Customer update is nice-to-have; don't fail the whole call.
                    console.error('⚠️ Failed to update Stripe Customer:', customerErr.message);
                    writeLog({
                        event: 'backend.updateCustomer.error',
                        source: 'backend',
                        paymentIntentId: paymentIntent.id,
                        orderNumber,
                        data: { customerId, message: customerErr.message },
                    });
                }
            }

            writeLog({
                event: 'backend.updatePaymentIntentMetadata.success',
                source: 'backend',
                paymentIntentId: paymentIntent.id,
                orderNumber,
                data: { metadataOrderNumber: paymentIntent.metadata?.orderNumber },
            });

            res.json({
                success: true,
                paymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata
            });
        } catch (error) {
            console.error('Error updating PaymentIntent metadata:', error);
            writeLog({
                event: 'backend.updatePaymentIntentMetadata.error',
                source: 'backend',
                paymentIntentId: req.body?.paymentIntentId,
                orderNumber: req.body?.orderNumber,
                data: { message: error.message },
            });
            res.status(500).json({ error: error.message });
        }
    },

    // Update PaymentIntent amount when shipping method changes
    updatePaymentIntentAmount: async (req, res, next) => {
        try {
            const { paymentIntentId, cartproducts, coupondata, shippingMethod, email } = req.body;

            if (!paymentIntentId) {
                return res.status(400).json({ error: 'paymentIntentId is required' });
            }

            if (!email && !req.user) {
                return res.status(400).json({ error: 'email is required for guest checkout' });
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            const access = await assertPaymentIntentMutateAccess(req, {
                paymentIntentId,
                contactEmail: email,
                stripe,
                amountUpdateOnly: true,
            });
            if (!access.ok) {
                return sendPaymentIntentAccessError(
                    res,
                    'POST /update-payment-intent-amount',
                    req,
                    access,
                    { paymentIntentId }
                );
            }

            console.log('💰 Updating PaymentIntent amount:', paymentIntentId);

            if (!cartproducts || !Array.isArray(cartproducts) || cartproducts.length === 0) {
                return res.status(400).json({ error: 'cartproducts are required' });
            }

            const chargeableProducts = cartproducts.filter(product => !product.isTradeIn);

            const checkout = await computeCheckoutTotal({
                req,
                cartItems: chargeableProducts,
                couponInput: coupondata,
                shippingMethodInput: shippingMethod,
            });
            const checkoutHttpError = checkoutTotalToHttp(checkout);
            if (checkoutHttpError) {
                logCheckoutPricingBlocked(
                    'POST /update-payment-intent-amount',
                    req.body?.orderNumber,
                    checkout
                );
                return res.status(checkoutHttpError.status).json(checkoutHttpError.body);
            }

            logCheckoutPricingSuccess(
                'POST /update-payment-intent-amount',
                req.body?.orderNumber,
                checkout.pricingResult
            );

            const shippingCost = checkout.shippingCost;
            const finalTotal = checkout.finalTotal;
            const totalAmount = checkout.totalAmountPence;

            console.log(`New amount: ${totalAmount} pence (£${finalTotal}) - Products: £${checkout.adjustedProductTotal}, Shipping: £${shippingCost}`);

            if (totalAmount <= 0) {
                return res.status(400).json({ error: 'Invalid amount calculated' });
            }

            const existingMetadata = access.paymentIntent.metadata || {};

            // Update PaymentIntent amount and metadata (merge — do not wipe existing keys)
            const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
                amount: totalAmount,
                metadata: {
                    ...existingMetadata,
                    shippingMethodName: shippingMethod?.name || existingMetadata.shippingMethodName || '',
                    shippingMethodPrice: String(shippingCost),
                    shippingMethodEstimatedDays: shippingMethod?.estimatedDays || existingMetadata.shippingMethodEstimatedDays || '',
                    shippingMethodId: shippingMethod?.methodId || existingMetadata.shippingMethodId || '',
                    shippingCost: String(shippingCost.toFixed(2)),
                    finalTotal: String(finalTotal.toFixed(2)),
                }
            });

            console.log('✅ PaymentIntent amount updated:', paymentIntent.id, '- New amount:', totalAmount);

            void shadowLogCheckoutPricing({
                route: 'POST /update-payment-intent-amount',
                req,
                cartproducts,
                orderNumber: req.body?.orderNumber,
            });

            res.json({
                success: true,
                paymentIntentId: paymentIntent.id,
                amount: totalAmount,
                finalTotal: finalTotal,
                clientSecret: paymentIntent.client_secret
            });
        } catch (error) {
            console.error('Error updating PaymentIntent amount:', error);
            res.status(500).json({ error: error.message });
        }
    },

    retrievePaymentDetails: async (req, res, next) => {
        try {
            const { paymentIntentId, email } = req.body;
            console.log("Retrieving payment details for:", paymentIntentId);

            if (!paymentIntentId) {
                throw new Error("Payment intent ID is required");
            }

            if (!email && !req.user) {
                return res.status(400).json({
                    error: { message: 'email is required for guest checkout' },
                });
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            const access = await assertPaymentIntentReadAccess(req, {
                paymentIntentId,
                contactEmail: email,
                stripe,
            });
            if (!access.ok) {
                return sendPaymentIntentAccessError(
                    res,
                    'POST /retrieve-payment-details',
                    req,
                    access,
                    { paymentIntentId }
                );
            }

            const paymentIntent = access.paymentIntent;
            if (!paymentIntent) {
                throw new Error("Payment intent not found");
            }

            // Check payment status
            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not completed. Current status: ${paymentIntent.status}`);
            }

            let cardDetails = null;
            let paymentType = "Unknown";

            // Try to get payment method details
            if (paymentIntent.payment_method) {
                try {
                    const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                    cardDetails = buildSafeCardDetailsFromPaymentMethod(paymentMethod);
                    if (paymentMethod.card) {
                        paymentType = "Card";
                    } else if (paymentMethod.link) {
                        paymentType = "Link";
                    } else if (paymentMethod.paypal) {
                        paymentType = "PayPal";
                    } else if (paymentMethod.klarna) {
                        paymentType = "Klarna";
                    }
                } catch (pmError) {
                    console.log("Could not retrieve payment method, checking charge...");
                }
            }

            // Fallback to charge details if payment method not available
            if (!cardDetails && paymentIntent.latest_charge) {
                try {
                    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
                    cardDetails = buildSafeCardDetailsFromCharge(charge);
                    if (charge.payment_method_details?.card) {
                        paymentType = "Card";
                    } else if (charge.payment_method_details?.link) {
                        paymentType = "Link";
                    } else if (charge.payment_method_details?.paypal) {
                        paymentType = "PayPal";
                    } else if (charge.payment_method_details?.klarna) {
                        paymentType = "Klarna";
                    }
                } catch (chargeError) {
                    console.log("Could not retrieve charge details");
                }
            }

            res.json(buildSafePaymentDetailsResponse({
                paymentIntent,
                cardDetails,
                paymentType,
            }));
        } catch (error) {
            console.error("Error retrieving payment details:", error.message);
            res.status(400).send({
                error: {
                    message: error.message,
                },
            });
        }
    },

    retrievePaymentDetailsSession: async (req, res, next) => {
        try {
            const { sessionId, email } = req.body;

            if (!sessionId) {
                throw new Error("Session ID is required");
            }

            if (!email && !req.user) {
                return res.status(400).json({
                    error: { message: 'email is required for guest checkout' },
                });
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            // Retrieve session details
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            const sessionAccess = assertCheckoutSessionReadAccess(req, session, email);
            if (!sessionAccess.ok) {
                return sendPaymentIntentAccessError(
                    res,
                    'POST /retrieve-payment-details-session',
                    req,
                    sessionAccess,
                    { sessionId }
                );
            }

            if (!session || !session.payment_intent) {
                throw new Error("No payment intent associated with this session");
            }

            // Retrieve payment intent
            const paymentIntentId = session.payment_intent;
            const access = await assertPaymentIntentReadAccess(req, {
                paymentIntentId,
                contactEmail: email,
                stripe,
            });
            if (!access.ok) {
                return sendPaymentIntentAccessError(
                    res,
                    'POST /retrieve-payment-details-session',
                    req,
                    access,
                    { paymentIntentId, sessionId }
                );
            }

            const paymentIntent = access.paymentIntent;

            if (paymentIntent.status !== 'succeeded') {
                throw new Error(`Payment not completed. Current status: ${paymentIntent.status}`);
            }

            let cardDetails = null;
            let paymentType = 'Unknown';

            if (paymentIntent.payment_method) {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                cardDetails = buildSafeCardDetailsFromPaymentMethod(paymentMethod);
                if (paymentMethod.card) {
                    paymentType = 'Card';
                } else if (paymentMethod.link) {
                    paymentType = 'Link';
                } else if (paymentMethod.paypal) {
                    paymentType = 'PayPal';
                } else if (paymentMethod.klarna) {
                    paymentType = 'Klarna';
                }
            } else if (paymentIntent.latest_charge) {
                const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
                cardDetails = buildSafeCardDetailsFromCharge(charge);
                if (charge.payment_method_details?.card) {
                    paymentType = 'Card';
                } else if (charge.payment_method_details?.klarna) {
                    paymentType = 'Klarna';
                }
            } else {
                throw new Error("No payment method or charges associated with this payment intent");
            }

            res.json(buildSafePaymentDetailsResponse({
                paymentIntent,
                cardDetails,
                paymentType,
            }));
    
        } catch (error) {
            console.error("Error retrieving session or payment details:", error.message);
            res.status(400).send({
                error: {
                    message: error.message,
                },
            });
        }
    },
    
    
   
    createCheckoutSession: async (req, res, next) => {
        try {
            const {
                cartproducts,
                paymentIntentId,
                coupondata,
                shippingInformation,
                shippingMethod,
                orderNumber,
            } = req.body;
            const contactInformation = req.body.contactInformation || { email: "", userId: "" };

            if (!cartproducts || !Array.isArray(cartproducts) || cartproducts.length === 0) {
                return res.status(400).json({ error: 'Cart products are required' });
            }

            const stripe = await getStripeInstance();
            const chargeableProducts = cartproducts.filter((product) => !product.isTradeIn);

            const checkout = await computeCheckoutTotal({
                req,
                cartItems: chargeableProducts,
                couponInput: coupondata,
                shippingMethodInput: shippingMethod || req.body.shippingMethod,
                enforceClientPriceMatch: false,
            });

            const checkoutHttpError = checkoutTotalToHttp(checkout);
            if (checkoutHttpError) {
                logCheckoutPricingBlocked(
                    'POST /create-checkout-session',
                    orderNumber,
                    checkout
                );
                return res.status(checkoutHttpError.status).json(checkoutHttpError.body);
            }

            if (checkout.pricingResult?.clientPriceMismatch) {
                console.warn(
                    JSON.stringify({
                        event: 'PRICING_CHECKOUT_SESSION_MISMATCH',
                        route: 'POST /create-checkout-session',
                        orderNumber: orderNumber || null,
                        clientSubtotal: checkout.pricingResult.clientSubtotal,
                        serverSubtotal: checkout.pricingResult.serverSubtotal,
                        subtotalDelta: checkout.pricingResult.subtotalDelta,
                        mismatchCount: checkout.pricingResult.mismatches?.length || 0,
                        usedServerAmount: true,
                    })
                );
            } else {
                logCheckoutPricingSuccess(
                    'POST /create-checkout-session',
                    orderNumber,
                    checkout.pricingResult
                );
            }

            void shadowLogCheckoutPricing({
                route: 'POST /create-checkout-session',
                req,
                cartproducts,
                orderNumber,
            });

            const totalAmount = checkout.totalAmountPence;
            const serverLines = checkout.pricingResult.resolvedServerLines || [];

            const lineItems = buildCheckoutSessionLineItems({
                cartProducts: chargeableProducts,
                serverLines,
                productSubtotal: checkout.productSubtotal,
                totalDiscount: checkout.totalDiscount,
                shippingCost: checkout.shippingCost,
                shippingMethod: checkout.shippingMethod,
                frontendUrl: process.env.FRONTEND_URL,
            });

            if (totalAmount <= 0) {
                return res.status(400).json({ error: 'Invalid amount calculated' });
            }

            const customer = await stripe.customers.create({
                email: contactInformation.email || "",
                metadata: {
                    userId: contactInformation.userId || "",
                    firstName: shippingInformation?.firstName || "",
                    lastName: shippingInformation?.lastName || "",
                    address: shippingInformation?.address || "",
                    apartment: shippingInformation?.apartment || "",
                    country: shippingInformation?.country || "United Kingdom",
                    city: shippingInformation?.city || "",
                    county: shippingInformation?.county || "",
                    postalCode: shippingInformation?.postalCode || "",
                    phoneNumber: shippingInformation?.phoneNumber || ""
                }
            });

            let paymentIntent;
            if (paymentIntentId) {
                paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
                    amount: totalAmount,
                });
            } else {
                paymentIntent = await stripe.paymentIntents.create({
                    customer: customer.id,
                    setup_future_usage: "off_session",
                    amount: totalAmount,
                    currency: "gbp",
                    automatic_payment_methods: { enabled: true },
                });
            }

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'klarna', 'paypal'],
                line_items: lineItems,
                mode: "payment",
                success_url: `${process.env.FRONTEND_URL}/checkout?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/checkout?payment_cancel=true`,
                client_reference_id: paymentIntent.id,
                customer: customer.id,
                metadata: {
                    email: contactInformation.email,
                    phoneNumber: shippingInformation?.phoneNumber || "",
                    orderNumber: orderNumber || "",
                }
            });

            res.json({
                id: session.id,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                status: 201,
                url: session.url,
                message: 'Checkout session created or updated successfully',
            });
        } catch (error) {
            console.error("Error creating checkout session:", error);
            res.status(500).json({ error: "An error occurred during checkout session creation" });
        }
    },
    
   createPayPalPayment: async (req, res, next) => {
        try {
            const { totalAmount } = req.body; // Destructure totalAmount from req.body
            if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
                throw new Error("Invalid total amount provided");
            }
    
            const create_payment_json = {
                intent: 'sale',
                payer: {
                    payment_method: 'paypal'
                },
                redirect_urls: {
                    return_url: `${process.env.FRONTEND_URL}/success`, // Update these URLs to point to your frontend
                    cancel_url: `${process.env.FRONTEND_URL}/cancel`
                },
                transactions: [{
                    item_list: {
                        items: [{
                            name: 'Your Item Name', // Dynamic item name can be added here
                            sku: '001', // SKU or product ID
                            price: totalAmount, // Use totalAmount here, converted to a string if necessary
                            currency: 'GBP', // Currency consistent with your project
                            quantity: 1 // Dynamic quantity based on your project
                        }]
                    },
                    amount: {
                        currency: 'GBP', // Keep the currency consistent
                        total: totalAmount.toString() // Ensure totalAmount is a string
                    },
                    description: 'Payment for your item.'
                }]
            };
    
            paypal.payment.create(create_payment_json, function (error, payment) {
                // Async PayPal callback — outer try/catch cannot catch throws here, so
                // any error must be handled inline. headersSent guard prevents the
                // "Cannot set headers after they are sent" crash if response already went out.
                if (error) {
                    console.error("PayPal createPayPalPayment error:", error);
                    if (!res.headersSent) {
                        return res.status(502).json({
                            error: (error && error.response) || error.message || 'PayPal payment creation failed'
                        });
                    }
                    return;
                }
                if (!res.headersSent) {
                    return res.json(payment);
                }
            });
        } catch (error) {
            console.error("Error in createPayPalPayment: ", error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    },
    
    // Execute PayPal payment after approval
    executePayPalPayment: (req, res) => {
        try {   
            const { paymentId, payerId, totalAmount } = req.body; // Destructure required fields from req.body
            console.log(paymentId, payerId, totalAmount);
            if (!paymentId || !payerId || !totalAmount) {
                throw new Error("Payment ID, Payer ID, and total amount are required");
            }
    
            const execute_payment_json = {
                payer_id: payerId,
                transactions: [{
                    amount: {
                        currency: 'GBP', // Currency should match the one used in createPayPalPayment
                        total: totalAmount.toString() // Ensure the total matches the create-payment call
                    }
                }]
            };
        
            paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
                if (error) {
                    console.error("PayPal Payment Execution Error: ", error.response || error);
                    if (!res.headersSent) {
                        return res.status(502).json({ error: error.response || error.message });
                    }
                    return;
                }
                if (!res.headersSent) {
                    return res.json({ status: 'success', payment });
                }
            });
        } catch (error) {
            console.error("Error in executePayPalPayment: ", error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    },

    verifyPaymentPaypal: (req, res) => {
        try {
            const { cartproducts, coupondata } = req.body; // Extract received data

            console.log("===== Start PayPal Payment Process =====");
            console.log("Received cart products:", JSON.stringify(cartproducts, null, 2));
            console.log("Received coupon data:", JSON.stringify(coupondata, null, 2));

            // Calculate the total sale price from the cart products
            let totalSalePrice = cartproducts.reduce((sum, product) => {
                const productTotal = product.salePrice * product.qty;
                console.log(`Product: ${product.productName}, Sale Price: ${product.salePrice}, Quantity: ${product.qty}, Product Total: ${productTotal}`);
                return sum + productTotal;
            }, 0);

            console.log("Total sale price of all products:", totalSalePrice);

            let totalDiscount = 0; // Initialize total discount

            // Apply coupon if available
            if (coupondata) {
                console.log("Applying coupon...");
                if (coupondata.discount_type === "flat") {
                    totalDiscount = coupondata.discount;
                    console.log(`Flat discount applied: ${totalDiscount}`);
                } else if (coupondata.discount_type === "percentage") {
                    const discountAmount = (totalSalePrice * coupondata.discount) / 100;
                    totalDiscount = coupondata.upto ? Math.min(discountAmount, coupondata.upto) : discountAmount;
                    console.log(`Percentage discount applied: ${coupondata.discount}% off, Discount Amount: ${totalDiscount}`);
                }
            } else {
                console.log("No coupon applied.");
            }

            // Calculate the adjusted total price after discount
            let adjustedTotalPrice = Math.max(0, totalSalePrice - totalDiscount);
            adjustedTotalPrice = parseFloat(adjustedTotalPrice.toFixed(2));  // Round to two decimal places
            console.log("Adjusted total price after applying discount:", adjustedTotalPrice);

            // Distribute the total discount proportionally across products
            const discountProportion = totalDiscount / totalSalePrice;
            console.log("Discount proportion for each product:", discountProportion);

            let calculatedSubtotal = 0; // Initialize the subtotal variable

            console.log("Preparing PayPal payment JSON...");
            // Prepare the payment creation object
            let create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": `${process.env.FRONTEND_URL}/checkout?paypalpayment_success=true`,
                    "cancel_url": `${process.env.FRONTEND_URL}/checkout`
                },
                "transactions": [{
                    "item_list": {
                        "items": cartproducts.map(product => {
                            let discountedSalePrice = product.salePrice - (product.salePrice * discountProportion);

                            // Ensure the price is non-negative and round to two decimal points
                            discountedSalePrice = Math.max(0, discountedSalePrice);
                            discountedSalePrice = parseFloat(discountedSalePrice.toFixed(2));

                            console.log(`Product: ${product.productName}, Original Sale Price: ${product.salePrice}, Discounted Sale Price: ${discountedSalePrice}, Quantity: ${product.qty}`);

                            // Accumulate the subtotal
                            const productSubtotal = discountedSalePrice * product.qty;
                            calculatedSubtotal += productSubtotal;
                            console.log(`Subtotal for ${product.productName}: ${productSubtotal}, Running Subtotal: ${calculatedSubtotal}`);

                            return {
                                "name": product.productName,
                                "sku": product._id, // Use product ID as SKU
                                "price": discountedSalePrice.toFixed(2), // Price with 2 decimal points
                                "currency": "GBP",
                                "quantity": product.qty
                            };
                        })
                    },
                    "amount": {
                        "currency": "GBP",
                        "total": adjustedTotalPrice.toFixed(2), // Total price based on adjusted total price
                        "details": {
                            "subtotal": calculatedSubtotal.toFixed(2), // Use the accumulated subtotal
                            "shipping": "0.00",  // Add shipping cost if applicable
                            "tax": "0.00"        // Add tax if applicable
                        }
                    },
                    "description": "Payment for products in the cart."
                }]
            };

            console.log("PayPal payment JSON prepared:", JSON.stringify(create_payment_json, null, 2));

            // Ensure that subtotal + shipping + tax adds up to the total
            const calculatedTotal = parseFloat(create_payment_json.transactions[0].amount.details.subtotal)
                + parseFloat(create_payment_json.transactions[0].amount.details.shipping)
                + parseFloat(create_payment_json.transactions[0].amount.details.tax);

            console.log("Calculated total (Subtotal + Shipping + Tax):", calculatedTotal.toFixed(2));
            console.log("Adjusted total price before final adjustment:", adjustedTotalPrice.toFixed(2));

            // Adjust the total price to match the calculated total
            if (calculatedTotal.toFixed(2) !== adjustedTotalPrice.toFixed(2)) {
                console.log("Mismatch detected: Adjusting adjustedTotalPrice and subtotal...");
                adjustedTotalPrice = parseFloat(calculatedTotal.toFixed(2));  // Ensure adjustedTotalPrice is a number and matches calculated total
                create_payment_json.transactions[0].amount.total = adjustedTotalPrice.toFixed(2);
                create_payment_json.transactions[0].amount.details.subtotal = (calculatedTotal - parseFloat(create_payment_json.transactions[0].amount.details.shipping)).toFixed(2);
            }

            console.log("Final adjusted total price after adjustment:", adjustedTotalPrice.toFixed(2));

            if (parseFloat(calculatedTotal.toFixed(2)) !== parseFloat(create_payment_json.transactions[0].amount.total)) {
                console.error("Mismatch between subtotal and total price");
                throw new Error("Mismatch between subtotal, tax, shipping, and total price");
            }

            console.log("Attempting to create PayPal payment...");

            // Create the PayPal payment
            paypal.payment.create(create_payment_json, function (error, payment) {
                // Async callback — never throw; respond inline and guard against double-send.
                if (error) {
                    console.error("Error creating PayPal payment:", error);
                    if (!res.headersSent) {
                        return res.status(502).send("Error processing PayPal payment");
                    }
                    return;
                }
                console.log("PayPal Payment created successfully");
                if (!res.headersSent) {
                    return res.json(payment);
                }
            });
        } catch (error) {
            console.error("Error in verifyPaymentPaypal:", error);
            if (!res.headersSent) {
                res.status(500).send("Error processing PayPal payment");
            }
        }
    },
    // success payment
    successPaymentPaypal: (req, res) => {
        try {
            // Extract the necessary query parameters from PayPal's callback
            const payerId = req.query.PayerID;
            const paymentId = req.query.paymentId;

            console.log("PayerID:", payerId);
            console.log("PaymentID:", paymentId);

            // Here you would fetch the total amount dynamically based on the session or database
            const totalPrice = req.session.totalPrice || ''; // Example: use session to store total price dynamically

            // Create the JSON object required for executing the PayPal payment
            const execute_payment_json = {
                "payer_id": payerId,
                "transactions": [{
                    "amount": {
                        "currency": "GBP",
                        "total": totalPrice.toFixed(2) // Make sure the price is a string with two decimal points
                    },
                    "description": "This is the payment description."
                }]
            };

            // Execute the PayPal payment
            paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
                if (error) {
                    console.error("Error during payment execution:", error);
                    return res.redirect(`${process.env.FRONTEND_URL}/checkout`); // Redirect to failure page
                } else {
                    console.log("Payment executed successfully:", payment);

                    // Optionally, you can parse the response and store the payment info in the database
                    const response = JSON.stringify(payment);
                    const ParsedResponse = JSON.parse(response);
                    console.log("Parsed Response:", ParsedResponse);

                    // Redirect to success page
                    return res.redirect(`${process.env.FRONTEND_URL}/checkout?paypalpayment_success=true`);
                }
            });
        } catch (error) {
            console.error("Error in successPaymentPaypal:", error);
            return res.redirect(`${process.env.FRONTEND_URL}/checkout`); // Redirect to failure page on exception
        }
    },

    // Stripe Webhook Handler - handles payment success/failure events
    stripeWebhook: async (req, res) => {
        const sig = req.headers['stripe-signature'];

        // Setup phase — wrapped so a DB / Stripe init failure cannot become an unhandled
        // promise rejection that crashes the process. We must always respond.
        //
        // Booking packages can each take payment into a different Stripe account, so
        // an event may be signed by any of several signing secrets. Collect every
        // candidate (platform default first, then each active named account).
        let candidates;
        try {
            const { getWebhookVerificationCandidates } = require('../services/stripe/resolveStripeAccount');
            candidates = await getWebhookVerificationCandidates();

            if (candidates.length === 0) {
                const envSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
                const keys = await StripeSettings.getActiveKeys();
                if (envSecret || keys?.webhookSecret) {
                    candidates = [{
                        secretKey: keys?.secretKey || process.env.STRIPE_SECRET_KEY,
                        webhookSecret: keys?.webhookSecret || envSecret,
                        accountId: null,
                        label: 'Platform default',
                    }];
                }
            }
        } catch (setupErr) {
            console.error('❌ Stripe webhook setup failed:', setupErr.message);
            // 503 → Stripe will retry; transient setup errors should be retried.
            if (!res.headersSent) {
                return res.status(503).send('Webhook setup failure');
            }
            return;
        }

        if (!candidates || candidates.length === 0) {
            console.error('❌ Stripe webhook: no signing secret configured');
            auditFailure({
                event: 'webhook.not_configured',
                stage: 'webhook',
                source: 'webhook',
                severity: 'critical',
                failureReason: 'No webhook signing secret configured anywhere',
                message: 'Every Stripe event will be rejected until a signing secret is saved',
                httpStatus: 503,
            });
            return res.status(503).send('Webhook not configured');
        }

        let event = null;
        let stripe = null;
        let matchedAccount = null;
        let lastVerifyError = null;

        for (const candidate of candidates) {
            try {
                const candidateStripe = require('stripe')(candidate.secretKey);
                event = candidateStripe.webhooks.constructEvent(req.body, sig, candidate.webhookSecret);
                stripe = candidateStripe;
                matchedAccount = candidate;
                break;
            } catch (err) {
                lastVerifyError = err;
            }
        }

        if (!event) {
            console.error(
                `❌ Webhook signature verification failed against ${candidates.length} account(s):`,
                lastVerifyError?.message
            );
            auditFailure({
                error: lastVerifyError,
                event: 'webhook.signature_verification_failed',
                stage: 'webhook',
                source: 'webhook',
                severity: 'critical',
                failureReason: 'Webhook signature did not match any configured secret',
                message: `Tried ${candidates.length} account(s) — payments will not auto-confirm`,
                httpStatus: 400,
                data: { accountsTried: candidates.map((c) => c.label) },
            });
            return res.status(400).send(`Webhook Error: ${lastVerifyError?.message || 'signature mismatch'}`);
        }

        console.log(`✅ Webhook signature verified (account: ${matchedAccount.label})`);
        logCheckout({
            event: `webhook.received.${event.type}`,
            stage: 'webhook',
            source: 'webhook',
            outcome: 'info',
            message: `Verified ${event.type} on "${matchedAccount.label}"`,
            stripeAccountLabel: matchedAccount.label,
            paymentIntentId: event.data?.object?.id,
            data: { eventId: event.id, livemode: event.livemode },
        });

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('💰 PaymentIntent succeeded:', paymentIntent.id);

                try {
                    // Get payment method details
                    let cardDetails = {};
                    let paymentType = 'Card';

                    if (paymentIntent.payment_method) {
                        const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);

                        if (paymentMethod.card) {
                            paymentType = 'Card';
                            cardDetails = {
                                brand: paymentMethod.card.brand,
                                last4: paymentMethod.card.last4,
                                exp_month: paymentMethod.card.exp_month,
                                exp_year: paymentMethod.card.exp_year,
                            };
                        } else if (paymentMethod.klarna) {
                            paymentType = 'Klarna';
                            cardDetails = { payment_type: 'Klarna' };
                        } else if (paymentMethod.paypal) {
                            paymentType = 'PayPal';
                            cardDetails = { payment_type: 'PayPal' };
                        } else if (paymentMethod.link) {
                            paymentType = 'Link';
                            cardDetails = { payment_type: 'Link' };
                        }
                    }

                    // Check if this is a booking payment or order payment
                    const metadataPaymentType = paymentIntent.metadata?.paymentType;
                    const bookingNumber = paymentIntent.metadata?.bookingNumber;
                    const orderNumber = paymentIntent.metadata?.orderNumber;

                    writeLog({
                        event: 'backend.webhook.payment_intent.succeeded',
                        source: 'backend',
                        paymentIntentId: paymentIntent.id,
                        orderNumber: orderNumber || undefined,
                        bookingNumber: bookingNumber || undefined,
                        paymentMethodType: paymentType,
                        data: {
                            metadataPaymentType: metadataPaymentType,
                            metadataOrderNumberRaw: paymentIntent.metadata?.orderNumber,
                            metadataBookingNumberRaw: paymentIntent.metadata?.bookingNumber,
                            metadataKeys: Object.keys(paymentIntent.metadata || {}),
                            amount: paymentIntent.amount / 100,
                            currency: paymentIntent.currency,
                            isExpressCheckout: paymentIntent.metadata?.isExpressCheckout,
                        },
                    });

                    // Handle BOOKING payment
                    if (metadataPaymentType === 'booking' && bookingNumber) {
                        console.log('📅 Processing booking payment for:', bookingNumber);
                        const bookingResult = await confirmBookingPayment(bookingNumber, paymentIntent, {
                            paymentType,
                            cardDetails,
                        });

                        if (bookingResult.success) {
                            console.log('✅ Booking confirmed:', bookingNumber);
                            auditSuccess({
                                event: 'booking.completed',
                                stage: 'complete',
                                flow: 'booking',
                                source: 'webhook',
                                message: `Booking ${bookingNumber} confirmed by Stripe webhook`,
                                bookingNumber,
                                paymentIntentId: paymentIntent.id,
                                paymentIntentStatus: paymentIntent.status,
                                paymentMethodType: paymentType,
                                amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
                                currency: paymentIntent.currency,
                                customerEmail: paymentIntent.receipt_email || undefined,
                                data: { alreadyConfirmed: bookingResult.alreadyConfirmed || false },
                            });
                            writeLog({
                                event: 'backend.webhook.booking_confirmed',
                                source: 'backend',
                                paymentIntentId: paymentIntent.id,
                                bookingNumber,
                                paymentMethodType: paymentType,
                                data: { alreadyConfirmed: bookingResult.alreadyConfirmed || false },
                            });
                        } else {
                            console.log('⚠️ Booking confirmation failed:', bookingNumber, bookingResult.error);
                            auditFailure({
                                event: 'booking.webhook_confirm_failed',
                                stage: 'webhook',
                                flow: 'booking',
                                source: 'webhook',
                                severity: 'critical',
                                failureReason: bookingResult.error || 'Booking confirmation failed',
                                message: bookingResult.needsRefund
                                    ? `PAID BUT UNFULFILLED — ${bookingNumber} needs a refund`
                                    : `PAID BUT NOT CONFIRMED — ${bookingNumber}`,
                                bookingNumber,
                                paymentIntentId: paymentIntent.id,
                                paymentMethodType: paymentType,
                                amount: paymentIntent.amount ? paymentIntent.amount / 100 : undefined,
                                currency: paymentIntent.currency,
                                data: { needsRefund: bookingResult.needsRefund || false },
                            });
                            writeLog({
                                event: 'backend.webhook.booking_confirmation_failed',
                                source: 'backend',
                                paymentIntentId: paymentIntent.id,
                                bookingNumber,
                                paymentMethodType: paymentType,
                                data: { error: bookingResult.error, needsRefund: bookingResult.needsRefund },
                            });
                        }
                    }
                    // Handle ORDER payment
                    else if (orderNumber) {
                        const updatedOrder = await Order.findOneAndUpdate(
                            { orderNumber: orderNumber },
                            {
                                status: 'Pending', // Payment successful, order is pending fulfillment
                                paymentDetails: {
                                    paymentIntentId: paymentIntent.id,
                                    paymentType: paymentType,
                                    cardDetails: cardDetails,
                                    amount: paymentIntent.amount / 100,
                                    currency: paymentIntent.currency,
                                    status: 'succeeded',
                                    paidAt: new Date(),
                                },
                                updatedAt: new Date(),
                            },
                            { new: true }
                        );

                        if (updatedOrder) {
                            console.log('✅ Order updated successfully:', orderNumber);
                            writeLog({
                                event: 'backend.webhook.order_updated_to_pending',
                                source: 'backend',
                                paymentIntentId: paymentIntent.id,
                                orderNumber,
                                paymentMethodType: paymentType,
                            });

                            // TODO: Send confirmation email here if needed
                            // You can add email sending logic here
                        } else {
                            console.log('⚠️ No order found with orderNumber:', orderNumber);
                            writeLog({
                                event: 'backend.webhook.order_not_found',
                                source: 'backend',
                                paymentIntentId: paymentIntent.id,
                                orderNumber,
                                paymentMethodType: paymentType,
                            });
                        }
                    } else {
                        console.log('⚠️ No orderNumber in paymentIntent metadata');
                        writeLog({
                            event: 'backend.webhook.no_ordernumber_in_metadata',
                            source: 'backend',
                            paymentIntentId: paymentIntent.id,
                            paymentMethodType: paymentType,
                            data: { metadataKeys: Object.keys(paymentIntent.metadata || {}) },
                        });
                    }
                } catch (error) {
                    console.error('❌ Error processing payment_intent.succeeded:', error);
                    auditLogService.logError({
                        action: 'stripe.webhook.payment_intent_succeeded_failed',
                        category: 'payment',
                        message: 'Internal failure while processing payment_intent.succeeded',
                        req,
                        error,
                        metadata: {
                            paymentIntentId: paymentIntent && paymentIntent.id,
                            orderNumber: paymentIntent && paymentIntent.metadata && paymentIntent.metadata.orderNumber,
                        },
                    }).catch(() => {});
                }
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('❌ PaymentIntent failed:', failedPayment.id);

                writeLog({
                    event: 'backend.webhook.payment_intent.failed',
                    source: 'backend',
                    paymentIntentId: failedPayment.id,
                    orderNumber: failedPayment.metadata?.orderNumber || undefined,
                    data: {
                        message: failedPayment.last_payment_error?.message || null,
                    },
                });

                try {
                    const failedMetadataPaymentType = failedPayment.metadata?.paymentType;
                    const failedBookingNumber = failedPayment.metadata?.bookingNumber;
                    const failedOrderNumber = failedPayment.metadata?.orderNumber;

                    // Handle BOOKING payment failure
                    if (failedMetadataPaymentType === 'booking' && failedBookingNumber) {
                        console.log('📅 Processing booking payment failure for:', failedBookingNumber);
                        await handleBookingPaymentFailed(failedBookingNumber, failedPayment);
                        console.log('✅ Booking marked as payment failed:', failedBookingNumber);
                        auditFailure({
                            event: 'booking.payment_failed',
                            stage: 'payment_result',
                            flow: 'booking',
                            source: 'webhook',
                            severity: 'warn',
                            failureReason:
                                failedPayment?.last_payment_error?.message || 'Card payment failed',
                            message: `Customer's payment failed for ${failedBookingNumber}`,
                            bookingNumber: failedBookingNumber,
                            paymentIntentId: failedPayment?.id,
                            paymentIntentStatus: failedPayment?.status,
                            amount: failedPayment?.amount ? failedPayment.amount / 100 : undefined,
                            currency: failedPayment?.currency,
                            stripeErrorCode: failedPayment?.last_payment_error?.code,
                            stripeDeclineCode: failedPayment?.last_payment_error?.decline_code,
                            stripeErrorType: failedPayment?.last_payment_error?.type,
                            customerEmail: failedPayment?.receipt_email || undefined,
                        });
                    }
                    // Handle ORDER payment failure
                    else if (failedOrderNumber) {
                        await Order.findOneAndUpdate(
                            { orderNumber: failedOrderNumber },
                            {
                                status: 'Failed',
                                paymentDetails: {
                                    paymentIntentId: failedPayment.id,
                                    status: 'failed',
                                    error: failedPayment.last_payment_error?.message || 'Payment failed',
                                    failedAt: new Date(),
                                },
                                updatedAt: new Date(),
                            }
                        );
                        console.log('✅ Order marked as failed:', failedOrderNumber);
                    }
                } catch (error) {
                    console.error('❌ Error processing payment_intent.payment_failed:', error);
                    auditLogService.logError({
                        action: 'stripe.webhook.payment_intent_failed_handler_failed',
                        category: 'payment',
                        message: 'Internal failure while processing payment_intent.payment_failed',
                        req,
                        error,
                        metadata: {
                            paymentIntentId: failedPayment && failedPayment.id,
                            orderNumber: failedPayment && failedPayment.metadata && failedPayment.metadata.orderNumber,
                            bookingNumber: failedPayment && failedPayment.metadata && failedPayment.metadata.bookingNumber,
                        },
                    }).catch(() => {});
                }
                break;

            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('✅ Checkout session completed:', session.id);
                // Handle checkout session completion if using Stripe Checkout
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return a 200 response to acknowledge receipt of the event.
        // Stripe needs a fast 2xx so it doesn't retry; internal failures are
        // recorded via audit logs above, not surfaced as HTTP errors.
        if (!res.headersSent) {
            res.status(200).json({ received: true });
        }
    },

};
module.exports = paymentsController