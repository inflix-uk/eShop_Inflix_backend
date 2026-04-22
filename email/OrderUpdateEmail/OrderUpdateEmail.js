const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');
const {
    getOrderStatusAdminResolved,
    applyOrderStatusCopyToHtml,
    interpolateSubjectPattern,
} = require('../../src/services/email/orderEmailCopyService');

const getStatusColor = (status) => {
    const statusMap = {
        pending: '#ff9800',
        confirmed: '#4caf50',
        processing: '#2196f3',
        completed: '#4caf50',
        cancelled: '#f44336'
    };
    return statusMap[status] || '#1a237e';
};

const replaceTemplateVariables = (template, data) => {
    // Replace status color
    template = template.replace('{{statusColor}}', getStatusColor(data.status));

    // Replace simple variables
    template = template.replace('{{orderNumber}}', data.orderNumber);
    template = template.replace('{{status}}', data.status);

    // Handle shipping option section
    if (data.shippingOption) {
        template = template.replace('{{#if shippingOption}}', '');
        template = template.replace('{{/if}}', '');
        template = template.replace('{{shippingOption}}', data.shippingOption);
    } else {
        template = template.replace(/{{#if shippingOption}}[\s\S]*?{{\/if}}/g, '');
    }

    // Handle note section
    if (data.note) {
        template = template.replace('{{#if note}}', '');
        template = template.replace('{{/if}}', '');
        template = template.replace('{{note}}', data.note);
    } else {
        template = template.replace(/{{#if note}}[\s\S]*?{{\/if}}/g, '');
    }

    // Replace user details
    template = template.replace('{{user.firstname}}', data.user.firstname);
    template = template.replace('{{user.lastname}}', data.user.lastname);
    template = template.replace('{{user.email}}', data.user.email);
    template = template.replace('{{user.phoneNumber}}', data.user.phoneNumber);

    // Handle address section
    if (data.user.address) {
        template = template.replace('{{#if user.address}}', '');
        template = template.replace('{{/if}}', '');
        template = template.replace('{{user.address.address}}', data.user.address.address);
        template = template.replace('{{user.address.city}}', data.user.address.city);
        template = template.replace('{{user.address.county}}', data.user.address.county);
        template = template.replace('{{user.address.postalCode}}', data.user.address.postalCode);
        template = template.replace('{{user.address.country}}', data.user.address.country);

        if (data.user.address.apartment) {
            template = template.replace('{{#if user.address.apartment}}', '');
            template = template.replace('{{/if}}', '');
            template = template.replace('{{user.address.apartment}}', data.user.address.apartment);
        } else {
            template = template.replace(/{{#if user.address.apartment}}[\s\S]*?{{\/if}}/g, '');
        }
    } else {
        template = template.replace(/{{#if user.address}}[\s\S]*?{{\/if}}/g, '');
    }

    // Handle order items
    const itemsTemplate = template.match(/{{#each order.items}}([\s\S]*?){{\/each}}/)[1];
    const itemsHtml = data.order.items.map(item => {
        let itemHtml = itemsTemplate
            .replace('{{deviceName}}', item.deviceName)
            .replace('{{brandName}}', item.brandName)
            .replace('{{selectedStorageLabel}}', item.selectedStorageLabel)
            .replace('{{selectedCondition}}', item.selectedCondition)
            .replace('{{quantity}}', item.quantity)
            .replace('{{totalPrice}}', item.totalPrice);

        if (item.imeiNumbers && item.imeiNumbers[0]) {
            itemHtml = itemHtml
                .replace('{{#if imeiNumbers.[0]}}', '')
                .replace('{{/if}}', '')
                .replace('{{imeiNumbers.[0]}}', item.imeiNumbers[0]);
        } else {
            itemHtml = itemHtml.replace(/{{#if imeiNumbers\.\[0\]}}[\s\S]*?{{\/if}}/g, '');
        }

        return itemHtml;
    }).join('');

    template = template.replace(/{{#each order.items}}[\s\S]*?{{\/each}}/, itemsHtml);
    template = template.replace('{{order.totalOrderValue}}', data.order.totalOrderValue);

    return template;
};

const sendOrderUpdateEmail = async (orderData) => {
    try {
        const statusCopy = await getOrderStatusAdminResolved();
        const templatePath = path.join(__dirname, 'template.html');
        let templateContent = await fs.readFile(templatePath, 'utf-8');
        templateContent = applyOrderStatusCopyToHtml(templateContent, statusCopy.fields);

        const htmlContent = replaceTemplateVariables(templateContent, orderData);

        const subject = interpolateSubjectPattern(statusCopy.fields.emailSubjectPattern, {
            orderNumber: orderData.orderNumber,
            status: orderData.status,
        });

        const mailOptions = {
            to: 'order@zextons.co.uk',
            subject,
            html: htmlContent
        };

        await sendMail(mailOptions);
        console.log('Order update email sent successfully');
    } catch (error) {
        console.error('Error sending order update email:', error);
        throw error;
    }
};

module.exports = {
    sendOrderUpdateEmail
};
