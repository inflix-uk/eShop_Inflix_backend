const {
  ORDER_CONFIRMATION_FIELD_LABELS,
  ORDER_STATUS_CUSTOMER_FIELD_LABELS,
  ORDER_STATUS_ADMIN_FIELD_LABELS,
} = require('../config/orderEmailTemplateDefaults');
const {
  getOrderConfirmationResolved,
  getOrderStatusCustomerResolved,
  getOrderStatusAdminResolved,
  saveOrderEmailSections,
} = require('../services/email/orderEmailCopyService');

const orderEmailTemplatesController = {
  async getAdmin(req, res) {
    try {
      const [confirmation, statusCustomer, statusAdmin] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
      ]);
      return res.status(200).json({
        success: true,
        data: {
          definitions: {
            orderConfirmation: { fieldLabels: ORDER_CONFIRMATION_FIELD_LABELS },
            orderStatusCustomer: { fieldLabels: ORDER_STATUS_CUSTOMER_FIELD_LABELS },
            orderStatusAdmin: { fieldLabels: ORDER_STATUS_ADMIN_FIELD_LABELS },
          },
          templates: {
            orderConfirmation: confirmation.fields,
            orderStatusCustomer: statusCustomer.fields,
            orderStatusAdmin: statusAdmin.fields,
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
      await saveOrderEmailSections(req.body || {});
      const [confirmation, statusCustomer, statusAdmin] = await Promise.all([
        getOrderConfirmationResolved(),
        getOrderStatusCustomerResolved(),
        getOrderStatusAdminResolved(),
      ]);
      return res.status(200).json({
        success: true,
        message: 'Order email templates saved',
        data: {
          templates: {
            orderConfirmation: confirmation.fields,
            orderStatusCustomer: statusCustomer.fields,
            orderStatusAdmin: statusAdmin.fields,
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
