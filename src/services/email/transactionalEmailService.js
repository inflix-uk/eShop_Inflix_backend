'use strict';

/**
 * Sends the customisable transactional order emails. Every public `notify*` function:
 *  - never throws (errors are logged), so an email problem can never break an order/API action;
 *  - dedupes per order via `order.emailNotifications.<kind>` so repeated saves do not resend.
 */

const Order = require('../../models/order');
const OrderEmailTemplateSettings = require('../../models/orderEmailTemplateSettings');
const {
  sendMail,
  getOrderNotifyRecipientEmail,
  resolveEffectiveConfig,
} = require('../../utils/mailer');
const { getEmailBranding, storefrontOriginForEmail } = require('../../utils/emailBranding');
const {
  TRANSACTIONAL_EMAIL_TYPES,
  TRANSACTIONAL_TYPE_KEYS,
} = require('../../config/transactionalEmailDefaults');
const { buildEmailContext, renderTransactionalEmail } = require('../../utils/transactionalEmailRender');
const { buildOrderShippedEmail } = require('./orderShippedEmailService');

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isYes(v) {
  return String(v == null ? '' : v).trim().toLowerCase() !== 'no';
}

function mergeFields(defaults, saved) {
  const out = { ...defaults };
  if (!saved || typeof saved !== 'object') return out;
  for (const key of Object.keys(defaults)) {
    if (Object.prototype.hasOwnProperty.call(saved, key) && saved[key] != null) {
      const s = String(saved[key]);
      if (s.trim() !== '') out[key] = s;
    }
  }
  return out;
}

async function getTransactionalResolved(type) {
  const def = TRANSACTIONAL_EMAIL_TYPES[type];
  if (!def) throw new Error(`Unknown transactional email type: ${type}`);
  let saved = null;
  try {
    const doc = await OrderEmailTemplateSettings.getSettings();
    saved = doc.transactional && typeof doc.transactional === 'object' ? doc.transactional[type] : null;
  } catch (e) {
    console.error(`[email] could not load ${type} template copy, using defaults:`, e.message);
  }
  return mergeFields(def.defaults, saved);
}

async function getAllTransactionalResolved() {
  const out = {};
  for (const k of TRANSACTIONAL_TYPE_KEYS) out[k] = await getTransactionalResolved(k);
  return out;
}

/** Admin / business inbox: SMTP "order notify email" → ORDER_NOTIFY_EMAIL env → SMTP From address. */
async function getAdminRecipient() {
  const notify = await getOrderNotifyRecipientEmail().catch(() => '');
  if (notify) return notify;
  try {
    const { fromEmail } = await resolveEffectiveConfig();
    if (fromEmail && SIMPLE_EMAIL_RE.test(fromEmail)) return fromEmail;
  } catch {
    /* ignore */
  }
  return '';
}

function customerEmailFor(order, fallback) {
  const candidates = [order?.contactDetails?.email, order?.shippingDetails?.email, fallback];
  for (const c of candidates) {
    const s = String(c || '').trim();
    if (SIMPLE_EMAIL_RE.test(s)) return s;
  }
  return '';
}

async function safeSend(mail, label) {
  if (!mail.to) {
    console.warn(`[email] ${label}: no recipient, skipped`);
    return false;
  }
  try {
    const info = await sendMail(mail);
    console.log(`[email] ${label} sent to ${mail.to}:`, info?.response || info?.messageId || 'ok');
    return true;
  } catch (e) {
    console.error(`[email] ${label} FAILED to ${mail.to}:`, e?.message || e);
    return false;
  }
}

/**
 * Atomically mark `emailNotifications.<kind>` = key. Returns false if it already had that key
 * (already sent) — prevents duplicates on repeated saves / double clicks.
 */
async function claim(orderId, kind, key) {
  if (!orderId) return true;
  try {
    const res = await Order.updateOne(
      { _id: orderId, [`emailNotifications.${kind}.key`]: { $ne: key } },
      { $set: { [`emailNotifications.${kind}`]: { key, at: new Date() } } }
    );
    return (res.modifiedCount ?? res.nModified ?? 0) > 0;
  } catch (e) {
    console.error(`[email] claim ${kind} failed (sending anyway):`, e.message);
    return true;
  }
}

async function release(orderId, kind, key) {
  if (!orderId) return;
  try {
    await Order.updateOne(
      { _id: orderId, [`emailNotifications.${kind}.key`]: key },
      { $unset: { [`emailNotifications.${kind}`]: '' } }
    );
  } catch {
    /* ignore */
  }
}

async function renderFor(type, order, extra, audience, fieldsOverride) {
  const fields = fieldsOverride || (await getTransactionalResolved(type));
  const branding = await getEmailBranding().catch(() => ({}));
  const ctx = buildEmailContext(order, extra);
  const { subject, html } = renderTransactionalEmail(type, {
    fields,
    ctx,
    branding,
    audience,
    storefrontUrl: storefrontOriginForEmail(),
  });
  return { subject, html, fields };
}

/**
 * Send one template to customer and/or admin. Returns { customer, admin } booleans.
 */
async function sendTemplate(type, order, { extra = {}, toCustomer = true, toAdmin = false, customerFallbackEmail } = {}) {
  const result = { customer: false, admin: false };
  const fields = await getTransactionalResolved(type);
  const label = `${type} (order ${order?.orderNumber || '?'})`;

  if (toCustomer && isYes(fields.enabled)) {
    try {
      const { subject, html } = await renderFor(type, order, extra, 'customer', fields);
      result.customer = await safeSend({ to: customerEmailFor(order, customerFallbackEmail), subject, html }, `${label} → customer`);
    } catch (e) {
      console.error(`[email] ${label} customer render failed:`, e);
    }
  }
  if (toAdmin && Object.prototype.hasOwnProperty.call(fields, 'adminEnabled') && isYes(fields.adminEnabled)) {
    try {
      const { subject, html } = await renderFor(type, order, extra, 'admin', fields);
      result.admin = await safeSend({ to: await getAdminRecipient(), subject, html }, `${label} → admin`);
    } catch (e) {
      console.error(`[email] ${label} admin render failed:`, e);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public triggers
// ---------------------------------------------------------------------------

/** Shipped: once per courier + tracking number (changing tracking re-sends with the new link). */
async function notifyOrderShipped(order) {
  try {
    if (!order || order.status !== 'Shipped') return false;
    const sd = order.shippingDetails || {};
    const key = `${String(sd.provider || '').trim()}|${String(sd.trackingNumber || '').trim()}|${String(sd.trackingUrl || '').trim()}`;
    if (!(await claim(order._id, 'shipped', key))) {
      console.log(`[email] shipped email for ${order.orderNumber} already sent for ${key}, skipped`);
      return false;
    }
    const to = customerEmailFor(order);
    let ok = false;
    try {
      const { html, subject } = await buildOrderShippedEmail(order);
      ok = await safeSend({ to, subject, html }, `orderShipped (order ${order.orderNumber}) → customer`);
    } catch (e) {
      console.error(`[email] shipped email build failed for ${order.orderNumber}:`, e);
    }
    if (!ok) await release(order._id, 'shipped', key);
    return ok;
  } catch (e) {
    console.error('[email] notifyOrderShipped error:', e);
    return false;
  }
}

async function notifyOrderDelivered(order) {
  try {
    if (!order || order.status !== 'Delivered') return false;
    if (!(await claim(order._id, 'delivered', 'delivered'))) return false;
    const r = await sendTemplate('orderDelivered', order, {});
    if (!r.customer) await release(order._id, 'delivered', 'delivered');
    return r.customer;
  } catch (e) {
    console.error('[email] notifyOrderDelivered error:', e);
    return false;
  }
}

/** Customer receipt + seller invoice at checkout (once per order). */
async function notifyPurchaseReceipt(order, { includeAdmin = true } = {}) {
  try {
    if (!order) return { customer: false, admin: false };
    if (!(await claim(order._id, 'receipt', String(order.orderNumber || 'receipt')))) {
      return { customer: false, admin: false };
    }
    return await sendTemplate('purchaseReceipt', order, { toCustomer: true, toAdmin: includeAdmin });
  } catch (e) {
    console.error('[email] notifyPurchaseReceipt error:', e);
    return { customer: false, admin: false };
  }
}

/** Whether checkout should send the seller invoice instead of the legacy "New order" admin email. */
async function isSellerInvoiceEnabled() {
  try {
    const f = await getTransactionalResolved('purchaseReceipt');
    return isYes(f.adminEnabled);
  } catch {
    return false;
  }
}

function detectRequestType(requestOrder) {
  const explicit = String(requestOrder?.requestType || '').toLowerCase();
  if (explicit === 'refund' || explicit === 'return') return explicit;
  const text = `${requestOrder?.reason || ''} ${requestOrder?.notes || ''}`;
  return /refund|money back/i.test(text) ? 'refund' : 'return';
}

/** Customer submitted a return / refund request → customer + admin. */
async function notifyRequestCreated(requestOrder, order, { customerEmail } = {}) {
  try {
    if (!requestOrder || !order) return null;
    const kind = detectRequestType(requestOrder);
    const type = kind === 'refund' ? 'refundRequest' : 'returnRequest';
    return await sendTemplate(type, order, {
      toCustomer: true,
      toAdmin: true,
      customerFallbackEmail: customerEmail,
      extra: {
        requestNumber: requestOrder.requestOrderNumber,
        reason: requestOrder.reason,
        notes: requestOrder.notes,
        requestType: kind === 'refund' ? 'Refund' : 'Return',
        status: requestOrder.status || 'Pending',
        submittedAt: requestOrder.createdAt || new Date(),
      },
    });
  } catch (e) {
    console.error('[email] notifyRequestCreated error:', e);
    return null;
  }
}

/**
 * Refund / return status changed → customer (and admin for refund confirmation).
 * @param {object} order
 * @param {{ status: string, requestOrder?: object, refundAmount?: number, refundType?: string, reason?: string,
 *           includeAdmin?: boolean, dedupeKey?: string, customerEmail?: string }} opts
 */
async function notifyRefundStatus(order, opts = {}) {
  const { status, requestOrder, includeAdmin = false, customerEmail } = opts;
  try {
    if (!order || !status) return null;
    const dedupeKey = opts.dedupeKey || `${requestOrder?._id || 'order'}|${status}|${opts.refundAmount ?? ''}`;
    // Separate slots: order-level refund confirmation vs request / return-order status changes.
    const slot = requestOrder ? 'requestStatus' : 'refunded';
    if (!(await claim(order._id, slot, dedupeKey))) return null;
    const r = await sendTemplate('refundStatus', order, {
      toCustomer: true,
      toAdmin: includeAdmin,
      customerFallbackEmail: customerEmail,
      extra: {
        status,
        requestNumber: requestOrder?.requestOrderNumber || requestOrder?.rma,
        requestType: requestOrder ? (detectRequestType(requestOrder) === 'refund' ? 'Refund' : 'Return') : '',
        reason: opts.reason ?? requestOrder?.reason,
        notes: requestOrder?.notes,
        refundAmount: opts.refundAmount,
        refundType: opts.refundType,
      },
    });
    if (!r.customer && !r.admin) await release(order._id, slot, dedupeKey);
    return r;
  } catch (e) {
    console.error('[email] notifyRefundStatus error:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin preview
// ---------------------------------------------------------------------------

function sampleOrder() {
  return {
    _id: null,
    orderNumber: 'Z20260001',
    createdAt: new Date(),
    status: 'Shipped',
    cart: [
      { productName: 'iPhone 15 Pro', name: 'Excellent-Natural Titanium (#8a8780)-256GB', qty: 1, salePrice: 649, SKU: 'IP15P-256-NT' },
      { productName: 'USB-C Charger 20W', name: 'USB-C Charger 20W', qty: 2, salePrice: 12.5 },
    ],
    shippingMethod: { name: 'Tracked 24', price: 4.99 },
    totalOrderValue: 678.99,
    shippingDetails: {
      firstName: 'Jane',
      lastName: 'Doe',
      phoneNumber: '+44 7700 900123',
      address: '1 High Street',
      city: 'London',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
      provider: 'DHL',
      trackingNumber: '1234567890',
    },
    contactDetails: { email: 'jane.doe@example.com' },
    paymentDetails: { paymentIntentId: 'pi_3Example123', amount: 678.99, currency: 'gbp', status: 'succeeded', paidAt: new Date() },
    refund: { refundType: 'full', refundAmount: 678.99 },
  };
}

async function renderPreview(type, fieldsInput, audience = 'customer') {
  const def = TRANSACTIONAL_EMAIL_TYPES[type];
  if (!def) throw new Error(`Unknown template type: ${type}`);
  const fields = mergeFields(def.defaults, fieldsInput || {});
  const extra = {
    requestNumber: 'RIM-001',
    reason: 'Item is defective',
    notes: 'Screen flickers after a few minutes.',
    requestType: type === 'refundRequest' ? 'Refund' : 'Return',
    status: type === 'refundStatus' ? 'Refunded' : 'Pending',
    submittedAt: new Date(),
  };
  return renderFor(type, sampleOrder(), extra, audience === 'admin' ? 'admin' : 'customer', fields);
}

module.exports = {
  getTransactionalResolved,
  getAllTransactionalResolved,
  getAdminRecipient,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyPurchaseReceipt,
  isSellerInvoiceEnabled,
  notifyRequestCreated,
  notifyRefundStatus,
  detectRequestType,
  renderPreview,
  isYes,
};
