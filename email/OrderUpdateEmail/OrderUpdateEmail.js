const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');
const {
    getOrderStatusAdminResolved,
    applyOrderStatusCopyToHtml,
    interpolateSubjectPattern,
} = require('../../src/services/email/orderEmailCopyService');
const {
    emailFieldPresent,
    buildCustomerDetailRowsHtml,
    buildOrderStatusItemInnerHtml,
} = require('../../src/utils/orderStatusEmailDynamicHtml');

const getStatusColor = (status) => {
    const statusMap = {
        pending: '#ff9800',
        confirmed: '#4caf50',
        processing: '#2196f3',
        completed: '#4caf50',
        cancelled: '#f44336',
    };
    return statusMap[status] || '#1a237e';
};

const replaceTemplateVariables = (template, data, opts = {}) => {
    const copyFields = opts.copyFields || {};

    let out = template;
    out = out.replace(
        /\{\{CUSTOMER_DETAIL_ROWS\}\}/g,
        buildCustomerDetailRowsHtml(data.user, copyFields, 'admin')
    );

    out = out.replace(/\{\{statusColor\}\}/g, getStatusColor(data.status));

    out = out.replace(/\{\{orderNumber\}\}/g, data.orderNumber);
    out = out.replace(/\{\{status\}\}/g, data.status);

    if (emailFieldPresent(data.shippingOption)) {
        out = out.replace('{{#if shippingOption}}', '');
        out = out.replace('{{/if}}', '');
        out = out.replace('{{shippingOption}}', data.shippingOption);
    } else {
        out = out.replace(/{{#if shippingOption}}[\s\S]*?{{\/if}}/g, '');
    }

    if (emailFieldPresent(data.note)) {
        out = out.replace('{{#if note}}', '');
        out = out.replace('{{/if}}', '');
        out = out.replace('{{note}}', data.note);
    } else {
        out = out.replace(/{{#if note}}[\s\S]*?{{\/if}}/g, '');
    }

    const eachMatch = out.match(/{{#each order.items}}([\s\S]*?){{\/each}}/);
    if (eachMatch && data.order && Array.isArray(data.order.items)) {
        const itemsTemplate = eachMatch[1];
        const itemsHtml = data.order.items
            .map((item) =>
                itemsTemplate.replace(
                    /\{\{ORDER_ITEM_INNER_HTML\}\}/g,
                    buildOrderStatusItemInnerHtml(item, copyFields, 'admin')
                )
            )
            .join('');

        out = out.replace(/{{#each order.items}}[\s\S]*?{{\/each}}/, itemsHtml);
    } else {
        out = out.replace(
            /{{#each order.items}}[\s\S]*?{{\/each}}/,
            '<li class="item"><p>No line items.</p></li>'
        );
    }

    out = out.replace('{{order.totalOrderValue}}', data.order.totalOrderValue);

    return out;
};

const sendOrderUpdateEmail = async (orderData) => {
    try {
        const statusCopy = await getOrderStatusAdminResolved();
        const templatePath = path.join(__dirname, 'template.html');
        let templateContent = await fs.readFile(templatePath, 'utf-8');
        templateContent = applyOrderStatusCopyToHtml(templateContent, statusCopy.fields);

        const htmlContent = replaceTemplateVariables(templateContent, orderData, {
            copyFields: statusCopy.fields,
        });

        const subject = interpolateSubjectPattern(statusCopy.fields.emailSubjectPattern, {
            orderNumber: orderData.orderNumber,
            status: orderData.status,
        });

        const mailOptions = {
            to: 'order@',
            subject,
            html: htmlContent,
        };

        await sendMail(mailOptions);
        console.log('Order update email sent successfully');
    } catch (error) {
        console.error('Error sending order update email:', error);
        throw error;
    }
};

module.exports = {
    sendOrderUpdateEmail,
};
