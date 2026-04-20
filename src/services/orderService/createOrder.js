// ============================================================================
// ORDER SERVICE - Main order creation and processing
// ============================================================================
// This service handles:
// - Order creation and updates
// - Coupon validation and usage tracking
// - Inventory management (stock reduction)
// - Email notifications (customer, admin, Trustpilot)
// ============================================================================

const Order = require("../../models/order");
const Product = require("../../models/product");
const Coupon = require("../../models/coupon");
const nodemailer = require("nodemailer");
const path = require('path');
const fs = require('fs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const EMAIL_CONFIG = {
    host: 'smtp-relay.brevo.com',
    port: 465,
    secure: true,
    auth: {
        user: '7da4db001@smtp-brevo.com',
        pass: 'UbpWm568BQ4M1tfI',
    },
};

const EMAIL_ADDRESSES = {
    from: '"Zextons Tech Store" <order@zextons.co.uk>',
    admin: 'order@zextons.co.uk',
    trustpilot: '9311f649e0@invite.trustpilot.com',
};

// ============================================================================
// HELPER FUNCTIONS - Coupon Management
// ============================================================================

/**
 * Check if a user has already used a specific coupon
 * @param {string} userId - The user ID
 * @param {string} couponCode - The coupon code to check
 * @returns {Promise<boolean>} True if coupon was already used
 */
const hasUserUsedCoupon = async (userId, couponCode) => {
    try {
        console.log("userId", userId);
        console.log("couponCode", couponCode);

        const order = await Order.findOne({
            "contactDetails.userId": userId,
            "coupon.code": couponCode,
            "status": { $ne: "Failed" },
        });

       console.log("order found", order);

        return !!order;
    } catch (error) {
        console.error("Error checking coupon usage:", error);
        throw new Error("Internal server error while checking coupon usage.");
    }
};

/**
 * Update coupon usage count and history
 * @param {string} couponCode - The coupon code
 * @param {string} userId - The user ID
 * @param {string} orderId - The order ID
 * @returns {Promise<boolean>} True if successful
 */
const updateCouponUsage = async (couponCode, userId, orderId) => {
    try {
        if (!couponCode || !userId || !orderId) {
            console.log("Missing required parameters for updating coupon usage");
            return false;
        }

        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon) {
            console.log(`Coupon with code ${couponCode} not found`);
            return false;
        }

        coupon.used = (coupon.used || 0) + 1;

        if (!coupon.usageHistory) {
            coupon.usageHistory = [];
        }

        coupon.usageHistory.push({
            userId: userId,
            orderId: orderId,
            usedAt: new Date()
        });

        await coupon.save();
        console.log(`Coupon ${couponCode} usage updated for user ${userId} and order ${orderId}`);
        return true;
    } catch (error) {
        console.error("Error updating coupon usage:", error);
        return false;
    }
};

// ============================================================================
// HELPER FUNCTIONS - Inventory Management
// ============================================================================

/**
 * Reduce product variant quantities when order is confirmed
 * Handles single products, single-variant products, and multi-variant products
 * Skips trade-in products as they don't have physical inventory
 *
 * @param {Array} cart - The cart items array
 * @returns {Promise<Array>} Array of update results
 */
const reduceVariantQuantities = async (cart) => {
    try {
        console.log("🔄 Starting to reduce variant quantities...");

        const updateResults = [];

        for (const item of cart) {
            try {
                const { productId, SKU, EIN, name, qty } = item;

                // Skip trade-in products - they don't have stock to reduce
                if (item.isTradeIn || productId === 'trade-in') {
                    console.log(`⏭️ Skipping trade-in product: ${item.name || item.productName}`);
                    continue;
                }

                // Validate required fields
                if (!productId) {
                    console.log(`⚠️ Skipping item - missing productId:`, item.productName || 'Unknown');
                    continue;
                }

                if (!qty || qty <= 0) {
                    console.log(`⚠️ Skipping item - invalid quantity:`, qty);
                    continue;
                }

                // Find the product by ID
                const product = await Product.findById(productId);

                if (!product) {
                    console.log(`❌ Product not found for ID: ${productId}`);
                    continue;
                }

                // Check if this is a single product (no variants) or a variant-based product
                const isSingleProduct = !product.variantValues || product.variantValues.length === 0;
                const isSingleVariantProduct = product.variantValues && product.variantValues.length === 1;

                let variant = null;
                let variantIndex = -1;
                let currentQuantity = 0;

                if (isSingleProduct) {
                    // Handle single product (no variants at all)
                    console.log(`📦 Processing single product: ${product.name}`);
                    currentQuantity = product.Quantity || 0;
                    // Create a pseudo-variant object for consistent processing
                    variant = {
                        _id: product._id,
                        name: product.name,
                        SKU: product.SKU,
                        Quantity: currentQuantity
                    };
                } else if (isSingleVariantProduct) {
                    // Handle products with only one variant (e.g., variant name = "single")
                    console.log(`📦 Processing single-variant product: ${product.name}`);
                    variantIndex = 0; // Only one variant, so use index 0
                    variant = product.variantValues[0];
                    currentQuantity = variant.Quantity || 0;
                } else {
                    // Handle variant-based product
                    const variantId = item.variantId || item._id;

                    // First try matching by variantId/_id (most accurate)
                    if (variantId) {
                        variantIndex = product.variantValues.findIndex(v =>
                            v._id && v._id.toString() === variantId.toString()
                        );
                    }

                    // Fallback to SKU matching
                    if (variantIndex === -1 && SKU) {
                        variantIndex = product.variantValues.findIndex(v => v.SKU === SKU);
                    }

                    // Fallback to EIN matching
                    if (variantIndex === -1 && EIN) {
                        variantIndex = product.variantValues.findIndex(v => v.EIN === EIN);
                    }

                    // Fallback to name matching
                    if (variantIndex === -1 && name) {
                        variantIndex = product.variantValues.findIndex(v => v.name === name);
                    }

                    if (variantIndex === -1) {
                        console.log(`❌ Variant not found in product ${product.name}`);
                        console.log(`   Looking for - VariantId: ${variantId}, SKU: ${SKU}, EIN: ${EIN}, Name: ${name}`);
                        continue;
                    }

                    // Get the variant
                    variant = product.variantValues[variantIndex];
                    currentQuantity = variant.Quantity || 0;
                }

                // Check if enough stock is available
                if (currentQuantity < qty) {
                    console.log(`⚠️ Warning: Insufficient stock for ${product.name} - ${variant.name}`);
                    console.log(`   Available: ${currentQuantity}, Ordered: ${qty}`);
                }

                // Calculate new quantity (ensure it doesn't go negative)
                const newQuantity = Math.max(0, currentQuantity - qty);

                console.log(`📦 Reducing quantity for: ${product.name}`);
                console.log(`   Variant: ${variant.name}`);
                console.log(`   Variant ID: ${variant._id}`);
                console.log(`   SKU: ${variant.SKU}`);
                console.log(`   Current Quantity: ${currentQuantity}`);
                console.log(`   Ordered Quantity: ${qty}`);
                console.log(`   New Quantity: ${newQuantity}`);

                // Update the quantity based on product type
                if (isSingleProduct) {
                    // Update single product quantity (no variants at all)
                    product.Quantity = newQuantity;

                    // Optional: Mark product as out of stock if quantity reaches 0
                    if (newQuantity === 0) {
                        product.status = false;
                        console.log(`   🔴 Product marked as OUT OF STOCK`);
                    }
                } else if (isSingleVariantProduct) {
                    // Update single-variant product (has 1 variant in array)
                    product.variantValues[0].Quantity = newQuantity;

                    // Optional: Mark variant as out of stock if quantity reaches 0
                    if (newQuantity === 0) {
                        product.variantValues[0].status = false;
                        console.log(`   🔴 Variant marked as OUT OF STOCK`);
                    }

                    // Use markModified to ensure Mongoose tracks the nested array change
                    product.markModified('variantValues');
                } else {
                    // Update multi-variant product
                    product.variantValues[variantIndex].Quantity = newQuantity;

                    // Optional: Mark variant as out of stock if quantity reaches 0
                    if (newQuantity === 0) {
                        product.variantValues[variantIndex].status = false;
                        console.log(`   🔴 Variant marked as OUT OF STOCK`);
                    }

                    // Use markModified to ensure Mongoose tracks the nested array change
                    product.markModified('variantValues');
                }

                // Save the product
                await product.save();

                updateResults.push({
                    productName: product.name,
                    variantName: variant.name,
                    SKU: variant.SKU,
                    previousQuantity: currentQuantity,
                    reducedBy: qty,
                    newQuantity: newQuantity,
                    markedOutOfStock: newQuantity === 0
                });

                console.log(`   ✅ Successfully updated`);

            } catch (itemError) {
                console.error(`❌ Error processing item:`, itemError);
                // Continue with next item even if one fails
            }
        }

        console.log(`\n✅ Quantity reduction complete!`);
        console.log(`   Successfully updated: ${updateResults.length} variants`);

        return updateResults;

    } catch (error) {
        console.error("❌ Error in reduceVariantQuantities:", error);
        throw error;
    }
};

// ============================================================================
// HELPER FUNCTIONS - Order Calculations
// ============================================================================

/**
 * Calculate total order value excluding trade-in products
 * @param {Array} cart - The cart items
 * @returns {number} Total order value
 */
const calculateOrderTotal = (cart) => {
    return cart
        .filter(item => !item.isTradeIn && item.productId !== 'trade-in')
        .reduce((sum, item) => sum + (item.qty || 0) * (item.salePrice || item.Price || 0), 0);
};

/**
 * Calculate discount amount based on coupon type
 * @param {number} totalValue - The order total value
 * @param {Object} coupon - The coupon object
 * @returns {number} Discount amount
 */
const calculateDiscount = (totalValue, coupon) => {
    if (!coupon) return 0;

    if (coupon.discount_type === "flat") {
        return coupon.discount;
    } else if (coupon.discount_type === "percentage") {
        const percentageDiscount = (totalValue * coupon.discount) / 100;
        return coupon.upto ? Math.min(percentageDiscount, coupon.upto) : percentageDiscount;
    }

    return 0;
};

/**
 * Generate next order number for the current year
 * @returns {Promise<string>} New order number
 */
const generateOrderNumber = async () => {
    const currentYear = new Date().getFullYear();
    const lastOrder = await Order.findOne({ orderNumber: { $regex: `^Z${currentYear}` } })
        .sort({ createdAt: -1 })
        .exec();

    if (lastOrder) {
        const lastOrderNumber = parseInt(lastOrder.orderNumber.slice(5), 10);
        return `Z${currentYear}${String(lastOrderNumber + 1).padStart(4, '0')}`;
    } else {
        return `Z${currentYear}0001`;
    }
};

// ============================================================================
// HELPER FUNCTIONS - Email Templates
// ============================================================================

/**
 * Generate cart items HTML for email template
 * @param {Array} cart - The cart items
 * @returns {string} HTML string
 */
const generateCartItemsHTML = (cart) => {
    return cart.map(item => {
        // Check if this is a trade-in product - Display differently, no parsing needed
        if (item.isTradeIn || item.productId === 'trade-in') {
            return `
                <tr>
                    <td class="pc-w620-halign-left pc-w620-valign-middle pc-w620-width-100pc" align="left" valign="middle" style="padding: 20px 0px 20px 0px; border-bottom: 1px solid #e7e7d2b3; background-color: #f0fdf4;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                                <td valign="top" style="padding: 0px 0px 0px 0px;">
                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                        <tr>
                                            <td class="pc-w620-align-left" valign="top" style="padding: 0px 0px 0px 0px;">
                                                <div class="pc-font-alt" style="line-height: 24px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; color: #16a34a;">
                                                    <div><span>Trade-In Device</span></div>
                                                </div>
                                                <div class="pc-font-alt" style="line-height: 24px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; color: #121212cc; margin-top: 5px;">
                                                    <div><span>${item.name}</span></div>
                                                </div>
                                                <div class="pc-font-alt" style="line-height: 24px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; color: #1d3425cc;">
                                                    <div><span>Condition: ${item.tradeInData?.conditionName || 'N/A'}</span></div>
                                                    <div><span>Trade-In Credit Applied</span></div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td class="pc-w620-halign-right pc-w620-valign-middle" align="right" valign="middle" style="padding: 0px 0px 0px 0px; border-bottom: 1px solid #e7e7d2b3; background-color: #f0fdf4;">
                        <div class="pc-font-alt" style="line-height: 22px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 800; color: #16a34a;">
                            <div><span>Credit</span></div>
                        </div>
                    </td>
                </tr>
            `;
        }

        // Parse regular products - Extract Condition-ColorName (hex)-Storage from name
        const itemName = item.name || item.productName || 'Unknown Product';
        const match = itemName.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
        const condition = match ? match[1] : 'Unknown';
        const colorName = match ? match[2] : 'Unknown';
        const colorHex = match ? match[3] : '';
        const storage = match ? match[4] : 'Unknown';

        let variantImagePath = null;
        if (item.variantImages && item.variantImages.length > 0) {
            item.variantImages.forEach(image => {
                variantImagePath = image.path;
            });
        }

        return `
            <tr>
                <td class="pc-w620-halign-left pc-w620-valign-middle pc-w620-width-100pc" align="left" valign="middle" style="padding: 20px 0px 20px 0px; border-bottom: 1px solid #e7e7d2b3;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                            <td valign="top" style="padding: 0px 0px 0px 0px;">
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                    <tr>
                                        <td class="pc-w620-align-left" valign="top" style="padding: 0px 0px 0px 0px;">
                                            <table class="pc-w620-view-vertical pc-w620-align-left" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                <tr>
                                                    <th valign="top" style="font-weight: normal; text-align: left;">
                                                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                            <tr>
                                                                <td class="pc-w620-spacing-0-0-0-0" valign="top" style="padding: 0px 0px 0px 0px;">
                                                                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                                        <tr>
                                                                            <td class="pc-w620-padding-8-0-0-0 pc-w620-align-left" valign="top" style="padding: 28px 0px 0px 0px;">
                                                                                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                                                                                    <tr>
                                                                                        <th class="pc-w620-align-left" align="left" valign="top" style="font-weight: normal; text-align: left; padding: 0px 0px 2px 0px;">
                                                                                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                                                                                                <tr>
                                                                                                    <td valign="top" class="pc-w620-align-left" align="left" style="padding: 0px 0px 0px 0px;">
                                                                                                        <div class="pc-font-alt pc-w620-align-left pc-w620-fontSize-16 pc-w620-lineHeight-26" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; font-variant-ligatures: normal; color: #121212cc; text-align: left; text-align-last: left;">
                                                                                                            <div><span>${item.productName}</span>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            </table>
                                                                                        </th>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <th class="pc-w620-align-left" align="left" valign="top" style="font-weight: normal; text-align: left;">
                                                                                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                                                                                                <tr>
                                                                                                    <td valign="top" class="pc-w620-align-left" align="left">
                                                                                                        <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; font-variant-ligatures: normal; color: #1d3425cc; text-align: left; text-align-last: left;">
                                                                                                            <div><span>Condition: ${condition}</span></div>
                                                                                                            <div><span>Quantity: ${item.qty}</span></div>
                                                                                                            <div><span>Color: ${colorName}</span></div>
                                                                                                            <div><span>Storage: ${storage}</span></div>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            </table>
                                                                                        </th>
                                                                                    </tr>
                                                                                </table>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </th>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="pc-w620-halign-right pc-w620-valign-middle" align="right" valign="middle" style="padding: 0px 0px 0px 0px; border-bottom: 1px solid #e7e7d2b3;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                            <td class="pc-w620-spacing-0-0-0-0 pc-w620-align-right" align="right" valign="top">
                                <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-right" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                                    <tr>
                                        <td valign="top" class="pc-w620-padding-0-0-0-0 pc-w620-align-right" align="right">
                                            <div class="pc-font-alt pc-w620-align-right pc-w620-fontSize-16 pc-w620-lineHeight-20" style="line-height: 22px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 800; font-variant-ligatures: normal; color: #1d3425; text-align: right; text-align-last: right;">
                                                <div><span>£${item.salePrice}</span></div>
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
    }).join('');
};

/**
 * Generate email HTML for admin notification
 * @param {Object} params - Order parameters
 * @returns {string} HTML string
 */
const generateAdminEmailHTML = ({ orderNumber, savedOrder, order, shippingInformation, contactInformation, totalOrderValue, coupon, discountAmount, discountedOrderValue, cart }) => {
    return `
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
                    background-color: #16a34a;
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
                    color: #16a34a;
                }
                .order-summary {
                    background-color: #f1f1f1;
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
                .footer a {
                    color: #16a34a;
                    text-decoration: none;
                }
            </style>
            <title>New Order Notification</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Order Placed!</h1>
                </div>
                <div class="content">
                    <p>A new order has been placed by ${shippingInformation.firstName} ${shippingInformation.lastName}.</p>
                    <div class="order-details">
                        <h2>Order Number: ${orderNumber}</h2>
                        <p><strong>Order Date:</strong> ${(savedOrder || order).createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <p><strong>Order Status:</strong> ${(savedOrder || order).status}</p>
                        <p><strong>Customer Name:</strong> ${shippingInformation.firstName} ${shippingInformation.lastName}</p>
                        <p><strong>Email:</strong> ${contactInformation.email}</p>
                        <p><strong>Phone:</strong> ${shippingInformation.phoneNumber}</p>
                        <p><strong>Shipping Address:</strong> ${shippingInformation.address}, ${shippingInformation.city}, ${shippingInformation.postalCode}, ${shippingInformation.country}</p>
                        <p><strong>Total Order Value:</strong> £${totalOrderValue.toFixed(2)}</p>
                        ${
                          coupon
                            ? `<p><strong>Coupon Applied:</strong> ${coupon.code} (${coupon.discount_type === 'flat' ? `£${coupon.discount} off` : `${coupon.discount}% off${coupon.upto ? ` (max £${coupon.upto})` : ''}`})</p>
                               <p><strong>Discount Amount:</strong> -£${discountAmount.toFixed(2)}</p>
                               <p><strong>Final Order Total:</strong> £${discountedOrderValue.toFixed(2)}</p>`
                            : ''
                        }
                    </div>

                    <div class="order-summary">
                        <h3>Order Details:</h3>
                        <ul>
                            ${cart.map(item => {
                                // Check if trade-in product - Display differently, skip parsing
                                if (item.isTradeIn || item.productId === 'trade-in') {
                                    return `
                                    <li style="background-color: #f0fdf4; padding: 10px; border-left: 4px solid #16a34a;">
                                        <strong style="color: #16a34a;">Trade-In Device</strong> <br>
                                        <strong>Device:</strong> ${item.name} <br>
                                        <strong>Condition:</strong> ${item.tradeInData?.conditionName || 'N/A'} <br>
                                        <strong>Trade-In Credit:</strong> Recorded for reference <br>
                                    </li>
                                    <br>
                                `;
                                }

                                // Parse regular products
                                const match = item.name.match(/(.*?)-(.+?) \((.+?)\)-(\d+GB)/);
                                const condition = match ? match[1] : 'Unknown';
                                const colorName = match ? match[2] : 'Unknown';
                                const colorHex = match ? match[3] : '';
                                const storage = match ? match[4] : 'Unknown';

                                return `
                                <li>
                                    <strong>Product:</strong> ${item.productName} <br>
                                    <strong>Condition:</strong> ${condition} <br>
                                    <strong>Color:</strong> ${colorName} <br>
                                    <strong>Storage:</strong> ${storage}GB <br>
                                    <strong>SKU:</strong> ${item.SKU || 'N/A'} <br>
                                    <strong>EIN:</strong> ${item.EIN || 'N/A'} <br>
                                    <strong>Quantity:</strong> ${item.qty} <br>
                                    <strong>Unit Price:</strong> £${item.salePrice} <br>
                                    <strong>Subtotal:</strong> £${(item.qty * item.salePrice).toFixed(2)} <br>
                                </li>
                                <br>
                            `}).join('')}
                        </ul>
                    </div>
                </div>

                <div class="footer">
                    <p>&copy; 2024 Zextons Limited. All Rights Reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

/**
 * Generate email HTML for customer notification
 * Trade-in products are excluded from customer emails
 * @param {Object} params - Order parameters
 * @returns {string} HTML string with Trustpilot script
 */
const generateCustomerEmailHTML = ({ orderNumber, cart, totalOrderValue, coupon, discountAmount, discountedOrderValue, totalItems, shippingInformation, contactInformation }) => {
    // Read the HTML email template
    const emailTemplatePath = path.join(__dirname, '..', '..', 'email', 'orderConfermation', 'index.html');
    let emailTemplate = fs.readFileSync(emailTemplatePath, 'utf8');

    // Filter out trade-in products - customers don't need to see trade-in items in their order confirmation
    // Trade-in details are handled separately via SellZextons checkout
    const regularProductsOnly = cart.filter(item => !item.isTradeIn && item.productId !== 'trade-in');

    // Generate cart items HTML (excluding trade-ins)
    const cartItemsHTML = generateCartItemsHTML(regularProductsOnly);
    emailTemplate = emailTemplate.replace('{{cartItems}}', cartItemsHTML);

    // Add order number
    const ordernumberHTML = `
        <div><span style="color: rgb(13, 35, 28);">Confirmation number:</span><span style="color: rgb(29, 52, 37);"> </span><span style="color: rgb(35, 174, 96);">${orderNumber}</span>
        </div>
    `;
    emailTemplate = emailTemplate.replace('{{ordernumber}}', ordernumberHTML);

    // Generate subtotal section
    const subtotal = `
         <tr>
                <td class="pc-w620-halign-left pc-w620-valign-middle pc-w620-width-100pc" align="left" valign="middle" style="padding: 20px 0px 20px 0px; border-bottom: 1px solid #e7e7d2cc;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                    <td class="pc-w620-align-left" align="left" valign="top" style="padding: 0px 0px 2px 0px;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                        <tr>
                        <td valign="top" class="pc-w620-align-left" align="left">
                        <div class="pc-font-alt pc-w620-align-left" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; font-variant-ligatures: normal; color: #121212cc; text-align: left; text-align-last: left;">
                        <div><span>Subtotal</span>
                        </div>
                        </div>
                        </td>
                        </tr>
                    </table>
                    </td>
                    </tr>
                    </table>
                    ${coupon ? `
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                    <td class="pc-w620-align-left" align="left" valign="top" style="padding: 0px 0px 2px 0px;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                        <tr>
                        <td valign="top" class="pc-w620-align-left" align="left" style="padding: 0px 0px 0px 0px;">
                        <div class="pc-font-alt pc-w620-align-left pc-w620-lineHeight-24" style="line-height: 24px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; font-variant-ligatures: normal; color: #1d3425; text-align: left; text-align-last: left;">
                        <div><span>Discount (${coupon.code})</span>
                        </div>
                        </div>
                        </td>
                        </tr>
                    </table>
                    </td>
                    </tr>
                    </table>
                    ` : ''}
                </td>
                <td class="pc-w620-halign-right pc-w620-valign-middle" align="right" valign="bottom" style="padding: 0px 0px 20px 0px; border-bottom: 1px solid #e7e7d2cc;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                    <td class="pc-w620-spacing-0-0-0-40" valign="top" style="padding: 0px 0px 0px 0px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                        <td class="pc-w620-padding-0-0-0-0" valign="top" align="right" style="padding: 0px 0px 0px 0px;">
                        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                            <th align="right" valign="top" style="font-weight: normal; text-align: left; padding: 0px 0px 2px 0px;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                            <tr>
                            <td valign="top" align="right" style="padding: 0px 0px 0px 0px;">
                                <div class="pc-font-alt" style="line-height: 140%; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 800; font-variant-ligatures: normal; color: #1c3425; text-align: right; text-align-last: right;">
                                <div><span>£${totalOrderValue}</span>
                                </div>
                                </div>
                            </td>
                            </tr>
                            </table>
                            </th>
                        </tr>
                        ${coupon ? `
                        <tr>
                            <th class="pc-w620-spacing-0-0-2-0" align="right" valign="top" style="font-weight: normal; text-align: left; padding: 0px 0px 2px 0px;">
                            <table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                            <tr>
                            <td valign="top" class="pc-w620-padding-0-0-0-0" align="right" style="padding: 0px 0px 0px 0px;">
                                <div class="pc-font-alt" style="line-height: 140%; letter-spacing: 0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 600; font-variant-ligatures: normal; color: #ff5c5c; text-align: right; text-align-last: right;">
                                <div><span>-£${discountAmount.toFixed(2)}</span>
                                </div>
                                </div>
                            </td>
                            </tr>
                            </table>
                            </th>
                        </tr>
                        ` : ''}
                        </table>
                        </td>
                        </tr>
                    </table>
                    </td>
                    </tr>
                    </table>
                </td>
                </tr>
     `;
    emailTemplate = emailTemplate.replace('{{subtotal}}', subtotal);

    // Generate complete total section
    const completetotal = `
        <tr align="left" valign="middle">
        <td class="pc-w620-halign-left pc-w620-valign-middle pc-w620-width-100pc" align="left" valign="middle" style="padding: 20px 0px 20px 0px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
            <td class="pc-w620-spacing-20-0-0-0 pc-w620-align-left" align="left" valign="top">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" class="pc-w620-align-left" width="100%" style="border-collapse: separate; border-spacing: 0; margin-right: auto; margin-left: auto;">
                <tr>
                <td valign="top" class="pc-w620-padding-0-0-0-0 pc-w620-align-left" align="left">
                <div class="pc-font-alt pc-w620-align-left pc-w620-fontSize-16 pc-w620-lineHeight-20" style="line-height: 22px; letter-spacing: -0px; font-family: 'Urbanist', Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; font-variant-ligatures: normal; color: #1d3425; text-align: left; text-align-last: left;">
              <div><span>Total (${totalItems} item${totalItems > 1 ? 's' : ''})</span></div>
              ${coupon ? `<div style="font-size: 14px; font-weight: 600; color: #16a34a; margin-top: 5px;"><span>You saved £${discountAmount.toFixed(2)}!</span></div>` : ''}
              <div style="font-size: 18px; font-weight: 800; color: #1d3425; margin-top: 8px;"><span>Total Price: £${discountedOrderValue.toFixed(2)}</span></div>
                </div>
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
    emailTemplate = emailTemplate.replace('{{completetotal}}', completetotal);

    // Add Trustpilot structured data snippet for AFS (Automatic Feedback Service)
    // Place in <head> section as recommended by Trustpilot documentation
    const trustpilotScript = `
<script type="application/json+trustpilot">
{
    "recipientName": "${shippingInformation.firstName} ${shippingInformation.lastName}",
    "recipientEmail": "${contactInformation.email}",
    "referenceId": "${orderNumber}"
}
</script>`;

    // Insert Trustpilot script in the <head> section (after <title>)
    emailTemplate = emailTemplate.replace('</head>', `${trustpilotScript}\n</head>`);

    return emailTemplate;
};

// ============================================================================
// MAIN SERVICE - Create Order
// ============================================================================

/**
 * Main service function to create or update an order
 * @param {Object} orderData - Order data containing cart, shipping, contact info, etc.
 * @returns {Promise<Object>} Result object with success status and order data
 */
const createOrderService = async (orderData) => {
    try {
        const { cart, shippingInformation, contactInformation, coupon, paymentDetails, orderNumber, status, shippingMethod } = orderData;

        // ====================================================================
        // STEP 1: Validate Cart
        // ====================================================================
        if (!cart || cart.length === 0) {
            return {
                success: false,
                message: "Cart is empty",
                status: 400
            };
        }

        // ====================================================================
        // STEP 2: Validate Coupon Usage
        // ====================================================================
        if (coupon) {
            console.log("coupon");
            const couponUsed = await hasUserUsedCoupon(contactInformation.userId, coupon.code);

            if (couponUsed) {
                return {
                    success: false,
                    message: "You have already used this coupon.",
                    status: 400
                };
            }
        }

        // ====================================================================
        // STEP 3: Log Cart Details
        // ====================================================================
        cart.forEach(product => {
            console.log(`Product Name: ${product.productName}`);
            if (product.variantImages && product.variantImages.length > 0) {
                product.variantImages.forEach(image => {
                    // console.log(`Variant Image Filename: ${image.filename}`);
                    // console.log(`Variant Image Path: ${image.path}`);
                });
            } else {
                console.log('No variant images available');
            }
        });

        // Calculate total items in cart - Exclude trade-in products (they're not physical items being shipped)
        const totalItems = cart
            .filter(item => !item.isTradeIn && item.productId !== 'trade-in')
            .reduce((sum, item) => sum + (item.qty || 0), 0);

        // ====================================================================
        // STEP 4: Create or Update Order
        // ====================================================================
        let order, newOrderNumber, totalOrderValue, savedOrder, discountedOrderValue = 0;

        if (orderNumber) {
            // UPDATE EXISTING ORDER
            order = await Order.findOne({ orderNumber: orderNumber });

            if (!order) {
                return {
                    success: false,
                    message: "Order not found",
                    status: 404
                };
            }

            if (order.status === 'Pending') {
                return {
                    success: false,
                    message: "Order is already pending",
                    status: 400
                };
            }

            // Update the existing order details
            order.cart = cart;
            order.shippingDetails = shippingInformation;
            order.contactDetails = contactInformation;
            order.paymentDetails = paymentDetails;
            if (shippingMethod) {
                order.shippingMethod = shippingMethod;
            }

            // Calculate total order value
            totalOrderValue = calculateOrderTotal(cart);

            // Apply coupon if available
            const discountAmount = calculateDiscount(totalOrderValue, coupon);
            discountedOrderValue = Math.max(0, totalOrderValue - discountAmount);
            order.totalOrderValue = coupon ? discountedOrderValue : totalOrderValue;
            order.coupon = coupon || order.coupon;
            order.status = status || 'Failed';

            // Save the updated order
            const updatedOrder = await order.save();
            console.log("Order updated:", updatedOrder);

        } else {
            // CREATE NEW ORDER
            newOrderNumber = await generateOrderNumber();

            // Calculate total order value
            totalOrderValue = calculateOrderTotal(cart);

            const discountAmount = calculateDiscount(totalOrderValue, coupon);
            discountedOrderValue = Math.max(0, totalOrderValue - discountAmount);
            const finalOrderValue = coupon ? discountedOrderValue : totalOrderValue;

            // Create the new order
            const newOrder = new Order({
                orderNumber: newOrderNumber,
                cart,
                shippingDetails: shippingInformation,
                contactDetails: contactInformation,
                paymentDetails: paymentDetails,
                totalOrderValue: finalOrderValue,
                coupon,
                status: status || 'Failed',
                shippingMethod: shippingMethod || null,
            });

            // Save the new order to the database
            savedOrder = await newOrder.save();
            console.log("Order created:", savedOrder);
        }

        let order_number_fial = newOrderNumber || order.orderNumber;
        console.log("order_number_fial", order_number_fial);

        // Get the final order object for further processing
        const finalOrder = savedOrder || order;

        // ====================================================================
        // STEP 5: Reduce Inventory (ONLY FOR PENDING ORDERS)
        // ====================================================================
        if (finalOrder && finalOrder.status === 'Pending') {
            try {
                console.log(`\n🎯 Order ${finalOrder.orderNumber} is Pending - reducing variant quantities`);
                const reductionResults = await reduceVariantQuantities(cart);

                if (reductionResults && reductionResults.length > 0) {
                    console.log(`\n📊 Inventory Update Summary for Order ${finalOrder.orderNumber}:`);
                    reductionResults.forEach(result => {
                        console.log(`   - ${result.productName} (${result.SKU}): ${result.previousQuantity} → ${result.newQuantity}`);
                    });
                }

                console.log(`✅ Quantities reduced successfully for order ${finalOrder.orderNumber}\n`);
            } catch (error) {
                console.error(`❌ Error reducing quantities for order ${finalOrder.orderNumber}:`, error);
                // Log error but don't fail the order creation
            }
        }

        // ====================================================================
        // STEP 6: Prepare and Send Emails (ONLY FOR PENDING ORDERS)
        // ====================================================================

        // Skip email generation for non-Pending orders (e.g., Failed status)
        if (finalOrder.status !== 'Pending') {
            console.log(`⏭️ Skipping email generation - Order ${finalOrder.orderNumber} status is ${finalOrder.status}`);

            return {
                success: true,
                message: 'Order created successfully',
                order: savedOrder,
                orderNumber: finalOrder.orderNumber,
                status: 201
            };
        }

        // Calculate discount amount for email display
        const discountAmount = calculateDiscount(totalOrderValue, coupon);

        // Generate customer email HTML with Trustpilot script
        const customerEmailHTML = generateCustomerEmailHTML({
            orderNumber: order_number_fial,
            cart,
            totalOrderValue,
            coupon,
            discountAmount,
            discountedOrderValue,
            totalItems,
            shippingInformation,
            contactInformation
        });

        // Setup nodemailer transporter
        const transporter = nodemailer.createTransport(EMAIL_CONFIG);

        // Email options for the customer (with BCC to Trustpilot for review invitations)
        const mailOptionsCustomer = {
            from: EMAIL_ADDRESSES.from,
            to: contactInformation.email,
            bcc: EMAIL_ADDRESSES.trustpilot,
            subject: 'Order Confirmation - Zextons Tech Store',
            html: customerEmailHTML
        };

        // Email options for the owner
        const mailOptionsOwner = {
            from: EMAIL_ADDRESSES.from,
            to: EMAIL_ADDRESSES.admin,
            subject: `New Order Received - ${order_number_fial}`,
            html: generateAdminEmailHTML({
                orderNumber: order_number_fial,
                savedOrder,
                order,
                shippingInformation,
                contactInformation,
                totalOrderValue,
                coupon,
                discountAmount,
                discountedOrderValue,
                cart
            })
        };

        // ====================================================================
        // STEP 7: Send Email Notifications (ONLY FOR PENDING ORDERS)
        // ====================================================================
        if (finalOrder && finalOrder.status === 'Pending') {
            console.log(`\n📧 Order ${finalOrder.orderNumber} is Pending - sending confirmation emails`);
            console.log(`📧 Trustpilot will receive review invitation via BCC`);

            // If a coupon was used, update the coupon usage history
            if (coupon && (savedOrder || order)) {
                const orderId = savedOrder ? savedOrder.orderNumber : order.orderNumber;
                const userId = contactInformation.userId;

                console.log(`Coupon code ${coupon}`);

                await updateCouponUsage(coupon.code, userId, orderId);
                console.log(`Coupon usage updated for coupon ${coupon.code}, user ${userId}, order ${orderId}`);
            }

            // Send email to customer asynchronously
            transporter.sendMail(mailOptionsCustomer, (error, info) => {
                if (error) {
                    console.log("Error sending order confirmation email to customer:", error);
                } else {
                    console.log('Order confirmation email sent to customer: ' + info.response);
                }
            });

            // Send email to the owner asynchronously
            transporter.sendMail(mailOptionsOwner, (error, info) => {
                if (error) {
                    console.log("Error sending order confirmation email to owner:", error);
                } else {
                    console.log('Order confirmation email sent to owner: ' + info.response);
                }
            });

            console.log(`✅ Confirmation emails sent for order ${finalOrder.orderNumber}\n`);
        } else {
            console.log(`\n⏭️ Skipping confirmation emails - Order ${finalOrder.orderNumber} status is ${finalOrder.status} (not Pending)`);
        }

        return {
            success: true,
            message: 'Order created successfully',
            order: savedOrder,
            orderNumber: finalOrder.orderNumber,  // Include order number at root level
            status: 201
        };

    } catch (error) {
        console.error("Error creating order:", error);
        return {
            success: false,
            message: "Internal server error",
            status: 500
        };
    }
};

module.exports = createOrderService;
