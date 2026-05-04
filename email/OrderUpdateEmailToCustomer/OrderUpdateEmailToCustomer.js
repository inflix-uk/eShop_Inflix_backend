const fs = require('fs').promises;
const path = require('path');
const { sendMail } = require('../../src/utils/mailer');
const {
    getOrderStatusCustomerResolved,
    applyOrderStatusCopyToHtml,
    interpolateSubjectPattern,
} = require('../../src/services/email/orderEmailCopyService');
const { getEmailBranding, applyEmailBrandingToHtml } = require('../../src/utils/emailBranding');
const {
    emailFieldPresent,
    buildCustomerDetailRowsHtml,
    buildOrderStatusItemInnerHtml,
} = require('../../src/utils/orderStatusEmailDynamicHtml');

const getStatusColor = (status) => {
    const statusMap = {
        pending: '#ff9800',
        approved: '#4caf50',
        shipped: '#4caf50',
        delivered: '#4caf50',
        cancelled: '#f44336',
        refunded: '#f44336',
        failed: '#f44336',
        deleted: '#9e9e9e',
        processing: '#2196f3',
    };
    const key = (status || '').toLowerCase();
    return statusMap[key] || '#1a237e';
};

/**
 * Map Mongo order document → template variable payload for customer status email.
 * @param {import('mongoose').Document | object} order
 */
function buildOrderDataForStatusEmail(order) {
    const o = order && typeof order.toObject === 'function' ? order.toObject() : order || {};
    const sd = o.shippingDetails || {};
    const cd = o.contactDetails || {};

    const user = {
        email: cd.email || '',
        firstname: sd.firstName || sd.firstname || '',
        lastname: sd.lastName || sd.lastname || '',
        phoneNumber: sd.phoneNumber || sd.phone || '',
    };

    const flatAddr = sd.address || sd;
    if (flatAddr && (flatAddr.addressLine1 || flatAddr.line1 || flatAddr.address || sd.city)) {
        user.address = {
            address: flatAddr.addressLine1 || flatAddr.line1 || flatAddr.address || sd.address || '',
            apartment: flatAddr.apartment || sd.apartment || '',
            city: flatAddr.city || sd.city || '',
            county: flatAddr.county || sd.county || '',
            postalCode: flatAddr.postalCode || sd.postalCode || '',
            country: flatAddr.country || sd.country || '',
        };
    }

    const cart = Array.isArray(o.cart) ? o.cart : [];
    const items = cart
        .filter((item) => item && !item.isTradeIn && item.productId !== 'trade-in')
        .map((item) => {
            const rawName = item.name || '';
            const match = String(rawName).match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
            const productName = item.productName || rawName || 'Product';
            const qty = item.qty ?? 1;
            const unit = Number(item.salePrice ?? item.Price ?? 0);
            return {
                deviceName: productName,
                brandName: '',
                selectedStorageLabel: match && match[4] ? match[4].trim() : '',
                selectedCondition: match && match[1] ? match[1].trim() : '',
                quantity: String(qty),
                totalPrice: (unit * qty).toFixed(2),
                imeiNumbers: Array.isArray(item.imeiNumbers) ? item.imeiNumbers : [],
            };
        });

    const totalNum = o.totalOrderValue != null ? Number(o.totalOrderValue) : 0;

    return {
        orderNumber: o.orderNumber || '',
        status: o.status || '',
        shippingOption: o.shippingMethod?.name || sd.shippingOption || '',
        note: sd.notes || o.reason || '',
        user,
        order: {
            items,
            totalOrderValue: totalNum,
        },
    };
}

/**
 * Replace template variables with actual data
 * @param {string} template
 * @param {object} data
 * @param {{ statusColor?: string, copyFields?: Record<string, string> }} [opts]
 */
const replaceTemplateVariables = (template, data, opts = {}) => {
    if (!data) {
        console.error('No data provided for email template');
        return template;
    }

    const copyFields = opts.copyFields || {};

    let out = template;
    out = out.replace(
        /\{\{CUSTOMER_DETAIL_ROWS\}\}/g,
        buildCustomerDetailRowsHtml(data.user, copyFields, 'customer')
    );

    const badge = opts.statusColor || getStatusColor(data.status);
    out = out.replace(/\{\{statusColor\}\}/g, badge);

    out = out.replace(/\{\{orderNumber\}\}/g, data.orderNumber || 'N/A');
    out = out.replace(/\{\{status\}\}/g, data.status || 'Unknown');

    if (emailFieldPresent(data.shippingOption)) {
        out = out.replace(
            /\{\{#if shippingOption\}\}([\s\S]*?)\{\{\/if\}\}/,
            (_, inner) => inner.replace(/\{\{shippingOption\}\}/g, data.shippingOption)
        );
    } else {
        out = out.replace(/\{\{#if shippingOption\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    if (emailFieldPresent(data.note)) {
        out = out.replace(
            /\{\{#if note\}\}([\s\S]*?)\{\{\/if\}\}/,
            (_, inner) => inner.replace(/\{\{note\}\}/g, data.note)
        );
    } else {
        out = out.replace(/\{\{#if note\}\}[\s\S]*?\{\{\/if\}\}/g, '');
    }

    const itemsTemplateMatch = out.match(/\{\{#each order.items\}\}([\s\S]*?)\{\{\/each\}\}/);

    if (itemsTemplateMatch && data.order && Array.isArray(data.order.items)) {
        const itemsTemplate = itemsTemplateMatch[1];
        const itemsHtml = data.order.items
            .map((item) =>
                itemsTemplate.replace(
                    /\{\{ORDER_ITEM_INNER_HTML\}\}/g,
                    buildOrderStatusItemInnerHtml(item, copyFields, 'customer')
                )
            )
            .join('');

        out = out.replace(/\{\{#each order.items\}\}[\s\S]*?\{\{\/each\}\}/, itemsHtml);
    } else {
        out = out.replace(
            /\{\{#each order.items\}\}[\s\S]*?\{\{\/each\}\}/,
            '<tr><td style="padding:0 0 14px 0;"><p style="margin:0;">No line items.</p></td></tr>'
        );
    }

    if (data.order && data.order.totalOrderValue != null && data.order.totalOrderValue !== '') {
        const formattedTotal = new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
        }).format(Number(data.order.totalOrderValue));
        out = out.replace(/\{\{order.totalOrderValue\}\}/g, formattedTotal);
    } else {
        out = out.replace(/\{\{order.totalOrderValue\}\}/g, '£0.00');
    }

    return out;
};

/**
 * Send order update email to customer (site-wide fonts/colors via applyEmailBrandingToHtml).
 * @param {object} orderData — from buildOrderDataForStatusEmail
 */
const sendOrderUpdateEmailToCustomer = async (orderData) => {
    if (!orderData) {
        console.error('No order data provided for email');
        return;
    }

    const to = orderData.user?.email;
    if (!to) {
        console.error('No customer email on order data for status email');
        return;
    }

    try {
        const branding = await getEmailBranding();
        const statusCopy = await getOrderStatusCustomerResolved();
        const templatePath = path.join(__dirname, 'template.html');
        let templateContent = await fs.readFile(templatePath, 'utf-8');
        templateContent = applyOrderStatusCopyToHtml(templateContent, statusCopy.fields);
        templateContent = await applyEmailBrandingToHtml(templateContent, branding);

        const htmlContent = replaceTemplateVariables(templateContent, orderData, {
            statusColor: branding.accentHex,
            copyFields: statusCopy.fields,
        });

        const formattedStatus = String(orderData.status || '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();

        const subject = interpolateSubjectPattern(statusCopy.fields.emailSubjectPattern, {
            orderNumber: orderData.orderNumber || 'Update',
            status: formattedStatus,
        });

        const mailOptions = {
            to,
            subject,
            html: htmlContent,
            headers: {
                'X-Priority': '1',
                'X-Order-ID': orderData.orderNumber || 'Unknown',
            },
        };

        const info = await sendMail(mailOptions);
        console.log(`Order status email sent to ${to}. Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`Error sending order status email to ${orderData.user?.email}:`, error);
    }
};

module.exports = {
    sendOrderUpdateEmailToCustomer,
    buildOrderDataForStatusEmail,
};
