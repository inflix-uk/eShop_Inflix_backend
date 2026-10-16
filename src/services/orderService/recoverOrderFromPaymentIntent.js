/**
 * Safety net for PaymentIntents that succeed without an order behind them
 * (metadata.orderNumber missing or "pending").
 *
 * The product-page Apple Pay / Google Pay button used to charge customers
 * without ever creating an order, so the money landed in Stripe and nothing
 * reached the admin panel. Every PaymentIntent now carries a compact copy of
 * its cart in metadata.cartItems, which lets the webhook rebuild the order
 * through the normal createOrderService path (payment verified against
 * Stripe, stock reduced, confirmation emails sent).
 */

const Order = require('../../models/order');
const Product = require('../../models/product');
const createOrderService = require('./createOrder');

// Stripe metadata values are capped at 500 characters.
const METADATA_VALUE_LIMIT = 500;

function isUnassignedOrderNumber(orderNumber) {
    const value = String(orderNumber || '').trim();
    return !value || value.toLowerCase() === 'pending';
}

/**
 * Encode chargeable cart lines as [{p, v, q, s}] — productId, variantId,
 * qty, unit salePrice. Returns '' when the cart does not fit in one
 * metadata value, so callers can store it unconditionally.
 */
function encodeCartMetadata(cartproducts) {
    const lines = (cartproducts || [])
        .filter((item) => item && !item.isTradeIn && item.productId !== 'trade-in')
        .map((item) => ({
            p: String(item.productId || ''),
            v: String(item._id || item.variantId || ''),
            q: Number(item.qty) || 1,
            s: Number(item.salePrice ?? item.Price) || 0,
        }));
    if (lines.length === 0) return '';
    const encoded = JSON.stringify(lines);
    return encoded.length <= METADATA_VALUE_LIMIT ? encoded : '';
}

function decodeCartMetadata(value) {
    if (!value) return [];
    try {
        const lines = JSON.parse(value);
        return Array.isArray(lines) ? lines.filter((l) => l && l.p && l.q > 0) : [];
    } catch {
        return [];
    }
}

async function buildCartFromLines(lines) {
    const productIds = [...new Set(lines.map((l) => l.p))];
    const products = await Product.find({ _id: { $in: productIds } })
        .select('_id name variantValues Gallery_Images')
        .lean();
    const byId = new Map(products.map((p) => [String(p._id), p]));

    return lines.map((line) => {
        const product = byId.get(String(line.p));
        const variant = (product?.variantValues || []).find(
            (v) => String(v._id) === String(line.v)
        );
        return {
            _id: line.v || line.p,
            productId: line.p,
            productName: product?.name || '',
            name: variant?.name || product?.name || '',
            salePrice: line.s,
            qty: line.q,
            variantImages: variant?.variantImages || product?.Gallery_Images || [],
        };
    });
}

function buildShippingInformation(paymentIntent) {
    const meta = paymentIntent.metadata || {};
    const shipping = paymentIntent.shipping || {};
    const address = shipping.address || {};
    const nameParts = String(shipping.name || meta.customerName || '').trim().split(/\s+/);

    return {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' '),
        companyName: '',
        address: address.line1 || meta.shippingAddress || '',
        apartment: address.line2 || '',
        city: address.city || meta.shippingCity || '',
        county: address.state || '',
        postalCode: address.postal_code || meta.shippingPostalCode || '',
        country: address.country || 'United Kingdom',
        phoneNumber: shipping.phone || meta.customerPhone || '',
    };
}

/**
 * Create the missing order for a succeeded PaymentIntent.
 *
 * @returns {Promise<{ recovered: boolean, orderNumber?: string, alreadyExists?: boolean, reason?: string, code?: string }>}
 */
async function recoverOrderFromPaymentIntent(paymentIntent) {
    const existing = await Order.findOne({
        'paymentDetails.paymentIntentId': paymentIntent.id,
        status: { $ne: 'Failed' },
    }).select('orderNumber').lean();
    if (existing) {
        return { recovered: false, alreadyExists: true, orderNumber: existing.orderNumber };
    }

    const meta = paymentIntent.metadata || {};
    const lines = decodeCartMetadata(meta.cartItems);
    if (lines.length === 0) {
        return { recovered: false, reason: 'PaymentIntent metadata has no cartItems to rebuild the order from' };
    }

    const cart = await buildCartFromLines(lines);
    const email = meta.customerEmail || paymentIntent.receipt_email || '';

    const result = await createOrderService({
        cart,
        shippingInformation: buildShippingInformation(paymentIntent),
        contactInformation: { email, userId: meta.customerId || 'express_checkout' },
        coupon: meta.couponCode ? { code: meta.couponCode } : null,
        shippingMethod: meta.shippingMethodId ? { methodId: meta.shippingMethodId } : null,
        status: 'Pending',
        paymentDetails: { paymentIntentId: paymentIntent.id },
    });

    if (!result.success) {
        return { recovered: false, reason: result.message || 'createOrderService refused the order', code: result.code };
    }
    return { recovered: true, orderNumber: result.orderNumber };
}

module.exports = {
    isUnassignedOrderNumber,
    encodeCartMetadata,
    decodeCartMetadata,
    buildCartFromLines,
    buildShippingInformation,
    recoverOrderFromPaymentIntent,
};
