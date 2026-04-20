// cronjob/failedOrderEmailJob.js
const Order = require("../src/models/order");
const nodemailer = require("nodemailer");

/**
 * Cron job to send recovery emails to users with failed orders after 2 days
 */
const sendFailedOrderEmails = async () => {
    try {
        console.log('🔄 Starting failed order email job...');

        // Calculate date range: 2 days ago (48 hours ago to 72 hours ago)
        const now = new Date();
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        // Set to start and end of the day for accurate filtering
        const startDate = new Date(twoDaysAgo.setHours(0, 0, 0, 0));
        const endDate = new Date(twoDaysAgo.setHours(23, 59, 59, 999));

        console.log(`📅 Looking for failed orders between ${startDate.toISOString()} and ${endDate.toISOString()}`);

        // Find failed orders created exactly 2 days ago
        const failedOrders = await Order.find({
            status: 'Failed',
            isdeleted: false,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).lean();

        console.log(`📊 Found ${failedOrders.length} failed orders from 2 days ago`);

        if (failedOrders.length === 0) {
            console.log('✅ No failed orders to process');
            return { success: true, processed: 0 };
        }

        // Setup nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 465,
            secure: true,
            auth: {
                user: '7da4db001@smtp-brevo.com',
                pass: 'UbpWm568BQ4M1tfI',
            },
        });

        let successCount = 0;
        let failCount = 0;

        // Process each failed order
        for (const order of failedOrders) {
            try {
                const customerEmail = order.contactDetails?.email;
                const customerName = order.shippingDetails?.firstName || 'Valued Customer';
                const orderNumber = order.orderNumber;

                if (!customerEmail) {
                    console.log(`⚠️ Skipping order ${orderNumber} - no email found`);
                    failCount++;
                    continue;
                }

                // Calculate cart total
                const cartTotal = order.cart.reduce((sum, item) => {
                    return sum + (item.qty || 0) * (item.salePrice || item.Price || 0);
                }, 0);

                // Generate product list HTML
                const productList = order.cart.map(item => {
                    return `<li style="padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                        <strong>${item.productName}</strong> (x${item.qty}) - £${item.salePrice}
                    </li>`;
                }).join('');

                // Email template
                const emailTemplate = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Complete Your Order</title>
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
                            padding: 30px;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                            max-width: 600px;
                            margin: 0 auto;
                        }
                        .header {
                            background-color: #ff9800;
                            padding: 20px;
                            text-align: center;
                            color: #fff;
                            border-radius: 8px 8px 0 0;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 24px;
                        }
                        .content {
                            padding: 20px;
                        }
                        .content p {
                            font-size: 16px;
                            line-height: 1.6;
                            color: #333;
                        }
                        .order-summary {
                            background-color: #f9f9f9;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                        .order-summary h3 {
                            margin-top: 0;
                            color: #ff9800;
                        }
                        .product-list {
                            list-style: none;
                            padding: 0;
                            margin: 15px 0;
                        }
                        .cta-button {
                            display: inline-block;
                            background-color: #16a34a;
                            color: #fff !important;
                            padding: 15px 30px;
                            border-radius: 5px;
                            text-decoration: none;
                            font-weight: bold;
                            margin: 20px 0;
                            text-align: center;
                        }
                        .cta-button:hover {
                            background-color: #128e3b;
                        }
                        .footer {
                            background-color: #333;
                            color: #fff;
                            padding: 20px;
                            text-align: center;
                            font-size: 14px;
                            border-radius: 0 0 8px 8px;
                            margin-top: 20px;
                        }
                        .footer p {
                            margin: 5px 0;
                            color: #fff;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Don't Miss Out!</h1>
                        </div>
                        <div class="content">
                            <p>Hi ${customerName},</p>

                            <p>We noticed that your order <strong>#${orderNumber}</strong> wasn't completed. Your items are still waiting for you!</p>

                            <div class="order-summary">
                                <h3>Your Cart Summary</h3>
                                <ul class="product-list">
                                    ${productList}
                                </ul>
                                <p style="font-size: 18px; font-weight: bold; color: #16a34a; margin-top: 15px;">
                                    Total: £${cartTotal.toFixed(2)}
                                </p>
                            </div>

                            <p>Complete your purchase now and get your items delivered to your doorstep!</p>

                            <div style="text-align: center;">
                                <a href="https://zextons.co.uk/checkout" class="cta-button">
                                    Complete Your Order Now
                                </a>
                            </div>

                            <p>If you encountered any issues during checkout or have questions, please don't hesitate to contact our support team. We're here to help!</p>

                            <p style="margin-top: 30px;">Best regards,<br><strong>Zexton Tech Store Team</strong></p>
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

                // Send email
                await transporter.sendMail({
                    from: '"Zextons Tech Store" <order@zextons.co.uk>',
                    to: customerEmail,
                    subject: '🛒 Complete Your Order - Your Items Are Waiting!',
                    html: emailTemplate
                });

                console.log(`✅ Sent recovery email to ${customerEmail} for order ${orderNumber}`);
                successCount++;

            } catch (emailError) {
                console.error(`❌ Error sending email for order ${order.orderNumber}:`, emailError.message);
                failCount++;
            }
        }

        console.log(`\n📧 Email Job Complete:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);
        console.log(`   📊 Total: ${failedOrders.length}\n`);

        return {
            success: true,
            processed: failedOrders.length,
            sent: successCount,
            failed: failCount
        };

    } catch (error) {
        console.error('❌ Failed order email job error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = { sendFailedOrderEmails };
