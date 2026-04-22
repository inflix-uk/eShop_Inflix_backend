// services/orderService/updateOrder.js
const Order = require("../../models/order");
const path = require('path');
const fs = require('fs');
const { sendMail } = require('../../utils/mailer');
const {
  getOrderConfirmationResolved,
  applyOrderConfirmationCopyToHtml,
} = require('../email/orderEmailCopyService');


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

        if (status === 'Shipped') {
            // Note: Quantities are already reduced when order status became "Pending" in createOrder.js
            // No need to reduce again here to avoid double reduction

            // Generate the list of products in HTML format with full details
            const productList = updatedOrder.cart.map(item => {
                // Parse the name to extract: Condition-ColorName (hex)-Storage
                const match = item.name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                const condition = match ? match[1] : 'Unknown';
                const colorName = match ? match[2] : 'Unknown';
                const colorHex = match ? match[3] : '';
                const storage = match ? match[4] : 'Unknown';
                const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                return `
                    <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
                        <strong>${item.productName}</strong><br>
                        <span style="color: #666;">Condition: ${condition}</span><br>
                        <span style="color: #666;">Quantity: ${item.qty}</span><br>
                        <span style="color: #666;">Color: ${colorName}</span><br>
                        <span style="color: #666;">Storage: ${storage}</span><br>
                        <span style="color: #16a34a; font-weight: bold;">Item Subtotal: £${itemSubtotal}</span>
                    </li>
                `;
            }).join('');

            // Prepare the email template for order shipment
            const emailTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Shipped</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f5f5;
                        color: #000;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background-color: #16a34a;
                        padding: 20px;
                        text-align: center;
                        color: #fff;
                    }
                    .header h1 {
                        margin: 0;
                    }
                    .content {
                        padding: 20px;
                    }
                    .content p {
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    .tracking-link {
                        display: inline-block;
                        background-color: #16a34a;
                        color: #fff !important; /* Ensure text color is white */
                        padding: 10px 15px;
                        border-radius: 5px;
                        text-decoration: none;
                    }
                    .tracking-link:hover {
                        background-color: #128e3b; /* Slightly darker green on hover */
                    }
                    .footer {
                        background-color: #16a34a;
                        color: #fff;
                        padding: 20px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .footer p {
                        margin: 5px 0;
                    }
                </style>
            </head>
            <body>

            <div class="container">
                <div class="header">
                    <h1>Order Shipped!</h1>
                </div>
                <div class="content">
                    <p>Hi ${updatedOrder.shippingDetails.firstName},</p>
                    <p>Your order has been shipped and is on its way to you. Below are the details of your shipment:</p>
                    <p><strong>Order Number:</strong> ${updatedOrder.orderNumber}</p>
                    <p><strong>Product(s):</strong></p>
                    <ul>
                        ${productList}
                    </ul>
                    <p><strong>Carrier:</strong> ${updatedOrder.shippingDetails.provider || 'N/A'}</p>
                    <p><strong>Tracking Number:</strong> ${updatedOrder.shippingDetails.trackingNumber || 'N/A'}</p>
                    <p>You can track your package using the link below:</p>
                    <a href="https://www.royalmail.com/track-your-item#/${updatedOrder.shippingDetails.trackingNumber}" class="tracking-link">Track Your Order</a>
                    <p>Thank you for shopping with Zexton Tech Store!</p>
                </div>
                <div class="footer">
                    <p>Zexton Tech Store</p>
                    <p>27 Church Street, St Helens, WA10 1AX</p>
                    <p>Email: hello@zextons.co.uk | Phone: +44 333 344 8541</p>
                </div>
            </div>

            </body>
            </html>
                `;


            // Email options for the user
            const mailOptions = {
                to: updatedOrder.contactDetails.email, // User's email address
                subject: 'Your Order Has Shipped!',
                html: emailTemplate // Use the HTML template with dynamic content
            };

            sendMail(mailOptions).then(
                (info) => console.log('Shipment email sent:', info.response || info.messageId),
                (error) => console.log('Error sending shipment email:', error)
            );
        }

        if (status === 'Pending') {
            // Read the HTML email template
            const emailTemplatePath = path.join(__dirname, '..', '..', 'email', 'orderConfermation', 'index.html');
            let emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');
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
                // Parse the name to extract: Condition-ColorName (hex)-Storage
                const match = item.name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                const condition = match ? match[1] : 'Unknown';
                const colorName = match ? match[2] : 'Unknown';
                const colorHex = match ? match[3] : '';
                const storage = match ? match[4] : 'Unknown';
                const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                return `
                    <tr>
                        <td align="left" valign="middle" style="padding: 20px 0; border-bottom: 1px solid #e7e7d2b3;">
                            <div><strong>${item.productName}</strong></div>
                            <div>Quantity: ${item.qty}</div>
                            <div>Condition: ${condition}</div>
                            <div>Color: ${colorName}</div>
                            <div>Storage: ${storage}</div>
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
                                                <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #1d3425; text-align: left;">
                                                    <span>Subtotal: £${totalOrderValue.toFixed(2)}</span>
                                                </div>
                                                <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #1d3425; text-align: left;">
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
                to: 'order@zextons.co.uk',
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
        }

        if (status === 'Refunded') {
            // Generate the list of products in HTML format with full details
            const productList = updatedOrder.cart.map(item => {
                // Parse the name to extract: Condition-ColorName (hex)-Storage
                const match = item.name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                const condition = match ? match[1] : 'Unknown';
                const colorName = match ? match[2] : 'Unknown';
                const colorHex = match ? match[3] : '';
                const storage = match ? match[4] : 'Unknown';
                const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                return `
                    <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
                        <strong>${item.productName}</strong><br>
                        <span style="color: #666;">Condition: ${condition}</span><br>
                        <span style="color: #666;">Quantity: ${item.qty}</span><br>
                        <span style="color: #666;">Color: ${colorName}</span><br>
                        <span style="color: #666;">Storage: ${storage}</span><br>
                        <span style="color: #dc2626; font-weight: bold;">Item Subtotal: £${itemSubtotal}</span>
                    </li>
                `;
            }).join('');

            // Determine refund type and amount
            const refundType = updatedOrder.refund?.refundType || 'full';
            const refundAmount = updatedOrder.refund?.refundAmount || updatedOrder.totalOrderValue || 0;

            // Prepare the email template for refund confirmation
            const emailTemplate = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Refund Processed</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f5f5;
                        color: #000;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .header {
                        background-color: #dc2626;
                        padding: 20px;
                        text-align: center;
                        color: #fff;
                    }
                    .header h1 {
                        margin: 0;
                    }
                    .content {
                        padding: 20px;
                    }
                    .content p {
                        font-size: 16px;
                        line-height: 1.5;
                    }
                    .refund-details {
                        background-color: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .refund-amount {
                        font-size: 24px;
                        font-weight: bold;
                        color: #16a34a;
                        margin: 10px 0;
                    }
                    .footer {
                        background-color: #dc2626;
                        color: #fff;
                        padding: 20px;
                        text-align: center;
                        font-size: 14px;
                    }
                    .footer p {
                        margin: 5px 0;
                    }
                    ul {
                        list-style-type: none;
                        padding: 0;
                    }
                    ul li {
                        padding: 5px 0;
                    }
                </style>
            </head>
            <body>

            <div class="container">
                <div class="header">
                    <h1>Refund Processed</h1>
                </div>
                <div class="content">
                    <p>Hi ${updatedOrder.shippingDetails.firstName},</p>
                    <p>We're writing to confirm that your refund request has been processed for order <strong>#${updatedOrder.orderNumber}</strong>.</p>

                    <div class="refund-details">
                        <h3 style="margin-top: 0; color: #92400e;">Refund Details</h3>
                        <p><strong>Refund Type:</strong> ${refundType === 'full' ? 'Full Refund' : 'Partial Refund'}</p>
                        <p><strong>Refund Amount:</strong></p>
                        <p class="refund-amount">£${parseFloat(refundAmount).toFixed(2)}</p>
                        ${updatedOrder.reason ? `<p><strong>Reason:</strong> ${updatedOrder.reason}</p>` : ''}
                    </div>

                    <p><strong>Order Details:</strong></p>
                    <ul>
                        ${productList}
                    </ul>

                    <p><strong>What happens next?</strong></p>
                    <p>The refund will be processed to your original payment method within 5-10 business days. The exact timing may vary depending on your bank or card issuer.</p>

                    <p>If you have any questions about this refund, please don't hesitate to contact our customer service team.</p>

                    <p>We apologize for any inconvenience and appreciate your understanding.</p>

                    <p>Best regards,<br>Zexton Tech Store Team</p>
                </div>
                <div class="footer">
                    <p>Zexton Tech Store</p>
                    <p>27 Church Street, St Helens, WA10 1AX</p>
                    <p>Email: hello@zextons.co.uk | Phone: +44 333 344 8541</p>
                </div>
            </div>

            </body>
            </html>
            `;

            // Email options for the customer
            const mailOptionsCustomer = {
                to: updatedOrder.contactDetails.email,
                subject: `Refund Processed - Order #${updatedOrder.orderNumber}`,
                html: emailTemplate
            };

            // Email options for the owner/admin
            const mailOptionsOwner = {
                to: 'zextons.co.uk@gmail.com',
                subject: `Refund Processed - Order #${updatedOrder.orderNumber}`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f7f7f7;
                                margin: 0;
                                padding: 0;
                                color: #333;
                            }
                            .container {
                                max-width: 600px;
                                margin: 20px auto;
                                background-color: #ffffff;
                                padding: 20px;
                                border-radius: 8px;
                                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                            }
                            .header {
                                background-color: #dc2626;
                                color: #ffffff;
                                padding: 10px 20px;
                                border-radius: 8px 8px 0 0;
                            }
                            .header h1 {
                                margin: 0;
                                font-size: 24px;
                            }
                            .content {
                                padding: 20px;
                            }
                            .order-details {
                                margin-bottom: 20px;
                            }
                            .order-details h2 {
                                font-size: 18px;
                                margin: 0;
                                color: #dc2626;
                            }
                            .order-summary {
                                background-color: #fef3c7;
                                padding: 10px;
                                border-radius: 8px;
                                margin-bottom: 20px;
                            }
                            .order-summary p {
                                margin: 8px 0;
                            }
                            .footer {
                                font-size: 12px;
                                color: #777;
                                text-align: center;
                                margin-top: 20px;
                            }
                        </style>
                        <title>Refund Processed Notification</title>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Refund Processed</h1>
                            </div>
                            <div class="content">
                                <p>A refund has been processed for order placed by ${updatedOrder.shippingDetails.firstName} ${updatedOrder.shippingDetails.lastName}.</p>
                                <div class="order-details">
                                    <h2>Order Number: ${updatedOrder.orderNumber}</h2>
                                    <p><strong>Customer Name:</strong> ${updatedOrder.shippingDetails.firstName} ${updatedOrder.shippingDetails.lastName}</p>
                                    <p><strong>Customer Email:</strong> ${updatedOrder.contactDetails.email}</p>
                                    <p><strong>Refund Type:</strong> ${refundType === 'full' ? 'Full Refund' : 'Partial Refund'}</p>
                                    <p><strong>Refund Amount:</strong> £${parseFloat(refundAmount).toFixed(2)}</p>
                                    ${updatedOrder.reason ? `<p><strong>Reason:</strong> ${updatedOrder.reason}</p>` : ''}
                                </div>

                                <div class="order-summary">
                                    <h3>Order Details:</h3>
                                    <ul>
                                        ${updatedOrder.cart.map(item => {
                                            // Parse the name to extract: Condition-ColorName (hex)-Storage
                                            const match = item.name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                                            const condition = match ? match[1] : 'Unknown';
                                            const colorName = match ? match[2] : 'Unknown';
                                            const colorHex = match ? match[3] : '';
                                            const storage = match ? match[4] : 'Unknown';
                                            const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                                            return `
                                                <li style="margin-bottom: 15px;">
                                                    <strong>Product:</strong> ${item.productName} <br>
                                                    <strong>Condition:</strong> ${condition} <br>
                                                    <strong>Quantity:</strong> ${item.qty} <br>
                                                    <strong>Color:</strong> ${colorName} <br>
                                                    <strong>Storage:</strong> ${storage} <br>
                                                    <strong>Item Subtotal:</strong> £${itemSubtotal} <br>
                                                </li>
                                            `;
                                        }).join('')}
                                    </ul>
                                </div>
                            </div>

                            <div class="footer">
                                <p>&copy; 2024 Zextons Limited. All Rights Reserved.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            sendMail(mailOptionsCustomer).then(
                (info) => console.log('Refund email sent to customer:', info.response || info.messageId),
                (error) => console.log('Error sending refund email to customer:', error)
            );

            sendMail(mailOptionsOwner).then(
                (info) => console.log('Refund email sent to owner:', info.response || info.messageId),
                (error) => console.log('Error sending refund email to owner:', error)
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

        // If status is 'Shipped', send emails for each order
        if (status === 'Shipped') {
            // Fetch all updated orders for email sending
            const updatedOrders = await Order.find({ _id: { $in: orderIds } });

            // Send emails asynchronously (don't wait for all to complete)
            updatedOrders.forEach(order => {
                // Generate the list of products in HTML format
                const productList = order.cart.map(item => {
                    const match = item.name?.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                    const condition = match ? match[1] : 'Unknown';
                    const colorName = match ? match[2] : 'Unknown';
                    const storage = match ? match[4] : 'Unknown';
                    const itemSubtotal = (item.qty * item.salePrice).toFixed(2);

                    return `
                        <li style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
                            <strong>${item.productName}</strong><br>
                            <span style="color: #666;">Condition: ${condition}</span><br>
                            <span style="color: #666;">Quantity: ${item.qty}</span><br>
                            <span style="color: #666;">Color: ${colorName}</span><br>
                            <span style="color: #666;">Storage: ${storage}</span><br>
                            <span style="color: #16a34a; font-weight: bold;">Item Subtotal: £${itemSubtotal}</span>
                        </li>
                    `;
                }).join('');

                const emailTemplate = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Order Shipped</title>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f5f5f5; color: #000; margin: 0; padding: 20px; }
                        .container { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); max-width: 600px; margin: 0 auto; }
                        .header { background-color: #16a34a; padding: 20px; text-align: center; color: #fff; }
                        .header h1 { margin: 0; }
                        .content { padding: 20px; }
                        .content p { font-size: 16px; line-height: 1.5; }
                        .tracking-link { display: inline-block; background-color: #16a34a; color: #fff !important; padding: 10px 15px; border-radius: 5px; text-decoration: none; }
                        .tracking-link:hover { background-color: #128e3b; }
                        .footer { background-color: #16a34a; color: #fff; padding: 20px; text-align: center; font-size: 14px; }
                        .footer p { margin: 5px 0; }
                    </style>
                </head>
                <body>
                <div class="container">
                    <div class="header"><h1>Order Shipped!</h1></div>
                    <div class="content">
                        <p>Hi ${order.shippingDetails?.firstName || 'Customer'},</p>
                        <p>Your order has been shipped and is on its way to you. Below are the details of your shipment:</p>
                        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                        <p><strong>Product(s):</strong></p>
                        <ul>${productList}</ul>
                        <p><strong>Carrier:</strong> ${order.shippingDetails?.provider || 'N/A'}</p>
                        <p><strong>Tracking Number:</strong> ${order.shippingDetails?.trackingNumber || 'N/A'}</p>
                        <p>You can track your package using the link below:</p>
                        <a href="https://www.royalmail.com/track-your-item#/${order.shippingDetails?.trackingNumber || ''}" class="tracking-link">Track Your Order</a>
                        <p>Thank you for shopping with Zexton Tech Store!</p>
                    </div>
                    <div class="footer">
                        <p>Zexton Tech Store</p>
                        <p>27 Church Street, St Helens, WA10 1AX</p>
                        <p>Email: hello@zextons.co.uk | Phone: +44 333 344 8541</p>
                    </div>
                </div>
                </body>
                </html>
                `;

                const mailOptions = {
                    to: order.contactDetails?.email,
                    subject: 'Your Order Has Shipped!',
                    html: emailTemplate
                };

                sendMail(mailOptions).then(
                    (info) => console.log(`Shipment email sent for order ${order.orderNumber}:`, info.response || info.messageId),
                    (error) => console.log(`Error sending shipment email for order ${order.orderNumber}:`, error)
                );
            });
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
