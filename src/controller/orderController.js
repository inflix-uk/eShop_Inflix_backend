// controller/orderController.js
const db = require("../../connections/mongo");
const User = require("../models/user");
const ReturnOrder = require("../models/returnOrder");
const Order = require("../models/order");
const Coupon = require("../models/coupon"); // Assuming you have a Coupon model
const Label = require("../models/label");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require('path');
const fs = require('fs');
const updateOrderService = require("../services/orderService/updateOrder");
const { bulkUpdateOrdersService } = require("../services/orderService/updateOrder");
const createOrderService = require("../services/orderService/createOrder");

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

        // Return true if a matching order is found, false otherwise
        return !!order;
    } catch (error) {
        console.error("Error checking coupon usage:", error);
        throw new Error("Internal server error while checking coupon usage.");
    }
};

// Helper function to update coupon usage with user ID and order ID
const updateCouponUsage = async (couponCode, userId, orderId) => {
    try {
        if (!couponCode || !userId || !orderId) {
            console.log("Missing required parameters for updating coupon usage");
            return false;
        }
        
        // Find the coupon by code
        const coupon = await Coupon.findOne({ code: couponCode });
        
        if (!coupon) {
            console.log(`Coupon with code ${couponCode} not found`);
            return false;
        }
        
        // Update the coupon usage count
        coupon.used = (coupon.used || 0) + 1;
        
        // Add the user ID and order ID to track who used this coupon
        // First check if the coupon has a usageHistory field, if not create it
        if (!coupon.usageHistory) {
            // Add usageHistory field to the coupon schema if it doesn't exist
            coupon.usageHistory = [];
        }
        
        // Add the usage record
        coupon.usageHistory.push({
            userId: userId,
            orderId: orderId,
            usedAt: new Date()
        });
        
        // Save the updated coupon
        await coupon.save();
        console.log(`Coupon ${couponCode} usage updated for user ${userId} and order ${orderId}`);
        return true;
    } catch (error) {
        console.error("Error updating coupon usage:", error);
        return false;
    }
};


const orderController = {

  
    createOrder: async (req, res, next) => {
        try {
            const result = await createOrderService(req.body);

            if (!result.success) {
                return res.status(result.status || 400).json({
                    message: result.message,
                    status: result.status
                });
            }

            // Order created successfully (both Failed and Pending status orders)
            return res.status(201).json({
                message: result.message,
                order: result.order,
                orderNumber: result.orderNumber,
                status: 201
            });
        } catch (error) {
            console.error("Error creating order:", error);
            return res.status(500).json({
                message: error.message || "Internal server error",
                status: 500
            });
        }
    },


 
    getAllOrder: async (req, res) => {
        try {
            const initialBatchSize = 20;
            const { batch } = req.query; // Check the 'batch' parameter
    
            if (batch === 'initial') {
                // Fetch the initial batch of orders
                const initialOrders = await Order.find({ isdeleted: false })
                    .sort({ createdAt: -1 })
                    .limit(initialBatchSize);
    
                return res.status(200).json({
                    message: 'Initial batch of orders retrieved',
                    orders: initialOrders,
                    status: 201,
                });
            } else if (batch === 'remaining') {
                // Fetch the remaining orders
                const remainingOrders = await Order.find({ isdeleted: false })
                    .sort({ createdAt: -1 })
                    .skip(initialBatchSize);
    
                return res.status(200).json({
                    message: 'Remaining orders retrieved',
                    orders: remainingOrders,
                    status: 201,
                });
            } else {
                return res.status(400).json({ message: 'Invalid batch parameter', status: 400 });
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({ message: 'Failed to fetch orders', status: 500 });
        }
    }, 
    
    // GET /get/order?page=1&limit=25&filter=pending&search=keyword
    // OPTIMIZED: Returns order list WITHOUT full cart data (only cartItemsCount)
    // Supports server-side filtering and search
    getAllOrderv1: async (req, res) => {
        try {
            const { page = 1, limit = 25, filter = 'all', search = '' } = req.query;
            const pageNum = parseInt(page, 10) || 1;
            const limitNum = parseInt(limit, 10) || 25;
            const skip = (pageNum - 1) * limitNum;

            // Build match conditions
            const matchConditions = { isdeleted: false };

            // Add status filter if not "all"
            if (filter && filter !== 'all') {
                matchConditions.status = new RegExp(`^${filter}$`, 'i');
            }

            // Add search conditions if search query provided
            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                matchConditions.$or = [
                    { orderNumber: searchRegex },
                    { 'contactDetails.email': searchRegex },
                    { 'shippingDetails.firstName': searchRegex },
                    { 'shippingDetails.lastName': searchRegex },
                    { 'shippingDetails.trackingNumber': searchRegex },
                    { 'shippingDetails.address': searchRegex },
                    { 'shippingDetails.postalCode': searchRegex },
                    { 'shippingDetails.city': searchRegex },
                    { 'shippingDetails.county': searchRegex },
                    { 'shippingDetails.phoneNumber': searchRegex },
                    { 'shippingDetails.notes': searchRegex },
                    { 'coupon.code': searchRegex },
                    { 'cart.productName': searchRegex },
                    { status: searchRegex },
                ];
            }

            // Use aggregation pipeline for optimized response
            const [result, totalCount] = await Promise.all([
                Order.aggregate([
                    { $match: matchConditions },
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: limitNum },
                    {
                        $project: {
                            _id: 1,
                            orderNumber: 1,
                            status: 1,
                            totalOrderValue: 1,
                            createdAt: 1,
                            updatedAt: 1,
                            isdeleted: 1,
                            // Contact details (minimal)
                            'contactDetails.email': 1,
                            'contactDetails.userId': 1,
                            // Shipping details (needed for display)
                            'shippingDetails.firstName': 1,
                            'shippingDetails.lastName': 1,
                            'shippingDetails.phoneNumber': 1,
                            'shippingDetails.address': 1,
                            'shippingDetails.apartment': 1,
                            'shippingDetails.city': 1,
                            'shippingDetails.county': 1,
                            'shippingDetails.postalCode': 1,
                            'shippingDetails.country': 1,
                            'shippingDetails.trackingNumber': 1,
                            'shippingDetails.notes': 1,
                            // Payment details (minimal)
                            'paymentDetails.cardDetails.brand': 1,
                            'paymentDetails.cardDetails.last4': 1,
                            // Coupon (minimal - just code and discount info)
                            'coupon.code': 1,
                            'coupon.discount': 1,
                            'coupon.discount_type': 1,
                            'coupon.upto': 1,
                            // Return request/order fields
                            returnRequestInitiated: 1,
                            returnRequestInitiatedAt: 1,
                            returnRequestId: 1,
                            returnOrderId: 1,
                            returnOrderConvertedAt: 1,
                            // Cart summary instead of full cart
                            cartItemsCount: { $size: '$cart' },
                            // Extract just product names for search/display
                            cartProductNames: {
                                $map: {
                                    input: '$cart',
                                    as: 'item',
                                    in: '$$item.productName'
                                }
                            },
                            // Calculate cart total for display
                            cartTotal: {
                                $sum: {
                                    $map: {
                                        input: '$cart',
                                        as: 'item',
                                        in: { $multiply: ['$$item.salePrice', '$$item.qty'] }
                                    }
                                }
                            }
                        }
                    }
                ]),
                Order.countDocuments(matchConditions)
            ]);

            const totalPages = Math.ceil(totalCount / limitNum);
            const hasMore = pageNum < totalPages;

            return res.status(200).json({
                message: 'Orders retrieved successfully',
                orders: result,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    totalOrders: totalCount,
                    filter: filter,
                    search: search,
                },
                hasMore,
                status: 201,
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({ message: 'Failed to fetch orders', status: 500 });
        }
    },

    // GET /get/order/export?filter=all&search=
    // Dedicated API for CSV export - returns all orders with full product details
    getOrdersForExport: async (req, res) => {
        try {
            const { filter = 'all', search = '' } = req.query;

            // Build match conditions
            const matchConditions = { isdeleted: false };

            if (filter && filter !== 'all') {
                matchConditions.status = new RegExp(`^${filter}$`, 'i');
            }

            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                matchConditions.$or = [
                    { orderNumber: searchRegex },
                    { 'contactDetails.email': searchRegex },
                    { 'shippingDetails.firstName': searchRegex },
                    { 'shippingDetails.lastName': searchRegex },
                    { 'shippingDetails.trackingNumber': searchRegex },
                    { 'shippingDetails.phoneNumber': searchRegex },
                    { 'cart.productName': searchRegex },
                    { status: searchRegex },
                ];
            }

            const orders = await Order.aggregate([
                { $match: matchConditions },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        orderNumber: 1,
                        createdAt: 1,
                        status: 1,
                        totalOrderValue: 1,
                        'contactDetails.email': 1,
                        'shippingDetails.firstName': 1,
                        'shippingDetails.lastName': 1,
                        'shippingDetails.phoneNumber': 1,
                        'shippingDetails.address': 1,
                        'shippingDetails.apartment': 1,
                        'shippingDetails.city': 1,
                        'shippingDetails.county': 1,
                        'shippingDetails.postalCode': 1,
                        'shippingDetails.country': 1,
                        'shippingDetails.notes': 1,
                        'shippingDetails.trackingNumber': 1,
                        'paymentDetails.cardDetails.brand': 1,
                        'paymentDetails.cardDetails.last4': 1,
                        'coupon.code': 1,
                        'coupon.discount': 1,
                        'coupon.discount_type': 1,
                        'coupon.upto': 1,
                        // Full product details for export
                        cartItems: {
                            $map: {
                                input: '$cart',
                                as: 'item',
                                in: {
                                    productName: '$$item.productName',
                                    variant: '$$item.name',
                                    SKU: '$$item.SKU',
                                    EIN: '$$item.EIN',
                                    salePrice: '$$item.salePrice',
                                    qty: '$$item.qty'
                                }
                            }
                        },
                        cartItemsCount: { $size: '$cart' },
                        cartTotal: {
                            $sum: {
                                $map: {
                                    input: '$cart',
                                    as: 'item',
                                    in: { $multiply: ['$$item.salePrice', '$$item.qty'] }
                                }
                            }
                        }
                    }
                }
            ]);

            return res.status(200).json({
                message: 'Export data retrieved successfully',
                orders,
                totalCount: orders.length,
                status: 200
            });
        } catch (error) {
            console.error('Error fetching export data:', error);
            return res.status(500).json({ message: 'Failed to fetch export data', status: 500 });
        }
    },

    // GET /get/order/cart/:id
    // Fetch full cart details for a specific order (used when clicking "eye" icon)
    getOrderCartById: async (req, res) => {
        try {
            const { id } = req.params;

            // Fetch only cart data with essential fields
            const order = await Order.findById(id)
                .select({
                    'cart.productId': 1,
                    'cart._id': 1,
                    'cart.productName': 1,
                    'cart.name': 1,
                    'cart.SKU': 1,
                    'cart.EIN': 1,
                    'cart.salePrice': 1,
                    'cart.Price': 1,
                    'cart.qty': 1,
                    'cart.selectedSim': 1,
                    'cart.isTradeIn': 1,
                    'cart.tradeInData': 1,
                    // Include only first variant image for display
                    'cart.variantImages': { $slice: 1 },
                    'cart.metaImage': 1
                })
                .lean();

            if (!order) {
                return res.status(404).json({
                    message: 'Order not found',
                    status: 404
                });
            }

            // Clean up cart items - only keep first image
            const cleanedCart = order.cart.map(item => ({
                productId: item.productId,
                _id: item._id,
                productName: item.productName,
                name: item.name,
                SKU: item.SKU,
                EIN: item.EIN,
                salePrice: item.salePrice,
                Price: item.Price,
                qty: item.qty,
                selectedSim: item.selectedSim,
                isTradeIn: item.isTradeIn,
                tradeInData: item.tradeInData,
                image: item.variantImages?.[0]?.path || item.metaImage?.path || null
            }));

            return res.status(200).json({
                message: 'Cart retrieved successfully',
                cart: cleanedCart,
                status: 200
            });
        } catch (error) {
            console.error('Error fetching order cart:', error);
            return res.status(500).json({ message: 'Failed to fetch cart', status: 500 });
        }
    },

    // PATCH /update/order/shipping/:id
    // Update only shipping details: status, provider, trackingNumber, notes
    updateOrderShipping: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, shippingDetails, refund } = req.body;

            // Find the order
            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    message: 'Order not found',
                    status: 404
                });
            }

            // Build update object
            const updateData = {};

            // Update status if provided
            if (status) {
                updateData.status = status;
            }

            // Update shipping details if provided
            if (shippingDetails) {
                if (shippingDetails.provider !== undefined) {
                    updateData['shippingDetails.provider'] = shippingDetails.provider;
                }
                if (shippingDetails.trackingNumber !== undefined) {
                    updateData['shippingDetails.trackingNumber'] = shippingDetails.trackingNumber;
                }
                if (shippingDetails.notes !== undefined) {
                    updateData['shippingDetails.notes'] = shippingDetails.notes;
                }
            }

            // Handle refund data if status is Refunded
            if (status === 'Refunded' && refund) {
                updateData['refund.refundType'] = refund.refundType;
                updateData['refund.refundAmount'] = refund.refundAmount;
                updateData['refund.refundDate'] = new Date();
            }

            // Perform the update
            const updatedOrder = await Order.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            ).select({
                orderNumber: 1,
                status: 1,
                'shippingDetails.provider': 1,
                'shippingDetails.trackingNumber': 1,
                'shippingDetails.notes': 1,
                refund: 1
            });

            return res.status(200).json({
                message: 'Shipping details updated successfully',
                order: updatedOrder,
                status: 200
            });
        } catch (error) {
            console.error('Error updating shipping details:', error);
            return res.status(500).json({
                message: 'Failed to update shipping details',
                status: 500
            });
        }
    },


    updateOrder: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await updateOrderService(id, req.body);

            if (!result.success) {
                return res.json({
                    message: result.message,
                    status: result.status
                });
            }

            res.json({
                message: result.message,
                order: result.order,
                status: result.status
            });
        } catch (error) {
            console.error("Error updating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    /**
     * Bulk update multiple orders at once
     * POST /update/orders/bulk
     * Body: { orderIds: [...], updateData: { status: 'Shipped' } }
     */
    bulkUpdateOrders: async (req, res) => {
        try {
            const { orderIds, updateData } = req.body;

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No order IDs provided',
                    status: 400
                });
            }

            if (!updateData || !updateData.status) {
                return res.status(400).json({
                    success: false,
                    message: 'Update data with status is required',
                    status: 400
                });
            }

            const result = await bulkUpdateOrdersService(orderIds, updateData);

            if (!result.success) {
                return res.status(result.status).json({
                    success: false,
                    message: result.message,
                    status: result.status
                });
            }

            res.status(200).json({
                success: true,
                message: result.message,
                modifiedCount: result.modifiedCount,
                matchedCount: result.matchedCount,
                status: 200
            });
        } catch (error) {
            console.error("Error bulk updating orders:", error);
            res.status(500).json({
                success: false,
                message: "Internal server error",
                status: 500
            });
        }
    },

    statusOrder: async (req, res, next) => {
        try {
            // Extract user data from the request body
            const { userId, productId, quantity } = req.body;

            console.log(req.body);
            return;
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    deleteOrder: async (req, res, next) => {
        try {
            const { id } = req.params; 

            const order = await Order.findByIdAndUpdate(id, { isdeleted: true }, { new: true });

            if (!order) {
                return res.status(404).json({ message: 'Order not found', status: 404 });
            }
    
            return res.json({ message: 'Order soft deleted successfully', status: 201, order });
        } catch (error) {
            // Handle errors
            console.error("Error deleting order:", error);
            return res.status(500).json({ message: "Internal server error", status: 500 });
        }
    },

    permanentDeleteOrder: async (req, res, next) => {
        try {
            const { id } = req.params;
    
            // Use findByIdAndDelete instead of findByIdAndRemove
            const order = await Order.findByIdAndDelete(id);
    
            if (!order) {
                return res.status(404).json({ message: 'Order not found', status: 404 });
            }
    
            return res.json({ message: 'Order permanently deleted successfully', status: 201, order });
        } catch (error) {
            console.error("Error deleting order:", error);
            return res.status(500).json({ message: "Internal server error", status: 500 });
        }
    },
    

    getDeletedOrders: async (req, res, next) => {
        try {
            const orders = await Order.find({ isdeleted: true });

            return res.json({ message: 'Orders retrieved successfully', orders, status: 201 });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    restoreDeleteOrder: async (req, res, next) => {
        try {
            const { id } = req.params; 

            const order = await Order.findByIdAndUpdate(id, { isdeleted: false }, { new: true });

            if (!order) {
                return res.json({ message: 'Order not found', status: 404 });
            }
    
            return res.json({ message: 'Order Restored successfully', status: 201, order });
        } catch (error) {
            // Handle errors
            console.error("Error deleting order:", error);
            return res.status(500).json({ message: "Internal server error", status: 500 });
        }
    },
    
    getOrderById: async (req, res, next) => {
        try {
            // Extract orderId from request parameters
            const { id } = req.params;

            // Retrieve the order from the database by orderId
            const order = await Order.findById(id);

            // Check if order exists
            if (!order) {
                return res.json({
                    message: 'Order not found',
                    status: 404
                });
            }

            // Respond with the retrieved order
            res.json({
                message: 'Order retrieved successfully',
                order,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

        
    getOrderByIdAdminSide: async (req, res, next) => {
        try {
            // Extract orderId from request parameters
            const { id } = req.params;

            // Retrieve the order from the database by orderId, excluding usageHistory from coupon
            const order = await Order.findById(id)
                .select('-coupon.usageHistory')
                .lean();

            // Check if order exists
            if (!order) {
                return res.json({
                    message: 'Order not found',
                    status: 404
                });
            }

            // Respond with the retrieved order
            res.json({
                message: 'Order retrieved successfully',
                order,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error creating order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },
    
    getOrderByUser: async (req, res, next) => {
        try {
            console.log(req.body);
            // Extract user data from the request body
            const { userId } = req.body;
            console.log('userid', req.body);
            const orders = await Order.find({ 'contactDetails.userId': userId }).sort({ createdAt: -1 }).lean();

            console.log(orders);
            // Check if orders exist for the provided email
            if (!orders || orders.length === 0) {
                return res.json({
                    message: 'No orders found for the provided email',
                    status: 404
                });
            }

            // Get return order IDs from orders that have returnOrderId
            const returnOrderIds = orders
                .filter(order => order.returnOrderId)
                .map(order => order.returnOrderId);

            // Fetch labels for all return orders in one query
            let labelMap = {};
            if (returnOrderIds.length > 0) {
                const labels = await Label.find({
                    returnOrder: { $in: returnOrderIds },
                    isDeleted: false
                }).lean();

                // Create a map of returnOrderId -> label
                labels.forEach(label => {
                    if (label.returnOrder) {
                        labelMap[label.returnOrder.toString()] = {
                            _id: label._id,
                            fileName: label.fileName,
                            filePath: label.filePath,
                            fileSize: label.fileSize
                        };
                    }
                });
            }

            // Attach labels to orders
            const ordersWithLabels = orders.map(order => ({
                ...order,
                returnOrderLabel: order.returnOrderId ? labelMap[order.returnOrderId.toString()] || null : null
            }));

            res.json({
                message: 'Orders retrieved successfully',
                orders: ordersWithLabels,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    returnOrder: async (req, res, next) => {
        try {
         
            // Extract return order data from the request body
            const {
                customerName,
                phoneNumber,
                email,
                address,
                city,
                postalCode,
                orderNumber,
                originalTrackingNumber,
                returnTrackingNumber,
                originalOrderNumber,
                originalSerialNumber,
                replacementSerialNumber,
                reason,
                notes,
                account,
                platform,
                customerAsks,
                status,
                productNames
            } = req.body;
            console.log("Request Body:", req.body);
            console.log("Request Files:", req.files);
            return;
    
            // Generate RMA number
            const currentYear = new Date().getFullYear();
            const lastOrder = await ReturnOrder.findOne({ rma: { $regex: `^RMA${currentYear}` } })
                .sort({ createdAt: -1 })
                .exec();

            let rma;
            if (lastOrder) {
                const lastOrderNumber = parseInt(lastOrder.rma.slice(5), 10);
                rma = `RMA${currentYear}${String(lastOrderNumber + 1).padStart(4, '0')}`;
            } else {
                rma = `RMA${currentYear}0001`;
            }
    
            // Create a new return order document
            const newReturnOrder = new ReturnOrder({
                customerName,
                phoneNumber,
                email,
                address,
                city,
                rma,
                postalCode,
                orderNumber,
                originalTrackingNumber,
                returnTrackingNumber,
                originalOrderNumber,
                originalSerialNumber,
                replacementSerialNumber,
                reason,
                notes,
                account,
                platform,
                customerAsks,
                status,
                productNames
            });
    
            // Save the return order to the database
            await newReturnOrder.save();
    
            // Respond with a success message and the saved order
            res.status(201).json({
                message: 'Return order created successfully',
                status: 201,
                data: newReturnOrder
            });
        } catch (error) {
            // Handle errors
            console.error("Error creating return order:", error);
            res.status(500).json({
                message: "Internal server error",
                status: 500,
                errors: error.errors || {}
            });
        }
    },

    updateReturnOrder: async (req, res, next) => {
        try {
            const { id } = req.params; // Extract the ID from the request parameters
            const updates = req.body; // Get the fields to update from the request body

            console.log("Update Request:", updates);

            // Find the return order by ID and update it
            const updatedReturnOrder = await ReturnOrder.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

            if (!updatedReturnOrder) {
                return res.status(404).json({
                    message: "Return order not found",
                    status: 404
                });
            }
console.log("Updated Return Order:", updatedReturnOrder);
            // Respond with a success message and the updated order
            res.status(200).json({
                message: "Return order updated successfully",
                status: 200,
                data: updatedReturnOrder
            });
        } catch (error) {
            // Handle errors
            console.error("Error updating return order:", error);
            res.status(500).json({
                message: "Internal server error",
                status: 500,
                errors: error.errors || {}
            });
        }
    },

    getReturnOrderByID: async (req, res, next) => {
        try {
            // Extract returnOrderId from request parameters
            const { id } = req.params;
    
            // Retrieve the return order from the database by returnOrderId
            const returnOrder = await ReturnOrder.findById(id);
    
            // Check if return order exists
            if (!returnOrder) {
                return res.json({
                    message: 'Return order not found',
                    status: 404
                });
            }
    
            // Respond with the retrieved return order
            res.json({
                message: 'Return order retrieved successfully',
                returnOrder,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving return order:", error); 
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    deleteReturnOrder: async (req, res, next) => {
        try {
            // Extract returnOrderId from request parameters
            const { id } = req.params;
    
            // Delete the return order from the database by returnOrderId
            await ReturnOrder.findByIdAndDelete(id);
    
            // Respond with a success message
            res.json({
                message: 'Return order deleted successfully',
                status: 201
            });
        } catch (error) {
            // Handle errors    
            console.error("Error deleting return order:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },


    getAllReturnOrders: async (req, res, next) => {
        try {
            // Retrieve all return orders from the database
            const returnOrders = await ReturnOrder.find({});
    
            // Respond with the array of return orders
            res.json({
                message: 'Return orders retrieved successfully',
                returnOrders,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving return orders:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    getOrderByOrderNumber: async (req, res, next) => {
        try {
            // Extract orderNumber from request parameters
            const { orderNumber } = req.params;

            // Retrieve the order from the database by orderNumber
            const order = await Order.findOne({ orderNumber: orderNumber });

            // Check if order exists
            if (!order) {
                return res.json({
                    message: 'Order not found',
                    status: 404
                });
            }

            // Respond with the retrieved order
            res.json({
                message: 'Order retrieved successfully',
                order,
                status: 200
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving order by order number:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    /**
     * Get order numbers for a specific user (fast endpoint for dropdowns)
     * Returns only order _id, orderNumber, status, and createdAt
     */
    getOrderNumbersByUserId: async (req, res) => {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    message: 'User ID is required',
                    status: 400
                });
            }

            // Fast query - only select needed fields, no population
            const orders = await Order.find(
                { 'contactDetails.userId': userId, isdeleted: false },
                { _id: 1, orderNumber: 1, status: 1, createdAt: 1, totalOrderValue: 1 }
            )
            .sort({ createdAt: -1 })
            .lean();

            res.status(200).json({
                message: 'Order numbers retrieved successfully',
                orders: orders.map(order => ({
                    id: order._id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    total: order.totalOrderValue,
                    createdAt: order.createdAt
                })),
                status: 200
            });
        } catch (error) {
            console.error('Error fetching order numbers for user:', error);
            res.status(500).json({
                message: 'Internal server error',
                status: 500,
                error: error.message
            });
        }
    },
};
module.exports = orderController;