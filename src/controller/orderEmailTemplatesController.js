const {
  ORDER_CONFIRMATION_FIELD_LABELS,
  ORDER_STATUS_CUSTOMER_FIELD_LABELS,
  ORDER_STATUS_ADMIN_FIELD_LABELS,
  ORDER_SHIPPED_CUSTOMER_FIELD_LABELS,
} = require('../config/orderEmailTemplateDefaults');
const OrderEmailTemplateSettings = require('../models/orderEmailTemplateSettings');
const {
  TRANSACTIONAL_EMAIL_TYPES,
  TRANSACTIONAL_TYPE_KEYS,
  TRANSACTIONAL_FIELD_LABELS,
  TRANSACTIONAL_MERGE_TAGS,
} = require('../config/transactionalEmailDefaults');
const {
  getAllTransactionalResolved,
  renderPreview,
} = require('../services/email/transactionalEmailService');

function transactionalDefinitions() {
  return TRANSACTIONAL_TYPE_KEYS.map((key) => ({
    key,
    label: TRANSACTIONAL_EMAIL_TYPES[key].label,
    group: TRANSACTIONAL_EMAIL_TYPES[key].group,
    hint: TRANSACTIONAL_EMAIL_TYPES[key].hint,
    fieldLabels: TRANSACTIONAL_FIELD_LABELS[key],
  }));
}
const {
  getOrderConfirmationResolved,
  getOrderStatusCustomerResolved,
  getOrderStatusAdminResolved,
  getOrderShippedCustomerResolved,
  saveOrderEmailSections,
  sanitizeOrderNumberPrefix,
} = require('../services/email/orderEmailCopyService');

const orderEmailTemplatesController = {
  async getAdmin(req, res) {
    try {
      const settingsDoc = await OrderEmailTemplateSettings.getSettings();
      const orderNumberPrefix = sanitizeOrderNumberPrefix(settingsDoc.orderNumberPrefix);
      const [confirmation, statusCustomer, statusAdmin, shippedCustomer, transactional] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
        getOrderShippedCustomerResolved(),
        getAllTransactionalResolved(),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          orderNumberPrefix,
          transactionalDefinitions: transactionalDefinitions(),
          transactionalMergeTags: TRANSACTIONAL_MERGE_TAGS,
          transactional,
          definitions: {
            orderConfirmation: { fieldLabels: ORDER_CONFIRMATION_FIELD_LABELS },
            orderStatusCustomer: { fieldLabels: ORDER_STATUS_CUSTOMER_FIELD_LABELS },
            orderStatusAdmin: { fieldLabels: ORDER_STATUS_ADMIN_FIELD_LABELS },
            orderShippedCustomer: { fieldLabels: ORDER_SHIPPED_CUSTOMER_FIELD_LABELS },
          },
          templates: {
            orderConfirmation: confirmation.fields,
            orderStatusCustomer: statusCustomer.fields,
            orderStatusAdmin: statusAdmin.fields,
            orderShippedCustomer: shippedCustomer.fields,
          },
        },
      });
    } catch (error) {
      console.error('orderEmailTemplates getAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load order email templates',
      });
    }
  },

  async saveAdmin(req, res) {
    try {
      const savedDoc = await saveOrderEmailSections(req.body || {});
      const orderNumberPrefix = sanitizeOrderNumberPrefix(savedDoc.orderNumberPrefix);
      const [confirmation, statusCustomer, statusAdmin, shippedCustomer, transactional] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
        getOrderShippedCustomerResolved(),
        getAllTransactionalResolved(),
      ]);
      return res.status(200).json({
        success: true,
        message: 'Order email templates saved',
        data: {
          orderNumberPrefix,
          transactional,
          templates: {
            orderConfirmation: confirmation.fields,
            orderStatusCustomer: statusCustomer.fields,
            orderStatusAdmin: statusAdmin.fields,
            orderShippedCustomer: shippedCustomer.fields,
          },
        },
      });
    } catch (error) {
      console.error('orderEmailTemplates saveAdmin:', error);
      const msg = error?.message || 'Failed to save';
      const bad = msg.includes('must be a string');
      return res.status(bad ? 400 : 500).json({
        success: false,
        message: msg,
      });
    }
  },
};

/**
 * POST /order-email-templates/preview  { type, fields, audience }
 * Renders a transactional template with unsaved copy + sample order data (same renderer as real sends).
 */
orderEmailTemplatesController.preview = async function preview(req, res) {
  try {
    const { type, fields, audience } = req.body || {};
    if (!TRANSACTIONAL_EMAIL_TYPES[type]) {
      return res.status(400).json({ success: false, message: 'Unknown template type' });
    }
    const safeFields = {};
    if (fields && typeof fields === 'object') {
      for (const [k, v] of Object.entries(fields)) {
        if (typeof v === 'string') safeFields[k] = v.slice(0, 20000);
      }
    }
    const { html, subject } = await renderPreview(type, safeFields, audience);
    return res.status(200).json({ success: true, data: { html, subject } });
  } catch (error) {
    console.error('orderEmailTemplates preview:', error);
    return res.status(500).json({ success: false, message: 'Failed to render preview' });
  }
};

module.exports = orderEmailTemplatesController;
