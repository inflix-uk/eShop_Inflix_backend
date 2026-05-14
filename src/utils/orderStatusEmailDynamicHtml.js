'use strict';

/**
 * Dynamic fragments for order status emails — omit any label/value row when value is empty or placeholder-only.
 */

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * True if the value should be shown in email (non-empty, not a dash/placeholder).
 */
function emailFieldPresent(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number' && Number.isFinite(val)) return true;
  const s = String(val).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (/^[\s\u2013\u2014\-_.…]+$/u.test(s)) return false;
  const placeholders = new Set([
    '—',
    '–',
    '-',
    '--',
    '...',
    '…',
    'n/a',
    'na',
    'tbd',
    'none',
    'null',
    'undefined',
    'nil',
    '[none]',
    '(none)',
  ]);
  if (placeholders.has(lower)) return false;
  if (lower === 'unknown') return false;
  return true;
}

/**
 * Parsed variant from legacy cart `name` string (Condition-Color (hex)-128GB) or plain variant label.
 */
function getCartLineVariantParts(item) {
  const productTitle = String(item.productName || '').trim();
  const name = String(item.name || '').trim();
  const match = name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
  if (match) {
    return {
      condition: emailFieldPresent(match[1].trim()) ? match[1].trim() : '',
      colorName: emailFieldPresent(match[2].trim()) ? match[2].trim() : '',
      storage: emailFieldPresent(match[4].trim()) ? match[4].trim() : '',
      fallbackVariant: '',
    };
  }
  const fallbackVariant =
    emailFieldPresent(name) && name !== productTitle ? name : '';
  return { condition: '', colorName: '', storage: '', fallbackVariant };
}

/** Order confirmation email (`generateCartItemsHTML`) — Condition / Color / Storage rows only when real data exists. */
function buildCartItemVariantDetailsHtml(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const parts = [];
  if (emailFieldPresent(condition)) {
    parts.push(`<div><span>Condition: ${escapeHtml(condition)}</span></div>`);
  }
  if (emailFieldPresent(colorName)) {
    parts.push(`<div><span>Color: ${escapeHtml(colorName)}</span></div>`);
  }
  if (emailFieldPresent(storage)) {
    parts.push(`<div><span>Storage: ${escapeHtml(storage)}</span></div>`);
  }
  if (emailFieldPresent(fallbackVariant)) {
    parts.push(
      `<div><span>Variant: ${escapeHtml(fallbackVariant)}</span></div>`
    );
  }
  return parts.join('');
}

/** Admin “New Order Placed” email — product block without Unknown placeholders. */
function buildAdminNewOrderCartItemHtml(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const lines = [];
  if (emailFieldPresent(item.productName)) {
    lines.push(`<strong>Product:</strong> ${escapeHtml(String(item.productName))} <br>`);
  }
  if (emailFieldPresent(condition)) lines.push(`<strong>Condition:</strong> ${escapeHtml(condition)} <br>`);
  if (emailFieldPresent(colorName)) lines.push(`<strong>Color:</strong> ${escapeHtml(colorName)} <br>`);
  if (emailFieldPresent(storage)) lines.push(`<strong>Storage:</strong> ${escapeHtml(storage)} <br>`);
  if (emailFieldPresent(fallbackVariant)) lines.push(`<strong>Variant:</strong> ${escapeHtml(fallbackVariant)} <br>`);
  if (emailFieldPresent(item.SKU)) lines.push(`<strong>SKU:</strong> ${escapeHtml(String(item.SKU))} <br>`);
  if (emailFieldPresent(item.EIN)) lines.push(`<strong>EIN:</strong> ${escapeHtml(String(item.EIN))} <br>`);
  lines.push(`<strong>Quantity:</strong> ${item.qty} <br>`);
  lines.push(`<strong>Unit Price:</strong> £${item.salePrice} <br>`);
  const sub = ((item.qty || 0) * (item.salePrice || item.Price || 0)).toFixed(2);
  lines.push(`<strong>Subtotal:</strong> £${sub} <br>`);
  return lines.join('');
}

/** Shipped email product list — variant lines without Unknown. */
function buildShippedCartItemVariantSpans(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const parts = [];
  if (emailFieldPresent(condition)) {
    parts.push(`<span style="color: #666;">Condition: ${escapeHtml(condition)}</span><br>`);
  }
  if (emailFieldPresent(colorName)) {
    parts.push(`<span style="color: #666;">Color: ${escapeHtml(colorName)}</span><br>`);
  }
  if (emailFieldPresent(storage)) {
    parts.push(`<span style="color: #666;">Storage: ${escapeHtml(storage)}</span><br>`);
  }
  if (emailFieldPresent(fallbackVariant)) {
    parts.push(
      `<span style="color: #666;">Variant: ${escapeHtml(fallbackVariant)}</span><br>`
    );
  }
  return parts.join('');
}

/** Refund / update-order simple cart rows (`<div>` lines). */
function buildSimpleCartRowVariantDivs(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const parts = [];
  if (emailFieldPresent(condition)) parts.push(`<div>Condition: ${escapeHtml(condition)}</div>`);
  if (emailFieldPresent(colorName)) parts.push(`<div>Color: ${escapeHtml(colorName)}</div>`);
  if (emailFieldPresent(storage)) parts.push(`<div>Storage: ${escapeHtml(storage)}</div>`);
  if (emailFieldPresent(fallbackVariant)) {
    parts.push(`<div>Variant: ${escapeHtml(fallbackVariant)}</div>`);
  }
  return parts.join('');
}

/** Refund email list (`<span>` lines). */
function buildRefundCartItemVariantSpans(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const parts = [];
  if (emailFieldPresent(condition)) {
    parts.push(`<span style="color: #666;">Condition: ${escapeHtml(condition)}</span><br>`);
  }
  if (emailFieldPresent(colorName)) {
    parts.push(`<span style="color: #666;">Color: ${escapeHtml(colorName)}</span><br>`);
  }
  if (emailFieldPresent(storage)) {
    parts.push(`<span style="color: #666;">Storage: ${escapeHtml(storage)}</span><br>`);
  }
  if (emailFieldPresent(fallbackVariant)) {
    parts.push(
      `<span style="color: #666;">Variant: ${escapeHtml(fallbackVariant)}</span><br>`
    );
  }
  return parts.join('');
}

/** Admin refund notification — Condition / Color / Storage / Variant only when present (no Unknown). */
function buildAdminRefundCartItemVariantHtml(item) {
  const { condition, colorName, storage, fallbackVariant } = getCartLineVariantParts(item);
  const lines = [];
  if (emailFieldPresent(condition)) lines.push(`<strong>Condition:</strong> ${escapeHtml(condition)} <br>`);
  if (emailFieldPresent(colorName)) lines.push(`<strong>Color:</strong> ${escapeHtml(colorName)} <br>`);
  if (emailFieldPresent(storage)) lines.push(`<strong>Storage:</strong> ${escapeHtml(storage)} <br>`);
  if (emailFieldPresent(fallbackVariant)) lines.push(`<strong>Variant:</strong> ${escapeHtml(fallbackVariant)} <br>`);
  return lines.join('');
}

function buildAddressBlockHtml(addr, labelAddress, variant) {
  if (!addr || typeof addr !== 'object') return '';
  const lines = [];
  if (emailFieldPresent(addr.address)) lines.push(addr.address);
  if (emailFieldPresent(addr.apartment)) lines.push(addr.apartment);
  const cityCounty = [addr.city, addr.county].filter(emailFieldPresent).join(', ').trim();
  if (emailFieldPresent(cityCounty)) lines.push(cityCounty);
  if (emailFieldPresent(addr.postalCode)) lines.push(addr.postalCode);
  if (emailFieldPresent(addr.country)) lines.push(addr.country);
  if (lines.length === 0) return '';
  const inner = lines.map(escapeHtml).join('<br />');
  const label = escapeHtml(labelAddress || 'Address:');
  if (variant === 'customer') {
    return `<p style="margin: 12px 0 0 0; line-height: 1.5;"><strong>${label}</strong><br />${inner}</p>`;
  }
  return `<p><strong>${label}</strong><br />${inner}</p>`;
}

/**
 * Customer block rows (name, email, phone, address) — only non-empty fields.
 * @param {object} user
 * @param {Record<string, string>} copyFields resolved order-status labels
 * @param {'customer' | 'admin'} variant
 */
function buildCustomerDetailRowsHtml(user, copyFields, variant = 'customer') {
  if (!user || typeof user !== 'object') return '';
  const c = copyFields || {};
  const rows = [];

  const nameLine = [user.firstname, user.lastname].filter(emailFieldPresent).join(' ').trim();

  if (variant === 'customer') {
    if (emailFieldPresent(nameLine)) {
      rows.push(
        `<p style="margin: 0 0 8px 0; line-height: 1.5;"><strong>${escapeHtml(
          c.labelName || ''
        )}</strong> ${escapeHtml(nameLine)}</p>`
      );
    }
    if (emailFieldPresent(user.email)) {
      rows.push(
        `<p style="margin: 0 0 8px 0; line-height: 1.5;"><strong>${escapeHtml(
          c.labelEmail || ''
        )}</strong> ${escapeHtml(user.email)}</p>`
      );
    }
    if (emailFieldPresent(user.phoneNumber)) {
      rows.push(
        `<p style="margin: 0 0 8px 0; line-height: 1.5;"><strong>${escapeHtml(
          c.labelPhone || ''
        )}</strong> ${escapeHtml(user.phoneNumber)}</p>`
      );
    }
    const addr = buildAddressBlockHtml(user.address, c.labelAddress, 'customer');
    if (addr) rows.push(addr);
  } else {
    if (emailFieldPresent(nameLine)) {
      rows.push(
        `<p><strong>${escapeHtml(c.labelName || '')}</strong> ${escapeHtml(nameLine)}</p>`
      );
    }
    if (emailFieldPresent(user.email)) {
      rows.push(`<p><strong>${escapeHtml(c.labelEmail || '')}</strong> ${escapeHtml(user.email)}</p>`);
    }
    if (emailFieldPresent(user.phoneNumber)) {
      rows.push(
        `<p><strong>${escapeHtml(c.labelPhone || '')}</strong> ${escapeHtml(user.phoneNumber)}</p>`
      );
    }
    const addr = buildAddressBlockHtml(user.address, c.labelAddress, 'admin');
    if (addr) rows.push(addr);
  }

  return rows.join('\n');
}

function lab(copyFields, key) {
  return String(copyFields[key] ?? '');
}

/**
 * One cart line — only output rows that have real values (title, storage, condition, qty, price, IMEI).
 * @param {object} item — shape from buildOrderDataForStatusEmail items[]
 * @param {Record<string, string>} copyFields
 * @param {'customer' | 'admin'} variant
 */
function buildOrderStatusItemInnerHtml(item, copyFields, variant = 'customer') {
  const c = copyFields || {};
  const parts = [];

  const title = [item.deviceName, item.brandName].filter(emailFieldPresent).join(' ').trim();

  if (variant === 'customer') {
    if (emailFieldPresent(title)) {
      parts.push(
        `<p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600; line-height: 1.35;">${escapeHtml(
          title
        )}</p>`
      );
    }
    const addRow = (labelKey, displayValue) => {
      if (!emailFieldPresent(displayValue)) return;
      parts.push(
        `<p style="margin: 0 0 6px 0; font-size: 14px; line-height: 1.5;"><strong>${escapeHtml(
          lab(c, labelKey)
        )}</strong> ${escapeHtml(String(displayValue))}</p>`
      );
    };
    addRow('labelStorage', item.selectedStorageLabel);
    addRow('labelCondition', item.selectedCondition);
    addRow('labelQuantity', item.quantity);
    const priceStr =
      item.totalPrice != null && item.totalPrice !== ''
        ? `£${item.totalPrice}`
        : '';
    addRow('labelPrice', priceStr);
    if (item.imeiNumbers && emailFieldPresent(item.imeiNumbers[0])) {
      parts.push(
        `<p style="margin: 0; font-size: 14px; line-height: 1.5;"><strong>${escapeHtml(
          lab(c, 'labelImei')
        )}</strong> ${escapeHtml(String(item.imeiNumbers[0]))}</p>`
      );
    }
  } else {
    if (emailFieldPresent(title)) {
      parts.push(`<h4>${escapeHtml(title)}</h4>`);
    }
    const addRow = (labelKey, displayValue) => {
      if (!emailFieldPresent(displayValue)) return;
      parts.push(
        `<p><strong>${escapeHtml(lab(c, labelKey))}</strong> ${escapeHtml(String(displayValue))}</p>`
      );
    };
    addRow('labelStorage', item.selectedStorageLabel);
    addRow('labelCondition', item.selectedCondition);
    addRow('labelQuantity', item.quantity);
    const priceStr =
      item.totalPrice != null && item.totalPrice !== ''
        ? `£${item.totalPrice}`
        : '';
    addRow('labelPrice', priceStr);
    if (item.imeiNumbers && emailFieldPresent(item.imeiNumbers[0])) {
      addRow('labelImei', item.imeiNumbers[0]);
    }
  }

  return parts.join('\n');
}

module.exports = {
  escapeHtml,
  emailFieldPresent,
  getCartLineVariantParts,
  buildCustomerDetailRowsHtml,
  buildOrderStatusItemInnerHtml,
  buildCartItemVariantDetailsHtml,
  buildAdminNewOrderCartItemHtml,
  buildShippedCartItemVariantSpans,
  buildSimpleCartRowVariantDivs,
  buildRefundCartItemVariantSpans,
  buildAdminRefundCartItemVariantHtml,
};
