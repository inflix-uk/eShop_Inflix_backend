// services/orderService/updateOrder.js
const Order = require("../../models/order");
const path = require('path');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
const {
    getOrderConfirmationResolved,
    applyOrderConfirmationCopyToHtml,
} = require('../email/orderEmailCopyService');
const { getEmailBranding, applyEmailBrandingToHtml } = require('../../utils/emailBranding');
const { normalizeShippingTracking } = require('../../utils/courierTracking');
const {
    notifyOrderShipped,
    notifyOrderDelivered,
    notifyRefundStatus,
    getAdminRecipient,
} = require('../email/transactionalEmailService');
const {
    sendOrderUpdateEmailToCustomer,
    buildOrderDataForStatusEmail,
} = require('../../../email/OrderUpdateEmailToCustomer/OrderUpdateEmailToCustomer');
const {
    buildSimpleCartRowVariantDivs,
    emailFieldPresent,
    escapeHtml,
} = require('../../utils/orderStatusEmailDynamicHtml');


const updateOrderService = async (id, orderData) => {
    try {
        const { cart, shippingDetails, contactDetails, status, totalOrderValue, coupon, reason, refund } = orderData;

        console.log("req.body", orderData);

        // Prepare update data
        const updateData = {
            cart,
            shippingDetails,
            contactDetails,
            status,
            coupon,
            totalOrderValue
        };

        // Add reason if provided
        if (reason) {
            updateData.reason = reason;
        }

        // Add refund data if provided (for Refunded status)
        if (refund) {
            updateData.refund = refund;
        }

        const existingOrder = await Order.findById(id).select({ status: 1, shippingDetails: 1, refund: 1 }).lean();

        // Courier name + tracking URL come from the courier map (custom seller URL kept).
        if (shippingDetails && typeof shippingDetails === 'object') {
            const tracking = normalizeShippingTracking(shippingDetails, existingOrder?.shippingDetails || {});
            const { customProvider, ...rest } = shippingDetails;
            updateData.shippingDetails = {
                ...rest,
                provider: tracking.provider,
                trackingNumber: tracking.trackingNumber,
                trackingUrl: tracking.trackingUrl,
                trackingUrlCustom: tracking.trackingUrlCustom,
            };
        }

        // Find the order by ID and update it with the new data
        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true } // Return the updated order
        );

        // If the order is not found
        if (!updatedOrder) {
            return {
                success: false,
                message: 'Order not found',
                status: 404
            };
        }

        console.log('updatedOrder:', updatedOrder);

        const previousStatus = existingOrder?.status;

        if (status === 'Shipped') {
            // Note: Quantities are already reduced when order status became "Pending" in createOrder.js
            // Deduped on courier + tracking number; never throws.
            notifyOrderShipped(updatedOrder);
        }

        if (status === 'Delivered') {
            notifyOrderDelivered(updatedOrder);
        }

        // Only when the order moves INTO Pending — admin edits of a Pending order must not
        // re-send the confirmation every time they are saved.
        if (status === 'Pending' && previousStatus !== 'Pending') {
            try {
                // Read the HTML email template
                const emailTemplatePath = path.join(__dirname, '..', '..', '..', 'email', 'orderConfermation', 'index.html');
                let emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');
                const branding = await getEmailBranding();
                emailTemplate = await applyEmailBrandingToHtml(emailTemplate, branding);
                const confirmationCopy = await getOrderConfirmationResolved();
                emailTemplate = applyOrderConfirmationCopyToHtml(
                  emailTemplate,
                  confirmationCopy.fields
                );

                // Calculate total order value and apply discounts
                let totalOrderValue = updatedOrder.cart.reduce((sum, item) => sum + (item.qty || 0) * (item.salePrice || item.Price || 0), 0);

                let discountAmount = 0;
                if (updatedOrder.coupon && updatedOrder.coupon.length > 0) {
                    const coupon = updatedOrder.coupon[0];
                    if (coupon.discount_type === "flat") {
                        discountAmount = coupon.discount;
                    } else if (coupon.discount_type === "percentage") {
                        const percentageDiscount = (totalOrderValue * coupon.discount) / 100;
                        discountAmount = coupon.upto ? Math.min(percentageDiscount, coupon.upto) : percentageDiscount;
                    }
                }

                const discountedOrderValue = Math.max(0, totalOrderValue - discountAmount);
                const finalOrderValue = discountAmount > 0 ? discountedOrderValue : totalOrderValue;

                // Generate HTML for each cart item
                const cartItemsHTML = updatedOrder.cart.map(item => {
                    const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                    return `
                        <tr>
                            <td align="left" valign="middle" style="padding: 20px 0; border-bottom: 1px solid #e7e7d2b3;">
                                ${emailFieldPresent(item.productName) ? `<div><strong>${escapeHtml(item.productName)}</strong></div>` : ''}
                                ${buildSimpleCartRowVariantDivs(item)}
                                <div>Quantity: ${item.qty}</div>
                                <div>Item Subtotal: £${itemSubtotal}</div>
                            </td>
                        </tr>
                    `;
                }).join('');

                // Update email template with cart items and order details
                const completetotal = `
                    <tr align="left" valign="middle">
                        <td class="pc-w620-halign-left pc-w620-valign-middle pc-w620-width-100pc" align="left" valign="middle" style="padding: 20px 0px 20px 0px;">
                            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td class="pc-w620-spacing-20-0-0-0 pc-w620-align-left" align="left" valign="top">
                                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                                            <tr>
                                                <td valign="top" class="pc-w620-align-left" align="left">
                                                    <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; ${branding.typo_h3}; font-size: 16px; color: #1d3425; text-align: left;">
                                                        <span>Subtotal: £${totalOrderValue.toFixed(2)}</span>
                                                    </div>
                                                    <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; ${branding.typo_h3}; font-size: 16px; color: #1d3425; text-align: left;">
                                                        <span>Total Price (After Discount): £${finalOrderValue.toFixed(2)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                `;

                emailTemplate = emailTemplate
                    .replace('{{cartItems}}', cartItemsHTML)
                    .replace('{{ordernumber}}', `Confirmation number: ${updatedOrder.orderNumber}`)
                    .replace('{{subtotal}}', `£${totalOrderValue.toFixed(2)}`)
                    .replace('{{completetotal}}', completetotal);

                // Add Trustpilot AFS script to the email template (in head section)
                const trustpilotScript = `
    <script type="application/json+trustpilot">
    {
        "recipientName": "${updatedOrder.shippingDetails.firstName} ${updatedOrder.shippingDetails.lastName}",
        "recipientEmail": "${updatedOrder.contactDetails.email}",
        "referenceId": "${updatedOrder.orderNumber}"
    }
    </script>`;
                emailTemplate = emailTemplate.replace('</head>', `${trustpilotScript}\n</head>`);

                // Email options for the customer and Trustpilot
                const mailOptionsCustomer = {
                    to: updatedOrder.contactDetails.email,
                    subject: confirmationCopy.subject,
                    html: emailTemplate
                };

                const mailOptionsTrustpilot = {
                    to: '9311f649e0@invite.trustpilot.com',
                    subject: confirmationCopy.subject,
                    html: emailTemplate
                };

                // Email options for the owner/admin
                const mailOptionsOwner = {
                    to: await getAdminRecipient(),
                    subject: `New Order Received - ${updatedOrder.orderNumber}`,
                    html: emailTemplate
                };

                sendMail(mailOptionsCustomer).then(
                    (info) => console.log('Order confirmation email sent to customer:', info.response || info.messageId),
                    (error) => console.log("Error sending order confirmation email to customer:", error)
                );

                sendMail(mailOptionsTrustpilot).then(
                    (info) => console.log('Order confirmation email sent to Trustpilot:', info.response || info.messageId),
                    (error) => console.log("Error sending order confirmation email to Trustpilot:", error)
                );

                sendMail(mailOptionsOwner).then(
                    (info) => console.log('Order confirmation email sent to owner:', info.response || info.messageId),
                    (error) => console.log("Error sending order confirmation email to owner:", error)
                );
            } catch (confirmationErr) {
                console.error('Order confirmation email (update) failed:', confirmationErr);
            }
        }

        if (status === 'Refunded') {
            // Customer refund confirmation + admin copy (Email templates → Refund status).
            notifyRefundStatus(updatedOrder, {
                status: 'Refunded',
                refundAmount: updatedOrder.refund?.refundAmount ?? updatedOrder.totalOrderValue,
                refundType: updatedOrder.refund?.refundType || 'full',
                reason: updatedOrder.reason,
                includeAdmin: true,
                dedupeKey: `order-refunded|${updatedOrder.refund?.refundAmount ?? ''}`,
            });
        }

        /** Customer status notification — Shipped / Refunded / Pending use dedicated templates above */
        const skipGenericStatusEmail = ['Shipped', 'Refunded', 'Pending', 'Delivered'];
        if (
            status &&
            status !== previousStatus &&
            !skipGenericStatusEmail.includes(status) &&
            updatedOrder.contactDetails?.email
        ) {
            const orderData = buildOrderDataForStatusEmail(updatedOrder);
            sendOrderUpdateEmailToCustomer(orderData).catch((err) =>
                console.error('Order status update email failed:', err)
            );
        }

        // Return success response with updated order
        return {
            success: true,
            message: 'Order updated successfully',
            order: updatedOrder,
            status: 201
        };
    } catch (error) {
        console.error("Error updating order:", error);
        return {
            success: false,
            message: "Internal server error",
            status: 500
        };
    }
};

/**
 * Bulk update multiple orders at once
 * @param {Array} orderIds - Array of order IDs to update
 * @param {Object} updateData - Data to apply to all orders (e.g., { status: 'Shipped' })
 * @returns {Object} - Result with success status and updated orders
 */
const bulkUpdateOrdersService = async (orderIds, updateData) => {
    try {
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return {
                success: false,
                message: 'No order IDs provided',
                status: 400
            };
        }

        const { status } = updateData;

        if (!status) {
            return {
                success: false,
                message: 'Status is required for bulk update',
                status: 400
            };
        }

        // Update all orders in a single database operation
        const updateResult = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: { status: status } }
        );

        if (updateResult.matchedCount === 0) {
            return {
                success: false,
                message: 'No orders found with the provided IDs',
                status: 404
            };
        }

        // Shipped / Delivered emails for each order (deduped per order; never throw).
        if (status === 'Shipped' || status === 'Delivered') {
            try {
                const updatedOrders = await Order.find({ _id: { $in: orderIds } });
                await Promise.allSettled(
                    updatedOrders.map((order) =>
                        status === 'Shipped' ? notifyOrderShipped(order) : notifyOrderDelivered(order)
                    )
                );
            } catch (err) {
                console.error('Bulk status emails failed:', err);
            }
        }

        return {
            success: true,
            message: `Successfully updated ${updateResult.modifiedCount} order(s)`,
            modifiedCount: updateResult.modifiedCount,
            matchedCount: updateResult.matchedCount,
            status: 200
        };
    } catch (error) {
        console.error("Error bulk updating orders:", error);
        return {
            success: false,
            message: "Internal server error",
            status: 500
        };
    }
};

module.exports = updateOrderService;
module.exports.bulkUpdateOrdersService = bulkUpdateOrdersService;
