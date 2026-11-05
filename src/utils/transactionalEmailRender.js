'use strict';

/**
 * Pure HTML renderer for the transactional order emails (receipt / seller invoice, delivered,
 * return request, refund request, refund status). No DB access — the service layer
 * (`src/services/email/transactionalEmailService.js`) loads copy + branding and sends.
 *
 * Copy comes from admin "Email templates" (see `src/config/transactionalEmailDefaults.js`);
 * order data is filled from the order document. Every value is HTML-escaped.
 */

const {
  escapeHtml,
  emailFieldPresent,
  getCartLineVariantParts,
} = require('./orderStatusEmailDynamicHtml');
const { trackingUrlForOrder } = require('./courierTracking');

const CURRENCY = '£';

function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return `${v < 0 ? '-' : ''}${CURRENCY}${Math.abs(v).toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' });
}

function str(v) {
  return v == null ? '' : String(v).trim();
}

function isTradeInItem(item) {
  return Boolean(item && (item.isTradeIn || item.productId === 'trade-in'));
}

function unitPrice(item) {
  const p = Number(item.salePrice ?? item.Price ?? item.price ?? 0);
  return Number.isFinite(p) ? p : 0;
}

/**
 * Flatten an order (+ optional request/refund info) into the values the template needs.
 * @param {object} order mongoose doc or plain object
 * @param {object} [extra] { requestNumber, reason, notes, requestStatus, requestType, status, refundAmount, refundType, storeName, submittedAt }
 */
function buildEmailContext(order, extra = {}) {
  const o = order && typeof order.toObject === 'function' ? order.toObject() : order || {};
  const sd = o.shippingDetails || {};
  const cd = o.contactDetails || {};
  const pd = o.paymentDetails || {};
  const cart = Array.isArray(o.cart) ? o.cart : [];

  const firstName = str(sd.firstName) || str(cd.firstName) || str(cd.firstname);
  const lastName = str(sd.lastName) || str(cd.lastName) || str(cd.lastname);
  const customerName = [firstName, lastName].filter(Boolean).join(' ');

  const items = cart.map((item) => {
    const qty = Number(item.qty) || 0;
    const price = unitPrice(item);
    const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
    const variant = [condition, colorName, storage, fallbackVariant].filter((x) => emailFieldPresent(x)).join(' · ');
    return {
      name: str(item.productName) || str(item.name) || 'Item',
      variant,
      sku: emailFieldPresent(item.SKU) ? str(item.SKU) : '',
      qty,
      unitPrice: price,
      lineTotal: qty * price,
      tradeIn: isTradeInItem(item),
      tradeInCondition: str(item.tradeInData?.conditionName),
    };
  });

  const saleItems = items.filter((i) => !i.tradeIn);
  const subtotal = saleItems.reduce((s, i) => s + i.lineTotal, 0);
  const shippingPrice = Number(o.shippingMethod?.price);
  const total = Number.isFinite(Number(o.totalOrderValue)) ? Number(o.totalOrderValue) : subtotal;
  const coupon = Array.isArray(o.coupon) && o.coupon.length ? o.coupon[0] : null;
  const expected = subtotal + (Number.isFinite(shippingPrice) ? shippingPrice : 0);
  const discount = coupon && expected - total > 0.005 ? expected - total : 0;

  const addressParts = [sd.address, sd.apartment, sd.city, sd.county || sd.state, sd.postalCode, sd.country]
    .map(str)
    .filter(Boolean);

  const refundAmountRaw = extra.refundAmount ?? o.refund?.refundAmount;
  const refundTypeRaw = extra.refundType ?? o.refund?.refundType;

  return {
    customerFirstName: firstName || 'Customer',
    customerName: customerName || 'Customer',
    customerEmail: str(cd.email) || str(sd.email),
    customerPhone: str(sd.phoneNumber) || str(sd.phone) || str(cd.phoneNumber),
    shippingAddress: addressParts.join(', '),
    shippingMethod: str(o.shippingMethod?.name),
    orderNumber: str(o.orderNumber),
    orderDate: formatDate(o.createdAt),
    orderStatus: str(o.status),
    items,
    subtotal,
    shippingPrice: Number.isFinite(shippingPrice) ? shippingPrice : null,
    discount,
    couponCode: coupon ? str(coupon.code) : '',
    total,
    paymentReference: str(pd.paymentIntentId),
    paymentStatus: str(pd.status),
    paymentAmount: Number.isFinite(Number(pd.amount)) ? Number(pd.amount) : null,
    paymentCurrency: str(pd.currency).toUpperCase(),
    paidAt: formatDate(pd.paidAt),
    carrier: str(sd.provider),
    trackingNumber: str(sd.trackingNumber),
    trackingUrl: trackingUrlForOrder(o),
    requestNumber: str(extra.requestNumber),
    reason: str(extra.reason ?? o.reason),
    notes: str(extra.notes),
    requestType: str(extra.requestType),
    submittedAt: formatDate(extra.submittedAt),
    status: str(extra.status) || str(o.status),
    refundAmount: refundAmountRaw != null && refundAmountRaw !== '' ? Number(refundAmountRaw) : null,
    refundType: refundTypeRaw ? (String(refundTypeRaw).toLowerCase() === 'partial' ? 'Partial' : 'Full') : '',
    storeName: str(extra.storeName) || str(process.env.STORE_NAME) || 'our store',
  };
}

/** Values usable as {{tags}} inside admin text fields. */
function mergeTagValues(ctx) {
  return {
    customerFirstName: ctx.customerFirstName,
    customerName: ctx.customerName,
    customerEmail: ctx.customerEmail,
    orderNumber: ctx.orderNumber,
    orderDate: ctx.orderDate,
    orderTotal: money(ctx.total),
    status: ctx.status,
    carrier: ctx.carrier,
    trackingNumber: ctx.trackingNumber,
    trackingUrl: ctx.trackingUrl,
    requestNumber: ctx.requestNumber,
    reason: ctx.reason,
    refundAmount: ctx.refundAmount != null ? money(ctx.refundAmount) : '',
    refundType: ctx.refundType ? ctx.refundType.toLowerCase() : '',
    storeName: ctx.storeName,
  };
}

/**
 * Replace {{tag}} with values. `escape` true → values HTML-escaped (for body text that is
 * itself already escaped); false → plain text (subjects).
 */
function interpolate(text, values, { escape = true } = {}) {
  return String(text == null ? '' : text).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return m;
    const v = values[key] == null ? '' : String(values[key]);
    return escape ? escapeHtml(v) : v;
  });
}

/** Admin copy → safe HTML paragraph text (escape copy, then merge escaped data, keep line breaks). */
function copyHtml(text, values) {
  return interpolate(escapeHtml(text == null ? '' : String(text)), values, { escape: true }).replace(
    /\r?\n/g,
    '<br>'
  );
}

function subjectText(text, values) {
  return interpolate(text, values, { escape: false }).replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function sectionHeading(text, accent) {
  if (!str(text)) return '';
  return `<h3 style="margin:24px 0 8px;font-size:15px;line-height:1.4;color:${accent};text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(text)}</h3>`;
}

function kvTable(rows) {
  const filtered = rows.filter(([, v]) => emailFieldPresent(v));
  if (!filtered.length) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">${filtered
    .map(
      ([k, v, raw]) =>
        `<tr><td style="padding:6px 0;color:#6b7280;width:42%;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;color:#111827;vertical-align:top;">${raw ? v : escapeHtml(v)}</td></tr>`
    )
    .join('')}</table>`;
}

function itemsTable(ctx, { audience }) {
  const rows = ctx.items.filter((i) => audience === 'admin' || !i.tradeIn);
  if (!rows.length) return '';
  const body = rows
    .map((i) => {
      if (i.tradeIn) {
        return `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;" colspan="4"><strong>Trade-in device:</strong> ${escapeHtml(i.name)}${
          i.tradeInCondition ? ` <span style="color:#6b7280;">(${escapeHtml(i.tradeInCondition)})</span>` : ''
        }</td></tr>`;
      }
      return `<tr>
<td style="padding:10px 8px 10px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;"><strong>${escapeHtml(i.name)}</strong>${
        i.variant ? `<br><span style="color:#6b7280;font-size:13px;">${escapeHtml(i.variant)}</span>` : ''
      }${audience === 'admin' && i.sku ? `<br><span style="color:#6b7280;font-size:12px;">SKU: ${escapeHtml(i.sku)}</span>` : ''}</td>
<td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:top;">${i.qty}</td>
<td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;">${money(i.unitPrice)}</td>
<td style="padding:10px 0 10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;white-space:nowrap;">${money(i.lineTotal)}</td>
</tr>`;
    })
    .join('');

  const totals = [
    ['Subtotal', money(ctx.subtotal)],
    ctx.shippingPrice != null
      ? [`Shipping${ctx.shippingMethod ? ` (${ctx.shippingMethod})` : ''}`, ctx.shippingPrice === 0 ? 'Free' : money(ctx.shippingPrice)]
      : null,
    ctx.discount > 0 ? [`Discount${ctx.couponCode ? ` (${ctx.couponCode})` : ''}`, money(-ctx.discount)] : null,
  ].filter(Boolean);

  const totalsHtml = totals
    .map(
      ([k, v]) =>
        `<tr><td colspan="3" style="padding:6px 8px 6px 0;text-align:right;color:#6b7280;">${escapeHtml(k)}</td><td style="padding:6px 0 6px 8px;text-align:right;white-space:nowrap;">${escapeHtml(v)}</td></tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
<thead><tr>
<th align="left" style="padding:8px 8px 8px 0;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;">Product</th>
<th align="center" style="padding:8px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;">Qty</th>
<th align="right" style="padding:8px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;">Price</th>
<th align="right" style="padding:8px 0 8px 8px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;text-transform:uppercase;">Total</th>
</tr></thead>
<tbody>${body}${totalsHtml}
<tr><td colspan="3" style="padding:10px 8px 0 0;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;">Total</td><td style="padding:10px 0 0 8px;text-align:right;font-weight:bold;border-top:2px solid #e5e7eb;white-space:nowrap;">${money(ctx.total)}</td></tr>
</tbody></table>`;
}

function trackingBlock(ctx, buttonText, accent) {
  if (!ctx.carrier && !ctx.trackingNumber) return '';
  const table = kvTable([
    ['Courier', ctx.carrier],
    ['Tracking number', ctx.trackingNumber],
  ]);
  const button = ctx.trackingUrl
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(ctx.trackingUrl)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;">${escapeHtml(
        buttonText || 'Track your order'
      )}</a></p><p style="margin:8px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">${escapeHtml(ctx.trackingUrl)}</p>`
    : '';
  return table + button;
}

const BLOCKS = {
  orderDetails: (ctx) =>
    kvTable([
      ['Order number', ctx.orderNumber],
      ['Order date', ctx.orderDate],
      ['Order status', ctx.orderStatus],
      ['Shipping method', ctx.shippingMethod],
    ]),
  payment: (ctx) =>
    kvTable([
      ['Amount paid', ctx.paymentAmount != null ? money(ctx.paymentAmount) : money(ctx.total)],
      ['Payment status', ctx.paymentStatus],
      ['Paid on', ctx.paidAt],
      ['Transaction reference', ctx.paymentReference],
    ]),
  customer: (ctx) =>
    kvTable([
      ['Name', ctx.customerName],
      ['Email', ctx.customerEmail],
      ['Phone', ctx.customerPhone],
      ['Delivery address', ctx.shippingAddress],
    ]),
  request: (ctx) =>
    kvTable([
      ['Request number', ctx.requestNumber],
      ['Request type', ctx.requestType],
      ['Submitted', ctx.submittedAt],
      ['Reason', ctx.reason],
      ['Customer notes', ctx.notes],
      ['Status', ctx.status],
    ]),
  refund: (ctx) =>
    kvTable([
      ['Status', ctx.status],
      ['Refund type', ctx.refundType],
      ['Refund amount', ctx.refundAmount != null ? money(ctx.refundAmount) : ''],
      ['Reason', ctx.reason],
    ]),
};

/**
 * Which sections each type shows, in order. [blockName, headingFieldKey].
 * 'items' and 'tracking' are special-cased.
 */
const LAYOUTS = {
  purchaseReceipt: [
    ['orderDetails', 'sectionOrderDetails'],
    ['items', 'sectionItems'],
    ['payment', 'sectionPayment'],
    ['customer', 'sectionCustomer'],
  ],
  orderDelivered: [
    ['orderDetails', 'sectionOrderDetails'],
    ['tracking', 'sectionTracking'],
    ['items', 'sectionItems'],
    ['customer', 'sectionCustomer'],
  ],
  returnRequest: [
    ['request', 'sectionRequest'],
    ['orderDetails', 'sectionOrderDetails'],
    ['items', 'sectionItems'],
    ['customer', 'sectionCustomer'],
  ],
  refundRequest: [
    ['request', 'sectionRequest'],
    ['orderDetails', 'sectionOrderDetails'],
    ['payment', 'sectionPayment'],
    ['items', 'sectionItems'],
    ['customer', 'sectionCustomer'],
  ],
  refundStatus: [
    ['refund', 'sectionRefund'],
    ['request', 'sectionRequest'],
    ['orderDetails', 'sectionOrderDetails'],
    ['items', 'sectionItems'],
  ],
};

function renderBlocks(type, fields, ctx, { audience, accent }) {
  const layout = LAYOUTS[type] || [];
  const out = [];
  const seen = new Set();
  for (const [block, headingKey] of layout) {
    let inner = '';
    if (block === 'items') inner = itemsTable(ctx, { audience });
    else if (block === 'tracking') inner = trackingBlock(ctx, fields.trackButtonText, accent);
    else if (BLOCKS[block]) inner = BLOCKS[block](ctx);
    if (!inner) continue;
    out.push(sectionHeading(fields[headingKey], accent) + inner);
    seen.add(block);
  }
  // Admin copies always include customer + payment details.
  if (audience === 'admin') {
    if (!seen.has('customer')) out.push(sectionHeading('Customer details', accent) + BLOCKS.customer(ctx));
    if (!seen.has('payment') && ctx.paymentReference) {
      out.push(sectionHeading('Payment', accent) + BLOCKS.payment(ctx));
    }
  }
  return out.join('');
}

/**
 * Render one transactional email.
 * @param {string} type key of TRANSACTIONAL_EMAIL_TYPES
 * @param {{ fields: Record<string,string>, ctx: object, branding?: object, audience?: 'customer'|'admin', storefrontUrl?: string }} opts
 * @returns {{ subject: string, html: string }}
 */
function renderTransactionalEmail(type, { fields, ctx, branding = {}, audience = 'customer', storefrontUrl = '' }) {
  const accent = /^#[0-9a-f]{6}$/i.test(String(branding.primaryHex || '')) ? branding.primaryHex : '#25af60';
  const values = mergeTagValues(ctx);
  const isAdmin = audience === 'admin';

  const subjectSrc = isAdmin ? fields.adminEmailSubject || fields.emailSubject : fields.emailSubject;
  const subject = subjectText(subjectSrc, values) || `Order ${ctx.orderNumber}`;

  const greeting = isAdmin
    ? ''
    : `<p style="margin:0 0 12px;">${copyHtml(fields.greetingPrefix || 'Hi', values)} ${escapeHtml(ctx.customerFirstName)},</p>`;
  const intro = copyHtml(isAdmin ? fields.adminIntroParagraph || fields.introParagraph : fields.introParagraph, values);
  const closing = isAdmin ? '' : copyHtml(fields.closingParagraph, values);

  const logo = branding.logoUrl
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.logoAlt || 'Logo')}" style="max-height:48px;max-width:200px;border:0;display:block;margin:0 auto 12px;">`
    : '';
  const logoLinked = logo && storefrontUrl ? `<a href="${escapeHtml(storefrontUrl)}">${logo}</a>` : logo;

  const footer = [fields.footerLine1, fields.footerLine2]
    .filter((l) => str(l))
    .map((l) => `<p style="margin:4px 0;">${copyHtml(l, values)}</p>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:10px;overflow:hidden;">
<tr><td style="background:${accent};padding:24px;text-align:center;color:#ffffff;">${logoLinked}<h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(
    isAdmin ? `[Admin] ${fields.headerTitle || ''}` : fields.headerTitle || ''
  )}</h1></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6;">
${greeting}
<p style="margin:0 0 8px;">${intro}</p>
${renderBlocks(type, fields, ctx, { audience, accent })}
${closing ? `<p style="margin:24px 0 0;">${closing}</p>` : ''}
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280;">${footer}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html };
}

module.exports = {
  buildEmailContext,
  mergeTagValues,
  interpolate,
  renderTransactionalEmail,
  money,
  LAYOUTS,
};
