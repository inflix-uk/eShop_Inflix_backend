// controller/paymentsController.js
const db = require("../../connections/mongo");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Order = require("../models/order");
const StripeSettings = require("../models/stripeSettings");
const CheckoutLog = require("../models/checkoutLog");

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
const crypto = require("crypto");
const dotenv = require("dotenv");
const router = require("../routes");
dotenv.config({ path: "./.env" });

// Initialize stripe with env variable as fallback (will be overridden dynamically)
let stripeInstance = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Helper function to get Stripe instance with DB keys (with fallback to env vars)
const getStripeInstance = async () => {
    try {
        const keys = await StripeSettings.getActiveKeys();
        if (keys.secretKey) {
            return require("stripe")(keys.secretKey);
        }
    } catch (error) {
        console.error('Error getting Stripe keys from DB, using env fallback:', error.message);
    }
    return stripeInstance;
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
            const { event, paymentIntentId, orderNumber, paymentMethodType, data } = req.body || {};
            if (!event) {
                return res.status(200).json({ ok: false, reason: 'missing event' });
            }
            writeLog({
                event: String(event).substring(0, 120),
                source: 'frontend',
                paymentIntentId: paymentIntentId || undefined,
                orderNumber: orderNumber || undefined,
                paymentMethodType: paymentMethodType || undefined,
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
            // Get keys from DB with fallback to env vars
            const STRIPE_PUBLISHABLE_KEY = await getPublishableKey();
            const keys = await StripeSettings.getActiveKeys();
            const STRIPE_SECRET_KEY = keys.secretKey;

            // Extract account IDs from keys for comparison (17 chars after prefix)
            const pkAccountId = STRIPE_PUBLISHABLE_KEY ? STRIPE_PUBLISHABLE_KEY.substring(8, 25) : 'NOT SET';
            const skAccountId = STRIPE_SECRET_KEY ? STRIPE_SECRET_KEY.substring(8, 25) : 'NOT SET';
            const keysMatch = pkAccountId === skAccountId;

            console.log('╔════════════════════════════════════════════════════╗');
            console.log('║              Stripe Key Verification               ║');
            console.log('╠════════════════════════════════════════════════════╣');
            console.log(`║  Source: ${keys.isFromDatabase ? 'Database' : 'Environment'}`.padEnd(54) + '║');
            console.log(`║  PK Account ID: ${pkAccountId}`.padEnd(54) + '║');
            console.log(`║  SK Account ID: ${skAccountId}`.padEnd(54) + '║');
            console.log(`║  Keys Match: ${keysMatch ? '✅ YES' : '❌ NO'}`.padEnd(54) + '║');
            console.log('╚════════════════════════════════════════════════════╝');

            if (!STRIPE_PUBLISHABLE_KEY) {
                console.error('STRIPE_PUBLISHABLE_KEY is not set');
                return res.status(500).json({ error: 'Stripe configuration missing' });
            }

            res.send({
              publishableKey: STRIPE_PUBLISHABLE_KEY,
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

            // Calculate the Total Price Before Discount (excluding trade-ins) - SERVER-SIDE CALCULATION
            let totalSalePrice = chargeableProducts.reduce((sum, product) => sum + (product.salePrice * product.qty), 0);

            // Calculate the Total Discount Based on Coupon
            let totalDiscount = 0;
            if (coupondata) {
                if (coupondata.discount_type === "flat") {
                    totalDiscount = coupondata.discount;
                } else if (coupondata.discount_type === "percentage") {
                    const discountAmount = (totalSalePrice * coupondata.discount) / 100;
                    totalDiscount = coupondata.upto ? Math.min(discountAmount, coupondata.upto) : discountAmount;
                }
            }

            // Get shipping cost (default to 0 if not provided)
            const shippingCost = shippingMethod?.price || 0;

            // Adjust the Total Price After Applying Discount + Shipping
            const adjustedTotalPrice = Math.max(0, totalSalePrice - totalDiscount);
            const finalTotal = adjustedTotalPrice + shippingCost;
            const totalAmount = Math.round(finalTotal * 100); // Convert to pence

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

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            console.log('📝 Updating PaymentIntent metadata:', paymentIntentId, 'with orderNumber:', orderNumber);

            // Get the existing PaymentIntent to preserve existing metadata and amount
            const existingIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
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
            const { paymentIntentId, cartproducts, coupondata, shippingMethod } = req.body;

            if (!paymentIntentId) {
                return res.status(400).json({ error: 'paymentIntentId is required' });
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            console.log('💰 Updating PaymentIntent amount:', paymentIntentId);

            // Filter out trade-in products
            const chargeableProducts = (cartproducts || []).filter(product => !product.isTradeIn);

            // Calculate product total
            let totalSalePrice = chargeableProducts.reduce((sum, product) => sum + (product.salePrice * product.qty), 0);

            // Apply coupon discount
            let totalDiscount = 0;
            if (coupondata) {
                if (coupondata.discount_type === "flat") {
                    totalDiscount = coupondata.discount;
                } else if (coupondata.discount_type === "percentage") {
                    const discountAmount = (totalSalePrice * coupondata.discount) / 100;
                    totalDiscount = coupondata.upto ? Math.min(discountAmount, coupondata.upto) : discountAmount;
                }
            }

            // Get shipping cost
            const shippingCost = shippingMethod?.price || 0;

            // Calculate final total
            const adjustedTotalPrice = Math.max(0, totalSalePrice - totalDiscount);
            const finalTotal = adjustedTotalPrice + shippingCost;
            const totalAmount = Math.round(finalTotal * 100); // Convert to pence

            console.log(`New amount: ${totalAmount} pence (£${finalTotal}) - Products: £${adjustedTotalPrice}, Shipping: £${shippingCost}`);

            if (totalAmount <= 0) {
                return res.status(400).json({ error: 'Invalid amount calculated' });
            }

            // Update PaymentIntent amount and metadata
            const paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
                amount: totalAmount,
                metadata: {
                    shippingMethodName: shippingMethod?.name || '',
                    shippingMethodPrice: String(shippingCost),
                    shippingMethodEstimatedDays: shippingMethod?.estimatedDays || '',
                    shippingMethodId: shippingMethod?.methodId || '',
                    shippingCost: String(shippingCost.toFixed(2)),
                    finalTotal: String(finalTotal.toFixed(2)),
                }
            });

            console.log('✅ PaymentIntent amount updated:', paymentIntent.id, '- New amount:', totalAmount);

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
            const { paymentIntentId } = req.body;
            console.log("Retrieving payment details for:", paymentIntentId);

            if (!paymentIntentId) {
                throw new Error("Payment intent ID is required");
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
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

                    if (paymentMethod.card) {
                        cardDetails = {
                            brand: paymentMethod.card.brand,
                            country: paymentMethod.card.country,
                            exp_month: paymentMethod.card.exp_month,
                            exp_year: paymentMethod.card.exp_year,
                            last4: paymentMethod.card.last4,
                        };
                        paymentType = "Card";
                    } else if (paymentMethod.link) {
                        paymentType = "Link";
                        cardDetails = { payment_type: "Link" };
                    } else if (paymentMethod.paypal) {
                        paymentType = "PayPal";
                        cardDetails = { payment_type: "PayPal", paypal_details: paymentMethod.paypal };
                    } else if (paymentMethod.klarna) {
                        paymentType = "Klarna";
                        cardDetails = { payment_type: "Klarna", klarna_details: paymentMethod.klarna };
                    }
                } catch (pmError) {
                    console.log("Could not retrieve payment method, checking charge...");
                }
            }

            // Fallback to charge details if payment method not available
            if (!cardDetails && paymentIntent.latest_charge) {
                try {
                    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
                    if (charge.payment_method_details) {
                        const pmDetails = charge.payment_method_details;
                        if (pmDetails.card) {
                            cardDetails = {
                                brand: pmDetails.card.brand,
                                country: pmDetails.card.country,
                                exp_month: pmDetails.card.exp_month,
                                exp_year: pmDetails.card.exp_year,
                                last4: pmDetails.card.last4,
                            };
                            paymentType = "Card";
                        } else if (pmDetails.link) {
                            paymentType = "Link";
                            cardDetails = { payment_type: "Link" };
                        } else if (pmDetails.paypal) {
                            paymentType = "PayPal";
                            cardDetails = { payment_type: "PayPal" };
                        } else if (pmDetails.klarna) {
                            paymentType = "Klarna";
                            cardDetails = { payment_type: "Klarna" };
                        }
                    }
                } catch (chargeError) {
                    console.log("Could not retrieve charge details");
                }
            }

            res.json({
                paymentIntentId: paymentIntent.id,
                paymentMethodId: paymentIntent.payment_method || null,
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                paymentType,
                cardDetails: cardDetails || { payment_type: paymentType },
            });
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
            const { sessionId } = req.body;
            // console.log("Request Body:", req.body);

            if (!sessionId) {
                throw new Error("Session ID is required");
            }

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            // Retrieve session details
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            // console.log("Retrieve Checkout session details:", session);
    
            if (!session || !session.payment_intent) {
                throw new Error("No payment intent associated with this session");
            }
    
            // Retrieve payment intent
            const paymentIntentId = session.payment_intent;   
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
            if (paymentIntent.status !== 'succeeded') {  
                throw new Error(`Payment not completed. Current status: ${paymentIntent.status}`); 
            }
    
            // Attempt to retrieve card details if present
            let cardDetails;
            if (paymentIntent.payment_method) {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                cardDetails = paymentMethod.card || paymentMethod.klarna|| paymentMethod.paypal;
            } else if (paymentIntent.latest_charge) {
                const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
                cardDetails = charge.payment_method_details.card || charge.payment_method_details.klarna;
            } else {
                throw new Error("No payment method or charges associated with this payment intent");
            }   
    
            console.log("cardDetails: ".cardDetails)
            // Check if cardDetails has card information or Klarna details
            res.json({
                paymentIntentId: paymentIntent.id,
                paymentMethodId: paymentIntent.payment_method || paymentIntent.latest_charge,
                cardDetails: cardDetails ? {
                    brand: cardDetails.brand || "N/A",
                    country: cardDetails.country || "N/A",
                    exp_month: cardDetails.exp_month || "N/A",
                    exp_year: cardDetails.exp_year || "N/A",
                    last4: cardDetails.last4 || "N/A",
                    payment_type: cardDetails.klarna ? "Klarna" : "Card"
                } : {
                    payment_type: "Klarna",
                    klarna_details: cardDetails.klarna || "N/A",
                     paypal_details: cardDetails.paypal || "N/A"
                }
            });
    
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
            // const { cartproducts, paymentIntentId, coupondata, shippingInformation, contactInformation } = req.body;
            const { cartproducts, paymentIntentId, coupondata, shippingInformation } = req.body;
            const contactInformation = req.body.contactInformation || { email: "", userId: "" }; // provide default values

            // Get dynamic Stripe instance
            const stripe = await getStripeInstance();

            console.log("Received order details:", req.body);

            // Step 1: Filter out trade-in products (they are credits, not charges)
            const chargeableProducts = cartproducts.filter(product => !product.isTradeIn);

            // Step 2: Calculate the Total Price Before Discount (excluding trade-ins)
            let totalSalePrice = chargeableProducts.reduce((sum, product) => sum + (product.salePrice * product.qty), 0);

            // Step 3: Calculate the Total Discount Based on Coupon
            let totalDiscount = 0;
            if (coupondata) {
                if (coupondata.discount_type === "flat") {
                    totalDiscount = coupondata.discount;
                } else if (coupondata.discount_type === "percentage") {
                    const discountAmount = (totalSalePrice * coupondata.discount) / 100;
                    totalDiscount = coupondata.upto ? Math.min(discountAmount, coupondata.upto) : discountAmount;
                }
            }
    
            // Step 4: Adjust the Total Price After Applying Discount
            const adjustedTotalPrice = Math.max(0, totalSalePrice - totalDiscount);
            console.log("Adjusted Total Price after discount:", adjustedTotalPrice);

            // Step 5: Distribute the Discount Proportionally Across Products for Accurate Line Item Pricing
            const discountProportion = totalDiscount / totalSalePrice;
    
            // Step 6: Create Line Items with Discounted Price for Each Product (excluding trade-ins)
            const lineItems = chargeableProducts.map((product) => {
                // Calculate the discounted sale price for each product
                let discountedSalePrice = product.salePrice - (product.salePrice * discountProportion);
                discountedSalePrice = Math.max(0, discountedSalePrice);

                // Get the product image URL if available
                const imageUrl = product.variantImages && product.variantImages.length > 0 && product.variantImages[0].path
                    ? `${process.env.FRONTEND_URL}/${encodeURIComponent(product.variantImages[0].path)}`
                    : null;

                return {
                    price_data: {
                        currency: "GBP",
                        product_data: {
                            name: `${product.productName} - ${product.name.replace(/\s*\(#[\d\w]+\)/, '')}`,
                            images: imageUrl ? [imageUrl] : [],
                        },
                        unit_amount: Math.round(discountedSalePrice * 100), // Amount in pence (pence/cents)
                    },
                    quantity: product.qty,
                };
            });

            // Step 7: Calculate the Total Amount in Pence
            const totalAmount = Math.round(adjustedTotalPrice * 100);

            // Step 8: Create or Retrieve the Stripe Customer
            const customer = await stripe.customers.create({
                email: contactInformation.email || "",
                metadata: {
                    userId: contactInformation.userId || "",
                    firstName: shippingInformation.firstName || "",
                    lastName: shippingInformation.lastName || "",
                    address: shippingInformation.address || "",
                    apartment: shippingInformation.apartment || "",
                    country: shippingInformation.country || "United Kingdom",
                    city: shippingInformation.city || "",
                    county: shippingInformation.county || "",
                    postalCode: shippingInformation.postalCode || "",
                    phoneNumber: shippingInformation.phoneNumber || ""
                }
            });
    
            let paymentIntent;
            if (paymentIntentId) {
                // Update Existing PaymentIntent if Available
                paymentIntent = await stripe.paymentIntents.update(paymentIntentId, {
                    amount: totalAmount,
                });
            } else {
                // Create a New PaymentIntent if Not Exists
                paymentIntent = await stripe.paymentIntents.create({
                    customer: customer.id,
                    setup_future_usage: "off_session",
                    amount: totalAmount,
                    currency: "gbp",
                    automatic_payment_methods: { enabled: true },
                });
            }

            // Step 9: Create a Checkout Session in Stripe
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'klarna', 'paypal'],
                line_items: lineItems,
                mode: "payment",
                success_url: `${process.env.FRONTEND_URL}/checkout?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/checkout?payment_cancel=true`,
                client_reference_id: paymentIntent.id,
                customer: customer.id,
                metadata: {
                    // Optionally add order_id if needed
                    // order_id: orderNumber, 
                    email: contactInformation.email,
                    phoneNumber: shippingInformation.phoneNumber
                }
            });
    
            // console.log("Stripe session created:", session);

            // Step 10: Send Session Details and Client Secret Back to the Frontend
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
                if(error) {
                    console.log(error);
                    throw error;
                } else {
                    console.log(payment);

                    let data = payment
                    res.json(data);
                }

        })
        } catch (error) {
            console.error("Error in createPayPalPayment: ", error.message);
            res.status(500).json({ error: error.message });
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
                    console.error("PayPal Payment Execution Error: ", error.response);
                    res.status(500).json({ error: error.response });
                } else {
                    res.json({ status: 'success', payment });
                }
            });
        } catch (error) {
            console.error("Error in executePayPalPayment: ", error.message);
            res.status(500).json({ error: error.message });
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
                if (error) {
                    console.error("Error creating PayPal payment:", error);
                    throw error;
                } else {
                    console.log("PayPal Payment created successfully:", payment);
                    res.json(payment); // Send the PayPal payment object back to the frontend
                }
            });
        } catch (error) {
            console.error("Error in verifyPaymentPaypal:", error);
            res.status(500).send("Error processing PayPal payment");
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

        // Get dynamic Stripe instance and webhook secret
        const stripe = await getStripeInstance();
        const keys = await StripeSettings.getActiveKeys();
        const webhookSecret = keys.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            // Verify webhook signature
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
            console.log('✅ Webhook signature verified');
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

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

                    // Find and update the order by paymentIntentId stored in metadata or by matching
                    const orderNumber = paymentIntent.metadata?.orderNumber;

                    writeLog({
                        event: 'backend.webhook.payment_intent.succeeded',
                        source: 'backend',
                        paymentIntentId: paymentIntent.id,
                        orderNumber: orderNumber || undefined,
                        paymentMethodType: paymentType,
                        data: {
                            metadataOrderNumberRaw: paymentIntent.metadata?.orderNumber,
                            metadataKeys: Object.keys(paymentIntent.metadata || {}),
                            amount: paymentIntent.amount / 100,
                            currency: paymentIntent.currency,
                            isExpressCheckout: paymentIntent.metadata?.isExpressCheckout,
                        },
                    });

                    if (orderNumber) {
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
                }
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('❌ PaymentIntent failed:', failedPayment.id);

                try {
                    const orderNumber = failedPayment.metadata?.orderNumber;

                    if (orderNumber) {
                        await Order.findOneAndUpdate(
                            { orderNumber: orderNumber },
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
                        console.log('✅ Order marked as failed:', orderNumber);
                    }
                } catch (error) {
                    console.error('❌ Error processing payment_intent.payment_failed:', error);
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

        // Return a 200 response to acknowledge receipt of the event
        res.status(200).json({ received: true });
    },

};
module.exports = paymentsController