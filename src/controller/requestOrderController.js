// controller/requestOrderController.js
const db = require("../../connections/mongo");
const User = require("../models/user");
const RequestOrder = require("../models/requestOrder");
const ReturnOrder = require("../models/returnOrder");
const Order = require("../models/order");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const moment = require('moment');
const mongoose = require('mongoose');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/requestOrder';
        // Check if the destination folder exists
        fs.access(destinationFolder, (err) => {
            if (err) {
                // If the folder doesn't exist, create it
                fs.mkdir(destinationFolder, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating destination folder:', err);
                        cb(err, null);
                    } else {
                        cb(null, destinationFolder);
                    }
                });
            } else {
                // If the folder already exists, use it
                cb(null, destinationFolder);
            }
        });
    },
   filename: function (req, file, cb) {
        const timestamp = moment().format('YYYYMMDD_HHmmss_'); // Add timestamp
        console.log("Original filename:", file.originalname);
        cb(null, timestamp + (file.originalname || 'file')); // Generate the new filename
    }
});

const uploadImage = multer({ storage: storage }).any();

const requestOrderController = {
    returnThisItem: async (req, res) => {
        uploadImage(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: 'Error uploading files', status: 400 });
            } else if (err) {
                console.error('Error uploading files:', err);
                return res.status(500).json({ message: 'Failed to upload files', status: 500 });
            }  

            try {
                console.log("Files:", req.files);
                console.log("Body:", req.body);
            
                // Parse and validate order details
                const { orderDetails, reason, status, additionalDetails } = req.body;
                if (!orderDetails) {
                    return res.status(400).json({
                        message: 'Order details are required',
                        status: 400
                    });
                }
            
                const parsedOrderDetails = JSON.parse(orderDetails);
                const { contactDetails, _id: orderId } = parsedOrderDetails;

                // Validate required fields - only userId and orderId are needed
                if (!contactDetails?.userId) {
                    return res.status(400).json({
                        message: 'Missing required field: userId',
                        status: 400
                    });
                }

                if (!orderId) {
                    return res.status(400).json({
                        message: 'Missing required field: orderId',
                        status: 400
                    });
                }

                // Check if a return request already exists for this order
                const existingRequest = await RequestOrder.findOne({ orderId: orderId });
                if (existingRequest) {
                    return res.status(400).json({
                        message: 'A return request has already been submitted for this order',
                        status: 400
                    });
                }

                // Prepare file data
                const files = req.files.map(file => ({
                    originalname: file.originalname,
                    filename: file.filename,
                    path: file.path,
                    size: file.size,
                }));
            
                // Create a new RequestOrder instance
                const requestOrder = new RequestOrder({
                    userId: contactDetails.userId,
                    orderId: orderId, // Fixed: Use the parsed `orderId`
                    notes: additionalDetails || '',
                    status: status || 'Pending',
                    files: files,
                    reason: reason || '',
                });

                // Save the request order to the database
                await requestOrder.save();

                // Update the Order with return request tracking
                await Order.findByIdAndUpdate(orderId, {
                    returnRequestInitiated: true,
                    returnRequestId: requestOrder._id,
                    returnRequestInitiatedAt: new Date()
                });
                console.log("Updated Order with returnRequestId:", requestOrder._id);

                return res.status(200).json({
                    message: 'Files uploaded and request saved successfully',
                    status: 200,
                    data: requestOrder,
                });
            
            } catch (error) {
                console.error('Error updating return order:', error);
                return res.status(500).json({
                    message: 'Error updating return order',
                    status: 500,
                    error: error.message,
                });
            }
            
        });
    }, 
    getRequestOrderByID: async (req, res, next) => {
        try {
            const { id } = req.params;
            const requestOrder = await RequestOrder.findById(id)
            .populate({
                path: 'orderId',
                model: 'Order', 
            })
            .populate({
                path: 'userId', 
                model: 'User', 
            });
            console.log("Request Order:", requestOrder);

            // Check if return order exists
            if (!requestOrder) {
                return res.json({
                    message: 'Request order not found',
                    status: 404
                });
            }    

            // Respond with the retrieved return order
            return res.json({   
                message: 'Request order found',
                status: 200,
                data: requestOrder
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving request order:", error);
            return res.status(500).json({
                message: "Internal server error",   
                status: 500,
                errors: error.message || error.errors || {},
            });
        }
    }, 
    deleteRequestOrder: async (req, res, next) => {
        try {
            // Extract returnOrderId from request parameters
            const { id } = req.params;

            // Delete the return order from the database by returnOrderId
            await RequestOrder.findByIdAndDelete(id);

            // Respond with a success message
            return res.json({
                message: 'Request order deleted successfully',
                status: 200
            });
        } catch (error) {
            // Handle errors
            console.error("Error deleting request order:", error);
            return res.status(500).json({
                message: "Internal server error",   
                status: 500,
                errors: error.message || error.errors || {},
            });
        }
    },
    getAllRequestOrders: async (req, res, next) => {
        try {
            // Retrieve all request orders with populated order and user details
            const requestOrders = await RequestOrder.find({ status: { $ne: 'Accepted' } })
                .populate({
                    path: 'orderId',
                    model: 'Order', 
                })
                .populate({
                    path: 'userId',  
                    model: 'User', 
                });
    
            // Respond with the retrieved request orders
            return res.json({
                message: 'Request orders found',
                status: 200,
                data: requestOrders,
            });
        } catch (error) {
            // Handle errors
            console.error('Error retrieving request orders:', error);
            return res.status(500).json({
                message: 'Internal server error',
                status: 500,
                errors: error.message || error.errors || {},
            });
        }
    },
    updateStatusRequestOrder: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            console.log(req.body);
            console.log("Update Request:", { status });
            console.log("req.params:", req.params);
            console.log("req.body:", req.body);

            // First, get the request order to access userId
            const requestOrder = await RequestOrder.findById(id).populate('userId').populate('orderId');

            if (!requestOrder) {
                return res.status(404).json({
                    message: 'Request order not found',
                    status: 404
                });
            }

            // Prepare update data
            const updateData = { status };

            // If status is "Accepted", mark as converted
            if (status === 'Accepted') {
                updateData.converted = true;
                updateData.convertedAt = new Date();
            }

            // Update the request order
            const updatedRequestOrder = await RequestOrder.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

            console.log("Updated Request Order:", updatedRequestOrder);

            // Check if a return order already exists for this request
            const existingReturnOrder = await ReturnOrder.findOne({ requestOrder: id });

            if (status === 'Accepted') {
                // Extract user and order details from populated request order
                const user = requestOrder.userId;
                const order = requestOrder.orderId;

                // Build customer details from populated data
                const customerName = user?.firstname && user?.lastname
                    ? `${user.firstname} ${user.lastname}`
                    : (user?.firstname || user?.lastname || null);
                const phoneNumber = user?.phoneNumber || order?.shippingDetails?.phoneNumber || null;
                const email = user?.email || order?.contactDetails?.email || null;
                const address = order?.shippingDetails?.address || user?.address?.address || null;
                const city = order?.shippingDetails?.city || null;
                const postalCode = order?.shippingDetails?.postalCode || null;
                const orderNumber = order?.orderNumber || null;
                const productNames = order?.cart?.map(item => item.productName) || null;

                const conversionTime = new Date();
                let returnOrderIdToSave;

                if (existingReturnOrder) {
                    // Update existing return order with full customer details
                    await ReturnOrder.findByIdAndUpdate(existingReturnOrder._id, {
                        status: 'Accepted',
                        userId: user?._id || requestOrder.userId,
                        customerName,
                        phoneNumber,
                        email,
                        address,
                        city,
                        postalCode,
                        orderNumber,
                        productNames
                    });
                    returnOrderIdToSave = existingReturnOrder._id;
                } else {
                    // Create new return order with full customer details from request order
                    const returnOrder = new ReturnOrder({
                        requestOrder: id,
                        userId: user?._id || requestOrder.userId,
                        status: 'Accepted',
                        reason: requestOrder.reason || '',
                        notes: requestOrder.notes || '',
                        customerName,
                        phoneNumber,
                        email,
                        address,
                        city,
                        postalCode,
                        orderNumber,
                        productNames
                    });
                    await returnOrder.save();
                    returnOrderIdToSave = returnOrder._id;
                    console.log("Created Return Order with full customer details:", returnOrder);
                }

                // Update the Order with return order tracking
                const orderId = order?._id || requestOrder.orderId;
                await Order.findByIdAndUpdate(orderId, {
                    returnOrderId: returnOrderIdToSave,
                    returnOrderConvertedAt: conversionTime
                });
                console.log("Updated Order with returnOrderId:", returnOrderIdToSave);
            } else if (existingReturnOrder) {
                // Update existing return order status to match the request status
                await ReturnOrder.findByIdAndUpdate(existingReturnOrder._id, { status });
            }

            // Respond with a success message and the updated order
            return res.status(200).json({
                message: 'Request order status updated successfully',
                status: 200,
                data: updatedRequestOrder,
                converted: status === 'Accepted'
            });
        } catch (error) {
            // Handle errors
            console.error("Error updating request order:", error);
            return res.status(500).json({
                message: "Internal server error",
                status: 500,
                errors: error.message || error.errors || {},
            });
        }
    },
    getApproveRequestOrder: async (req, res, next) => {
        try {
            const { userId } = req.params;
            console.log("userId", userId);

            // Retrieve all request orders with populated order and user details
            const requestOrders = await RequestOrder.find({ userId: userId, status: "Accepted" })
                .populate({
                    path: 'orderId', 
                    model: 'Order', 
                })
                .populate({
                    path: 'userId', 
                    model: 'User', 
                });
    
            // Respond with the retrieved request orders
            return res.json({
                message: 'Request orders found',
                status: 201,
                data: requestOrders,
            });
        } catch (error) {
            // Handle errors
            console.error('Error retrieving request orders:', error);
            return res.status(500).json({
                message: 'Internal server error',
                status: 500,
                errors: error.message || error.errors || {},
            });
        }   
    },
    getAllRequestByUserId: async (req, res, next) => {
        try {
            const { userId } = req.params;
            console.log("userId", userId);
    
            // Retrieve all request orders with populated order and user details
            const requestOrders = await RequestOrder.find({ userId: userId })
                .populate({
                    path: 'orderId', 
                    model: 'Order', 
                })
                .populate({
                    path: 'userId', 
                    model: 'User', 
                });
    
            // Respond with the retrieved request orders
            return res.json({
                message: 'Request orders found',
                status: 201,
                requestOrders: requestOrders,
            });
        } catch (error) {
            // Handle errors
            console.error('Error retrieving request orders:', error);
            return res.status(500).json({
                message: 'Internal server error',
                status: 500,    
                errors: error.message || error.errors || {},    
            }); 
        }   
    },
    
};

module.exports = requestOrderController;
