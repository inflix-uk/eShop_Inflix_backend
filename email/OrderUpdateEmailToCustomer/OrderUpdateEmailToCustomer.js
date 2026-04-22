const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');
const {
    getOrderStatusCustomerResolved,
    applyOrderStatusCopyToHtml,
    interpolateSubjectPattern,
} = require('../../src/services/email/orderEmailCopyService');

/**
 * Get the appropriate color for order status
 * @param {string} status - The order status
 * @returns {string} - Hex color code for the status
 */
const getStatusColor = (status) => {
    const statusMap = {
        pending: '#ff9800',      // Orange
        confirmedOrder: '#4caf50', // Green
        confirmed: '#4caf50',    // Green
        processing: '#2196f3',   // Blue
        completed: '#4caf50',    // Green
        cancelled: '#f44336'     // Red
    };
    return statusMap[status] || '#1a237e'; // Default to dark blue
};

/**
 * Replace template variables with actual data
 * @param {string} template - HTML template string
 * @param {object} data - Order data object
 * @returns {string} - Processed HTML with variables replaced
 */
const replaceTemplateVariables = (template, data) => {
    // Ensure data exists to prevent errors
    if (!data) {
        console.error('No data provided for email template');
        return template;
    }
    
    // Replace status color
    template = template.replace('{{statusColor}}', getStatusColor(data.status));

    // Replace simple variables with safe access
    template = template.replace('{{orderNumber}}', data.orderNumber || 'N/A');
    template = template.replace('{{status}}', data.status || 'Unknown');

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

    // Replace user details with null checks
    if (data.user) {
        template = template.replace('{{user.firstname}}', data.user.firstname || '');
        template = template.replace('{{user.lastname}}', data.user.lastname || '');
        template = template.replace('{{user.email}}', data.user.email || '');
        template = template.replace('{{user.phoneNumber}}', data.user.phoneNumber || '');
    } else {
        template = template.replace('{{user.firstname}}', '');
        template = template.replace('{{user.lastname}}', '');
        template = template.replace('{{user.email}}', '');
        template = template.replace('{{user.phoneNumber}}', '');
    }

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
    const itemsTemplateMatch = template.match(/{{#each order.items}}([\s\S]*?){{\/each}}/);
    
    // Check if template section exists and order items exist
    if (itemsTemplateMatch && data.order && Array.isArray(data.order.items)) {
        const itemsTemplate = itemsTemplateMatch[1];
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
    } else {
        // If no items or template section not found
        template = template.replace(/{{#each order.items}}[\s\S]*?{{\/each}}/, 'No items found');
    }

    // Replace total value with formatting
    if (data.order && data.order.totalOrderValue) {
        const formattedTotal = new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: 'GBP' 
        }).format(data.order.totalOrderValue);
        template = template.replace('{{order.totalOrderValue}}', formattedTotal);
    } else {
        template = template.replace('{{order.totalOrderValue}}', '£0.00');
    }

    return template;
};

/**
 * Send order update email to customer
 * @param {object} orderData - The order data object
 * @returns {Promise<void>}
 */
const sendOrderUpdateEmailToCustomer = async (orderData) => {
    console.log("sendOrderUpdateEmailToCustomer", orderData);
    if (!orderData) {
        console.error('No order data provided for email');
        return;
    }

    if (!orderData.user || !orderData.user.email) {
        console.error('No customer email found in order data');
        return;
    }

    try {
        const statusCopy = await getOrderStatusCustomerResolved();
        // Read the email template
        const templatePath = path.join(__dirname, 'template.html');
        let templateContent = await fs.readFile(templatePath, 'utf-8');
        templateContent = applyOrderStatusCopyToHtml(templateContent, statusCopy.fields);

        // Replace variables in the template
        const htmlContent = replaceTemplateVariables(templateContent, orderData);

        // Format status for better readability in subject line
        const formattedStatus = orderData.status
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();

        const subject = interpolateSubjectPattern(
            statusCopy.fields.emailSubjectPattern,
            {
                orderNumber: orderData.orderNumber || 'Update',
                status: formattedStatus,
            }
        );

        const mailOptions = {
            to: orderData.user.email,
            subject,
            html: htmlContent,
            headers: {
                'X-Priority': '1', // High priority
                'X-Order-ID': orderData.orderNumber || 'Unknown'
            }
        };

        const info = await sendMail(mailOptions);
        console.log(`Order update email sent successfully to ${orderData.user.email}. Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Error sending order update email to ${orderData.user?.email || 'unknown'}:`, error);
        // Don't throw error to prevent disrupting the main process flow
        // Just log it and continue
    }
};

module.exports = {
    sendOrderUpdateEmailToCustomer
};
