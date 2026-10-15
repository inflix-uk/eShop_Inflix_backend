#!/usr/bin/env node
/**
 * Find Stripe payments that succeeded with no order behind them
 * (metadata.orderNumber = "pending") and create the missing orders.
 *
 * These came from the product-page Apple Pay / Google Pay button, which used
 * to charge customers without creating an order.
 *
 * Usage (run against the store's own MONGO_URI — Stripe keys are read from
 * that store's Stripe settings):
 *   node src/scripts/backfill-unattributed-orders.js            # dry run, lists only
 *   node src/scripts/backfill-unattributed-orders.js --apply    # create the orders
 *   node src/scripts/backfill-unattributed-orders.js --pi pi_123 [--apply]
 *
 * Backfilled orders are inserted as Pending with the Stripe payment attached.
 * No confirmation emails are sent and stock is not reduced — these customers
 * already paid (and may already have been shipped to) weeks ago.
 * Fully refunded payments are skipped.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const piIndex = args.indexOf('--pi');
const ONLY_PI = piIndex !== -1 ? args[piIndex + 1] : null;

function money(n) {
    return Math.round(Number(n) * 100) / 100;
}

/**
 * Old PaymentIntents only carry a human-readable product summary such as
 * "Luxury Bamboo Car Air Freshener – Vent Clip - single x1". Match it back to
 * a catalogue product by the longest product name it starts with.
 */
async function cartFromProductSummary(meta, Product) {
    const summary = String(meta.products || '').trim();
    const productCount = Number(meta.productCount) || 0;
    const match = summary.match(/^(.*) x(\d+)$/);
    if (productCount !== 1 || !match) {
        return { cart: null, reason: `cannot parse product summary "${summary}" (productCount ${productCount})` };
    }

    const label = match[1].trim();
    const qty = Number(match[2]) || 1;
    const salePrice = money((Number(meta.subtotal) || 0) / qty);

    const products = await Product.find({}).select('_id name variantValues Gallery_Images').lean();
    const product = products
        .filter((p) => p.name && label.startsWith(p.name.trim()))
        .sort((a, b) => b.name.length - a.name.length)[0];

    if (!product) {
        return {
            cart: [{ _id: '', productId: '', productName: label, name: label, salePrice, qty, variantImages: [] }],
            reason: `no catalogue product matches "${label}" — added by name only`,
        };
    }

    const variantLabel = label.slice(product.name.trim().length).replace(/^\s*-\s*/, '').trim().toLowerCase();
    const variants = product.variantValues || [];
    const variant =
        variants.find((v) => String(v.name || '').trim().toLowerCase() === variantLabel) ||
        (variants.length === 1 ? variants[0] : null);

    return {
        cart: [{
            _id: String(variant?._id || product._id),
            productId: String(product._id),
            productName: product.name,
            name: variant?.name || product.name,
            salePrice,
            qty,
            variantImages: variant?.variantImages || product.Gallery_Images || [],
        }],
        reason: variant ? null : `variant "${variantLabel}" not matched — product matched only`,
    };
}

async function listCandidates(stripe) {
    if (ONLY_PI) {
        return [await stripe.paymentIntents.retrieve(ONLY_PI, { expand: ['latest_charge'] })];
    }
    const found = [];
    let page;
    do {
        const result = await stripe.paymentIntents.search({
            query: "status:'succeeded' AND metadata['orderNumber']:'pending'",
            limit: 100,
            expand: ['data.latest_charge'],
            ...(page ? { page } : {}),
        });
        found.push(...result.data);
        page = result.has_more ? result.next_page : null;
    } while (page);
    return found;
}

async function main() {
    await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL, {
        serverSelectionTimeoutMS: 20000,
    });
    const Order = require('../models/order');
    const Product = require('../models/product');
    const { getStripeInstance } = require('../services/stripe/stripeClient');
    const { generateOrderNumber } = require('../services/orderService/createOrder');
    const {
        decodeCartMetadata,
        buildCartFromLines,
        buildShippingInformation,
    } = require('../services/orderService/recoverOrderFromPaymentIntent');
    const { buildServerPaymentDetails } = require('../services/pricing/verifyPaymentForOrder');

    const stripe = await getStripeInstance();
    const candidates = await listCandidates(stripe);
    console.log(`${candidates.length} succeeded payment(s) with orderNumber "pending"${APPLY ? '' : '  (dry run — pass --apply to create orders)'}\n`);

    const counts = { created: 0, exists: 0, refunded: 0, wouldCreate: 0 };

    for (const pi of candidates) {
        const meta = pi.metadata || {};
        const paidAt = new Date(pi.created * 1000);
        const head = `${pi.id}  ${paidAt.toISOString().slice(0, 10)}  £${(pi.amount / 100).toFixed(2)}  ${meta.customerName || ''} <${meta.customerEmail || pi.receipt_email || ''}>`;

        const existing = await Order.findOne({ 'paymentDetails.paymentIntentId': pi.id }).select('orderNumber status').lean();
        if (existing && existing.status !== 'Failed') {
            counts.exists++;
            console.log(`= ${head}\n    already has order ${existing.orderNumber} (${existing.status})`);
            continue;
        }

        const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
        if (charge && charge.amount_refunded >= charge.amount) {
            counts.refunded++;
            console.log(`- ${head}\n    fully refunded — skipped`);
            continue;
        }

        const lines = decodeCartMetadata(meta.cartItems);
        const { cart, reason } = lines.length > 0
            ? { cart: await buildCartFromLines(lines), reason: null }
            : await cartFromProductSummary(meta, Product);

        if (!cart) {
            console.log(`! ${head}\n    ${reason} — create this order by hand`);
            continue;
        }

        const itemText = cart.map((c) => `${c.qty}× ${c.name || c.productName} @ £${c.salePrice}`).join(', ');
        if (!APPLY) {
            counts.wouldCreate++;
            console.log(`+ ${head}\n    would create: ${itemText}${reason ? `\n    note: ${reason}` : ''}`);
            continue;
        }

        const orderNumber = await generateOrderNumber();
        const shippingCost = Number(meta.shippingCost) || 0;
        await Order.create({
            orderNumber,
            cart,
            shippingDetails: buildShippingInformation(pi),
            contactDetails: {
                email: meta.customerEmail || pi.receipt_email || '',
                userId: meta.customerId || 'express_checkout',
            },
            paymentDetails: { ...buildServerPaymentDetails(pi), paidAt },
            totalOrderValue: money(pi.amount / 100 - shippingCost),
            shippingMethod: meta.shippingMethodId
                ? {
                    name: meta.shippingMethodName || '',
                    price: shippingCost,
                    estimatedDays: meta.shippingMethodEstimatedDays || '',
                    methodId: meta.shippingMethodId,
                }
                : undefined,
            status: 'Pending',
            createdAt: paidAt,
            updatedAt: new Date(),
        });
        counts.created++;
        console.log(`✓ ${head}\n    created order ${orderNumber}: ${itemText}${reason ? `\n    note: ${reason}` : ''}`);
    }

    console.log(`\nDone. created=${counts.created} wouldCreate=${counts.wouldCreate} alreadyExisted=${counts.exists} refundedSkipped=${counts.refunded}`);
    await mongoose.disconnect();
}

main().catch(async (e) => {
    console.error('failed:', e.message);
    try { await mongoose.disconnect(); } catch { /* ignore */ }
    process.exit(1);
});
