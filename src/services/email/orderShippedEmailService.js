const path = require('path');
const fs = require('fs').promises;
const {
  applyOrderShippedCopyToHtml,
  getOrderShippedCustomerResolved,
} = require('./orderEmailCopyService');
const { applyEmailBrandingToShippedHtml } = require('../../utils/emailBranding');
const {
  buildShippedCartItemVariantSpans,
  emailFieldPresent,
} = require('../../utils/orderStatusEmailDynamicHtml');
const { trackingUrlForOrder } = require('../../utils/courierTracking');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function interpolateShippedSubject(pattern, order) {
  return String(pattern || '')
    .replace(/\{\{\s*orderNumber\s*\}\}/gi, order.orderNumber != null ? String(order.orderNumber) : '')
    .trim();
}

function buildShippedProductListHtml(cart) {
  if (!Array.isArray(cart)) return '';
  return cart
    .map((item) => {
      const itemSubtotal = ((item.qty || 0) * (item.salePrice || item.Price || 0)).toFixed(2);
      const title =
        emailFieldPresent(item.productName) ? escapeHtml(item.productName) : '';
      const variantLines = buildShippedCartItemVariantSpans(item);
      return `
        <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
          ${title ? `<strong>${title}</strong><br>` : ''}
          ${variantLines}
          <span style="color: #666;">Quantity: ${escapeHtml(String(item.qty))}</span><br>
          <span style="color: #16a34a; font-weight: bold;">Item Subtotal: £${itemSubtotal}</span>
        </li>
      `;
    })
    .join('');
}

/**
 * Tracking link for the selected courier (stored custom URL first, else courier map).
 * Previously this was hard-coded to Royal Mail for every courier.
 */
function trackingHrefForOrder(order) {
  return trackingUrlForOrder(order);
}

function buildDeliveryAddressHtml(order) {
  const sd = order.shippingDetails || {};
  const name = [sd.firstName, sd.lastName].filter((x) => emailFieldPresent(x)).join(' ');
  const parts = [sd.address, sd.city, sd.postalCode, sd.country]
    .filter((x) => emailFieldPresent(x))
    .map((x) => String(x).trim());
  const lines = [name, parts.join(', ')].filter(Boolean).map(escapeHtml);
  return lines.join('<br>');
}

function buildTrackingButtonHtml(trackingUrl, buttonText) {
  if (!trackingUrl) return '';
  const safe = escapeHtml(trackingUrl);
  return `<a href="${safe}" class="tracking-link">${escapeHtml(buttonText || 'Track Your Order')}</a>
      <p style="font-size: 12px; color: #666; word-break: break-all;">${safe}</p>`;
}

/**
 * @param {import('mongoose').Document | object} order
 * @returns {Promise<{ html: string, subject: string }>}
 */
async function buildOrderShippedEmail(order) {
  const tplPath = path.join(__dirname, '..', '..', '..', 'email', 'orderShippedCustomer', 'template.html');
  let html = await fs.readFile(tplPath, 'utf8');
  html = await applyEmailBrandingToShippedHtml(html);

  const { fields } = await getOrderShippedCustomerResolved();
  html = applyOrderShippedCopyToHtml(html, fields);

  const firstNameRaw =
    order.shippingDetails?.firstName ||
    order.contactDetails?.firstName ||
    'Customer';
  const productListHtml = buildShippedProductListHtml(order.cart);
  const orderNumber = escapeHtml(order.orderNumber != null ? String(order.orderNumber) : '');
  const carrier = escapeHtml(
    order.shippingDetails?.provider != null && String(order.shippingDetails.provider).trim() !== ''
      ? String(order.shippingDetails.provider)
      : 'N/A'
  );
  const trackingNumber = escapeHtml(
    order.shippingDetails?.trackingNumber != null &&
      String(order.shippingDetails.trackingNumber).trim() !== ''
      ? String(order.shippingDetails.trackingNumber)
      : 'N/A'
  );
  const trackingUrl = trackingHrefForOrder(order);
  const trackingButtonHtml = buildTrackingButtonHtml(trackingUrl, fields.trackButtonText);
  const deliveryAddressHtml = buildDeliveryAddressHtml(order);
  const customerFirstName = escapeHtml(String(firstNameRaw).trim() || 'Customer');

  html = html
    .split('{{productListHtml}}')
    .join(productListHtml)
    .split('{{orderNumber}}')
    .join(orderNumber)
    .split('{{carrier}}')
    .join(carrier)
    .split('{{trackingNumber}}')
    .join(trackingNumber)
    .split('{{trackingButtonHtml}}')
    .join(trackingButtonHtml)
    .split('{{deliveryAddressHtml}}')
    .join(deliveryAddressHtml)
    .split('{{trackingUrl}}')
    .join(escapeHtml(trackingUrl || ''))
    .split('{{customerFirstName}}')
    .join(customerFirstName);

  const subject = interpolateShippedSubject(fields.emailSubject, order) || 'Your order has shipped';

  return { html, subject };
}

module.exports = {
  buildOrderShippedEmail,
  trackingHrefForOrder,
  buildShippedProductListHtml,
};
