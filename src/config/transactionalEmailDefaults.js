/**
 * Admin-editable copy for the transactional order emails rendered by
 * `src/utils/transactionalEmailRender.js` (one shared, branded layout).
 *
 * Stored under `OrderEmailTemplateSettings.transactional[<type>]`. Anything not saved
 * falls back to these defaults, so existing stores get every template without setup.
 *
 * Text fields may use data merge tags, e.g. {{orderNumber}}, {{customerFirstName}},
 * {{carrier}}, {{trackingNumber}}, {{trackingUrl}}, {{requestNumber}}, {{status}},
 * {{refundAmount}} — see TRANSACTIONAL_MERGE_TAGS.
 *
 * `enabled` / `adminEnabled` are 'yes' | 'no'.
 */

const TRANSACTIONAL_MERGE_TAGS = [
  { token: '{{customerFirstName}}', label: 'Customer first name' },
  { token: '{{customerName}}', label: 'Customer full name' },
  { token: '{{customerEmail}}', label: 'Customer email' },
  { token: '{{orderNumber}}', label: 'Order number' },
  { token: '{{orderDate}}', label: 'Order date' },
  { token: '{{orderTotal}}', label: 'Order total (e.g. £120.00)' },
  { token: '{{status}}', label: 'Order / request status' },
  { token: '{{carrier}}', label: 'Courier name' },
  { token: '{{trackingNumber}}', label: 'Tracking number' },
  { token: '{{trackingUrl}}', label: 'Tracking link' },
  { token: '{{requestNumber}}', label: 'Return / refund request number' },
  { token: '{{reason}}', label: 'Return / refund reason' },
  { token: '{{refundAmount}}', label: 'Refund amount' },
  { token: '{{refundType}}', label: 'Refund type (Full / Partial)' },
  { token: '{{storeName}}', label: 'Store name' },
];

const COMMON_LABELS = {
  enabled: 'Send this email to the customer (yes / no)',
  emailSubject: 'Customer email subject (merge tags allowed)',
  headerTitle: 'Header heading',
  greetingPrefix: 'Greeting before first name (e.g. Hi)',
  introParagraph: 'Intro paragraph (merge tags allowed)',
  closingParagraph: 'Closing paragraph (merge tags allowed)',
  footerLine1: 'Footer line 1',
  footerLine2: 'Footer line 2 (optional)',
};

const ADMIN_LABELS = {
  adminEnabled: 'Also notify the admin / business email (yes / no)',
  adminEmailSubject: 'Admin email subject (merge tags allowed)',
  adminIntroParagraph: 'Admin email intro (merge tags allowed)',
};

const SECTION_LABELS = {
  sectionOrderDetails: 'Section heading: order details',
  sectionItems: 'Section heading: products',
  sectionCustomer: 'Section heading: customer details',
  sectionPayment: 'Section heading: payment / transaction',
  sectionTracking: 'Section heading: tracking',
  sectionRequest: 'Section heading: request details',
  sectionRefund: 'Section heading: refund details',
  trackButtonText: 'Tracking button text',
};

function labelsFor(defaults) {
  const all = { ...COMMON_LABELS, ...ADMIN_LABELS, ...SECTION_LABELS };
  const out = {};
  for (const k of Object.keys(defaults)) out[k] = all[k] || k;
  return out;
}

const FOOTER_DEFAULTS = {
  footerLine1: 'Questions? Just reply to this email and our team will help.',
  footerLine2: '',
};

const PURCHASE_RECEIPT_DEFAULTS = {
  enabled: 'yes',
  emailSubject: 'Your receipt for order {{orderNumber}}',
  headerTitle: 'Purchase Receipt',
  greetingPrefix: 'Hi',
  introParagraph:
    'Thank you for your purchase. This is your receipt for order {{orderNumber}} placed on {{orderDate}}. Please keep it for your records.',
  sectionOrderDetails: 'Receipt details',
  sectionItems: 'Items purchased',
  sectionPayment: 'Payment',
  sectionCustomer: 'Billing & delivery',
  closingParagraph: 'We will email you again as soon as your order ships.',
  adminEnabled: 'yes',
  adminEmailSubject: 'Seller invoice — new order {{orderNumber}} ({{orderTotal}})',
  adminIntroParagraph:
    'A new paid order {{orderNumber}} was placed by {{customerName}} ({{customerEmail}}) on {{orderDate}}. Invoice details are below.',
  ...FOOTER_DEFAULTS,
};

const ORDER_DELIVERED_DEFAULTS = {
  enabled: 'yes',
  emailSubject: 'Your order {{orderNumber}} has been delivered',
  headerTitle: 'Order Delivered',
  greetingPrefix: 'Hi',
  introParagraph:
    'Good news — your order {{orderNumber}} has been delivered. We hope you love it!',
  sectionOrderDetails: 'Order details',
  sectionTracking: 'Delivery',
  trackButtonText: 'View tracking',
  sectionItems: 'Items delivered',
  sectionCustomer: 'Delivered to',
  closingParagraph:
    'If anything is not right with your order, reply to this email or request a return from your account.',
  ...FOOTER_DEFAULTS,
};

const RETURN_REQUEST_DEFAULTS = {
  enabled: 'yes',
  emailSubject: 'We received your return request {{requestNumber}}',
  headerTitle: 'Return Request Received',
  greetingPrefix: 'Hi',
  introParagraph:
    'We have received your return request {{requestNumber}} for order {{orderNumber}}. Our team will review it and get back to you shortly.',
  sectionRequest: 'Request details',
  sectionOrderDetails: 'Order details',
  sectionItems: 'Items in this order',
  sectionCustomer: 'Customer details',
  closingParagraph: 'You can follow the status of your request from your account.',
  adminEnabled: 'yes',
  adminEmailSubject: 'New return request {{requestNumber}} — order {{orderNumber}}',
  adminIntroParagraph:
    '{{customerName}} ({{customerEmail}}) submitted return request {{requestNumber}} for order {{orderNumber}}. Reason: {{reason}}.',
  ...FOOTER_DEFAULTS,
};

const REFUND_REQUEST_DEFAULTS = {
  enabled: 'yes',
  emailSubject: 'We received your refund request {{requestNumber}}',
  headerTitle: 'Refund Request Received',
  greetingPrefix: 'Hi',
  introParagraph:
    'We have received your refund request {{requestNumber}} for order {{orderNumber}}. Our team will review it and let you know the outcome.',
  sectionRequest: 'Request details',
  sectionOrderDetails: 'Order details',
  sectionPayment: 'Original payment',
  sectionItems: 'Items in this order',
  sectionCustomer: 'Customer details',
  closingParagraph: 'You can follow the status of your request from your account.',
  adminEnabled: 'yes',
  adminEmailSubject: 'New refund request {{requestNumber}} — order {{orderNumber}}',
  adminIntroParagraph:
    '{{customerName}} ({{customerEmail}}) requested a refund ({{requestNumber}}) for order {{orderNumber}} ({{orderTotal}}). Reason: {{reason}}.',
  ...FOOTER_DEFAULTS,
};

const REFUND_STATUS_DEFAULTS = {
  enabled: 'yes',
  emailSubject: 'Update on your order {{orderNumber}}: {{status}}',
  headerTitle: 'Return / Refund Update',
  greetingPrefix: 'Hi',
  introParagraph:
    'The status of your return / refund for order {{orderNumber}} is now: {{status}}.',
  sectionRefund: 'Refund details',
  sectionRequest: 'Request details',
  sectionOrderDetails: 'Order details',
  sectionItems: 'Items',
  closingParagraph:
    'Refunds are returned to your original payment method and usually appear within 5–10 business days, depending on your bank.',
  adminEnabled: 'yes',
  adminEmailSubject: 'Refund processed — order {{orderNumber}} ({{refundAmount}})',
  adminIntroParagraph:
    'A {{refundType}} refund of {{refundAmount}} was recorded for order {{orderNumber}} ({{customerName}}, {{customerEmail}}).',
  ...FOOTER_DEFAULTS,
};

/**
 * Ordered list of template types. `group` / `label` drive the admin tabs.
 */
const TRANSACTIONAL_EMAIL_TYPES = {
  purchaseReceipt: {
    label: 'Receipt / invoice',
    group: 'Orders',
    hint:
      'Sent with the order confirmation once payment is verified: a full receipt to the customer, and a seller invoice to the admin / business email.',
    defaults: PURCHASE_RECEIPT_DEFAULTS,
  },
  orderDelivered: {
    label: 'Delivered',
    group: 'Orders',
    hint: 'Sent to the customer when an order is marked Delivered (once per order).',
    defaults: ORDER_DELIVERED_DEFAULTS,
  },
  returnRequest: {
    label: 'Return request',
    group: 'Returns',
    hint: 'Sent to the customer and the admin / business email when a customer submits a return request.',
    defaults: RETURN_REQUEST_DEFAULTS,
  },
  refundRequest: {
    label: 'Refund request',
    group: 'Returns',
    hint: 'Sent to the customer and the admin / business email when a customer asks for a refund.',
    defaults: REFUND_REQUEST_DEFAULTS,
  },
  refundStatus: {
    label: 'Refund status',
    group: 'Returns',
    hint:
      'Sent to the customer when a return/refund request or return order changes status, and when an order is marked Refunded (the admin also gets a copy of the refund confirmation).',
    defaults: REFUND_STATUS_DEFAULTS,
  },
};

const TRANSACTIONAL_TYPE_KEYS = Object.keys(TRANSACTIONAL_EMAIL_TYPES);

/** Field labels per type, for the admin editor. */
const TRANSACTIONAL_FIELD_LABELS = Object.fromEntries(
  TRANSACTIONAL_TYPE_KEYS.map((k) => [k, labelsFor(TRANSACTIONAL_EMAIL_TYPES[k].defaults)])
);

module.exports = {
  TRANSACTIONAL_EMAIL_TYPES,
  TRANSACTIONAL_TYPE_KEYS,
  TRANSACTIONAL_FIELD_LABELS,
  TRANSACTIONAL_MERGE_TAGS,
};
