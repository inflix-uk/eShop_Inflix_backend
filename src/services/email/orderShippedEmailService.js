const path = require('path');
const fs = require('fs').promises;
const {
  applyOrderShippedCopyToHtml,
  getOrderShippedCustomerResolved,
} = require('./orderEmailCopyService');

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
      const match = item.name?.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
      const condition = match ? match[1] : 'Unknown';
      const colorName = match ? match[2] : 'Unknown';
      const storage = match ? match[4] : 'Unknown';
      const itemSubtotal = ((item.qty || 0) * (item.salePrice || item.Price || 0)).toFixed(2);
      const name = escapeHtml(item.productName || 'Item');
      return `
        <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
          <strong>${name}</strong><br>
          <span style="color: #666;">Condition: ${escapeHtml(condition)}</span><br>
          <span style="color: #666;">Quantity: ${escapeHtml(String(item.qty))}</span><br>
          <span style="color: #666;">Color: ${escapeHtml(colorName)}</span><br>
          <span style="color: #666;">Storage: ${escapeHtml(storage)}</span><br>
          <span style="color: #16a34a; font-weight: bold;">Item Subtotal: £${itemSubtotal}</span>
        </li>
      `;
    })
    .join('');
}

function trackingHrefForOrder(order) {
  const tn = order.shippingDetails?.trackingNumber;
  if (!tn || String(tn).trim() === '') return '#';
  return `https://www.royalmail.com/track-your-item#/${encodeURIComponent(String(tn).trim())}`;
}

/**
 * @param {import('mongoose').Document | object} order
 * @returns {Promise<{ html: string, subject: string }>}
 */
async function buildOrderShippedEmail(order) {
  const tplPath = path.join(__dirname, '..', '..', '..', 'email', 'orderShippedCustomer', 'template.html');
  let html = await fs.readFile(tplPath, 'utf8');

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
    .split('{{trackingUrl}}')
    .join(escapeHtml(trackingUrl))
    .split('{{customerFirstName}}')
    .join(customerFirstName);

  const subject = interpolateShippedSubject(fields.emailSubject, order) || 'Your order has shipped';

  return { html, subject };
}

module.exports = {
  buildOrderShippedEmail,
  buildShippedProductListHtml,
};
