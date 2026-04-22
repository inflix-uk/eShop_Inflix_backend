/**
 * Admin-editable static copy for order emails (HTML layout stays in `email/`).
 * Keys must match placeholders `{{OC_<key>}}` in `orderConfermation/index.html`
 * and `{{ST_<key>}}` in order status `template.html` files.
 */

const ORDER_CONFIRMATION_DEFAULTS = {
  emailSubject: 'Order Confirmation - Zextons Tech Store',
  htmlPageTitle: 'Order confirmation',
  heroLineBefore: 'Hooray! Your order has been ',
  heroLineHighlight: 'confirmed.',
  heroSubtext:
    'Expressing gratitude for your order, and our sincere appreciation for your trust in our services and products!',
  sectionOrderDetails: 'Order details',
  sectionItemsOrdered: 'Items Ordered',
  helpHeading: 'Any queries or concerns?',
  helpBeforeEmail: 'For any assistance or a casual chat, feel free to email us at',
  supportEmail: 'order@zextons.co.uk',
  helpAfterEmail: 'anytime.',
  linkTermsText: 'Terms and Conditions',
  linkPrivacyText: 'Privacy Policy',
  footerAddressLine: '© Zextons Tech Store | 27 Church Street | St Helens | WA10 1AX',
  unsubscribeLead: 'Prefer not to receive these emails anymore ',
  unsubscribeLinkText: 'Unsubscribe here.',
};

const ORDER_CONFIRMATION_FIELD_LABELS = {
  emailSubject: 'Customer email subject',
  htmlPageTitle: 'HTML document title (browser / client preview)',
  heroLineBefore: 'Hero heading — text before highlighted word',
  heroLineHighlight: 'Hero heading — highlighted word(s)',
  heroSubtext: 'Hero subtext (paragraph under heading)',
  sectionOrderDetails: 'Section title: order details block',
  sectionItemsOrdered: 'Section title: items ordered',
  helpHeading: 'Help module heading',
  helpBeforeEmail: 'Help text before support email',
  supportEmail: 'Support email address (visible)',
  helpAfterEmail: 'Help text after support email',
  linkTermsText: 'Footer link: Terms text',
  linkPrivacyText: 'Footer link: Privacy text',
  footerAddressLine: 'Footer address / copyright line',
  unsubscribeLead: 'Unsubscribe line — text before link',
  unsubscribeLinkText: 'Unsubscribe link label',
};

/** Customer-facing order status email (same HTML as admin; copy can differ). */
const ORDER_STATUS_CUSTOMER_DEFAULTS = {
  emailSubjectPattern: 'Order {{orderNumber}} - {{status}}',
  headerTitle: 'Order Status Update',
  labelOrderPrefix: 'Order #',
  labelStatus: 'Status:',
  labelShippingOption: 'Shipping Option:',
  labelNote: 'Note:',
  sectionCustomerDetails: 'Customer Details',
  labelName: 'Name:',
  labelEmail: 'Email:',
  labelPhone: 'Phone:',
  labelAddress: 'Address:',
  sectionOrderSummary: 'Order Summary',
  labelStorage: 'Storage:',
  labelCondition: 'Condition:',
  labelQuantity: 'Quantity:',
  labelPrice: 'Price:',
  labelImei: 'IMEI:',
  labelTotalOrderValue: 'Total Order Value:',
  footerLine1: 'Thank you for choosing Zextons!',
  footerLine2: 'If you have any questions, please contact our support team.',
};

const ORDER_STATUS_CUSTOMER_FIELD_LABELS = {
  emailSubjectPattern:
    'Email subject pattern. Use {{orderNumber}} and {{status}} (status is formatted for display).',
  headerTitle: 'Main heading (header box)',
  labelOrderPrefix: 'Label before order number (e.g. Order #)',
  labelStatus: 'Status label',
  labelShippingOption: 'Shipping option label',
  labelNote: 'Note label',
  sectionCustomerDetails: 'Section title: customer details',
  labelName: 'Label: name',
  labelEmail: 'Label: email',
  labelPhone: 'Label: phone',
  labelAddress: 'Label: address',
  sectionOrderSummary: 'Section title: order summary',
  labelStorage: 'Label: storage',
  labelCondition: 'Label: condition',
  labelQuantity: 'Label: quantity',
  labelPrice: 'Label: price',
  labelImei: 'Label: IMEI',
  labelTotalOrderValue: 'Label: total order value',
  footerLine1: 'Footer line 1',
  footerLine2: 'Footer line 2',
};

/** Admin inbox order status notification email (same body labels; different default subject). */
const ORDER_STATUS_ADMIN_DEFAULTS = {
  ...ORDER_STATUS_CUSTOMER_DEFAULTS,
  emailSubjectPattern: 'Order {{orderNumber}} Status Update - {{status}}',
};

const ORDER_STATUS_ADMIN_FIELD_LABELS = {
  ...ORDER_STATUS_CUSTOMER_FIELD_LABELS,
  emailSubjectPattern:
    'Email subject pattern (admin). Use {{orderNumber}} and {{status}} (raw status value).',
};

module.exports = {
  ORDER_CONFIRMATION_DEFAULTS,
  ORDER_CONFIRMATION_FIELD_LABELS,
  ORDER_STATUS_CUSTOMER_DEFAULTS,
  ORDER_STATUS_CUSTOMER_FIELD_LABELS,
  ORDER_STATUS_ADMIN_DEFAULTS,
  ORDER_STATUS_ADMIN_FIELD_LABELS,
};
