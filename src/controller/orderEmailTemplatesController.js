const {
  ORDER_CONFIRMATION_FIELD_LABELS,
  ORDER_STATUS_CUSTOMER_FIELD_LABELS,
  ORDER_STATUS_ADMIN_FIELD_LABELS,
  ORDER_SHIPPED_CUSTOMER_FIELD_LABELS,
} = require('../config/orderEmailTemplateDefaults');
const OrderEmailTemplateSettings = require('../models/orderEmailTemplateSettings');
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
      const [confirmation, statusCustomer, statusAdmin, shippedCustomer] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
        getOrderShippedCustomerResolved(),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          orderNumberPrefix,
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
      const [confirmation, statusCustomer, statusAdmin, shippedCustomer] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
        getOrderShippedCustomerResolved(),
      ]);
      return res.status(200).json({
        success: true,
        message: 'Order email templates saved',
        data: {
          orderNumberPrefix,
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

module.exports = orderEmailTemplatesController;
