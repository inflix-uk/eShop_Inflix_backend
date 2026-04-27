const OrderEmailTemplateSettings = require('../../models/orderEmailTemplateSettings');
const {
  ORDER_CONFIRMATION_DEFAULTS,
  ORDER_STATUS_CUSTOMER_DEFAULTS,
  ORDER_STATUS_ADMIN_DEFAULTS,
  ORDER_SHIPPED_CUSTOMER_DEFAULTS,
} = require('../../config/orderEmailTemplateDefaults');

const MAX_LEN = 20000;
const SUBJECT_MAX = 500;

/** Allowed characters: A–Z, 0–9; max length 4. Empty / invalid falls back to Z. */
function sanitizeOrderNumberPrefix(raw) {
  const s = String(raw == null ? '' : raw)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const p = s.slice(0, 4);
  return p || 'Z';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mergeSection(defaults, saved) {
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

function applyTokensToHtml(template, fields, tokenPrefix) {
  let out = template;
  for (const key of Object.keys(fields)) {
    const token = `{{${tokenPrefix}_${key}}}`;
    const val = fields[key] != null ? escapeHtml(String(fields[key])) : '';
    out = out.split(token).join(val);
  }
  return out;
}

/**
 * Replace `{{OC_*}}` placeholders in order confirmation HTML.
 * @param {string} html
 * @param {Record<string, string>} fields
 */
function applyOrderConfirmationCopyToHtml(html, fields) {
  return applyTokensToHtml(html, fields, 'OC');
}

/**
 * Replace `{{ST_*}}` placeholders in order status HTML (customer or admin).
 */
function applyOrderStatusCopyToHtml(html, fields) {
  return applyTokensToHtml(html, fields, 'ST');
}

/**
 * Replace `{{SH_*}}` placeholders in order shipped HTML.
 */
function applyOrderShippedCopyToHtml(html, fields) {
  return applyTokensToHtml(html, fields, 'SH');
}

/**
 * @param {string} pattern
 * @param {{ orderNumber?: string, status?: string }} vars
 */
function interpolateSubjectPattern(pattern, vars) {
  const p = pattern == null ? '' : String(pattern);
  return p
    .replace(/\{\{\s*orderNumber\s*\}\}/gi, vars.orderNumber != null ? String(vars.orderNumber) : '')
    .replace(/\{\{\s*status\s*\}\}/gi, vars.status != null ? String(vars.status) : '');
}

async function getOrderConfirmationResolved() {
  const doc = await OrderEmailTemplateSettings.getSettings();
  const fields = mergeSection(ORDER_CONFIRMATION_DEFAULTS, doc.orderConfirmation);
  return {
    subject: fields.emailSubject,
    fields,
  };
}

async function getOrderStatusCustomerResolved() {
  const doc = await OrderEmailTemplateSettings.getSettings();
  const fields = mergeSection(ORDER_STATUS_CUSTOMER_DEFAULTS, doc.orderStatusCustomer);
  return { fields };
}

async function getOrderStatusAdminResolved() {
  const doc = await OrderEmailTemplateSettings.getSettings();
  const fields = mergeSection(ORDER_STATUS_ADMIN_DEFAULTS, doc.orderStatusAdmin);
  return { fields };
}

async function getOrderShippedCustomerResolved() {
  const doc = await OrderEmailTemplateSettings.getSettings();
  const fields = mergeSection(ORDER_SHIPPED_CUSTOMER_DEFAULTS, doc.orderShippedCustomer);
  return { fields };
}

/**
 * @param {{ orderConfirmation?: object, orderStatusCustomer?: object, orderStatusAdmin?: object }} body
 */
async function saveOrderEmailSections(body) {
  const doc = await OrderEmailTemplateSettings.getSettings();

  const slice = (key, v) => (key === 'emailSubject' || key === 'emailSubjectPattern' ? v.slice(0, SUBJECT_MAX) : v.slice(0, MAX_LEN));

  if (body.orderConfirmation && typeof body.orderConfirmation === 'object') {
    const next = {
      ...(doc.orderConfirmation && typeof doc.orderConfirmation === 'object' ? doc.orderConfirmation : {}),
    };
    for (const key of Object.keys(ORDER_CONFIRMATION_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.orderConfirmation, key)) continue;
      const v = body.orderConfirmation[key];
      if (v == null) continue;
      if (typeof v !== 'string') throw new Error(`orderConfirmation.${key} must be a string`);
      next[key] = slice(key, v);
    }
    doc.orderConfirmation = next;
  }

  if (body.orderStatusCustomer && typeof body.orderStatusCustomer === 'object') {
    const next = {
      ...(doc.orderStatusCustomer && typeof doc.orderStatusCustomer === 'object' ? doc.orderStatusCustomer : {}),
    };
    for (const key of Object.keys(ORDER_STATUS_CUSTOMER_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.orderStatusCustomer, key)) continue;
      const v = body.orderStatusCustomer[key];
      if (v == null) continue;
      if (typeof v !== 'string') throw new Error(`orderStatusCustomer.${key} must be a string`);
      next[key] = slice(key, v);
    }
    doc.orderStatusCustomer = next;
  }

  if (body.orderStatusAdmin && typeof body.orderStatusAdmin === 'object') {
    const next = {
      ...(doc.orderStatusAdmin && typeof doc.orderStatusAdmin === 'object' ? doc.orderStatusAdmin : {}),
    };
    for (const key of Object.keys(ORDER_STATUS_ADMIN_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.orderStatusAdmin, key)) continue;
      const v = body.orderStatusAdmin[key];
      if (v == null) continue;
      if (typeof v !== 'string') throw new Error(`orderStatusAdmin.${key} must be a string`);
      next[key] = slice(key, v);
    }
    doc.orderStatusAdmin = next;
  }

  if (body.orderShippedCustomer && typeof body.orderShippedCustomer === 'object') {
    const next = {
      ...(doc.orderShippedCustomer && typeof doc.orderShippedCustomer === 'object'
        ? doc.orderShippedCustomer
        : {}),
    };
    for (const key of Object.keys(ORDER_SHIPPED_CUSTOMER_DEFAULTS)) {
      if (!Object.prototype.hasOwnProperty.call(body.orderShippedCustomer, key)) continue;
      const v = body.orderShippedCustomer[key];
      if (v == null) continue;
      if (typeof v !== 'string') throw new Error(`orderShippedCustomer.${key} must be a string`);
      next[key] = slice(key, v);
    }
    doc.orderShippedCustomer = next;
  }

  if (body.orderNumberPrefix !== undefined && body.orderNumberPrefix !== null) {
    if (typeof body.orderNumberPrefix !== 'string') {
      throw new Error('orderNumberPrefix must be a string');
    }
    doc.orderNumberPrefix = sanitizeOrderNumberPrefix(body.orderNumberPrefix);
  }

  await doc.save();
  return doc;
}

/**
 * Prefix used when generating new order numbers (createOrder).
 * @returns {Promise<string>}
 */
async function getOrderNumberPrefixForGeneration() {
  const doc = await OrderEmailTemplateSettings.getSettings();
  return sanitizeOrderNumberPrefix(doc.orderNumberPrefix);
}

module.exports = {
  applyOrderConfirmationCopyToHtml,
  applyOrderStatusCopyToHtml,
  applyOrderShippedCopyToHtml,
  interpolateSubjectPattern,
  getOrderConfirmationResolved,
  getOrderStatusCustomerResolved,
  getOrderStatusAdminResolved,
  getOrderShippedCustomerResolved,
  saveOrderEmailSections,
  sanitizeOrderNumberPrefix,
  getOrderNumberPrefixForGeneration,
  ORDER_CONFIRMATION_DEFAULTS,
  ORDER_STATUS_CUSTOMER_DEFAULTS,
  ORDER_STATUS_ADMIN_DEFAULTS,
  ORDER_SHIPPED_CUSTOMER_DEFAULTS,
};
