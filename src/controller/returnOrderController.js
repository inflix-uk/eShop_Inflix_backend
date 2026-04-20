// controller/returnOrderController.js
const db = require("../../connections/mongo");
const User = require("../models/user");
const ReturnOrder = require("../models/returnOrder");
const Order = require("../models/order");
const Label = require("../models/label");

const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const moment = require('moment');
const mongoose = require('mongoose');
const { exit } = require("process");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/returnOrder';
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

const returnOrderController = {

    returnOrder: async (req, res) => {
        uploadImage(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: 'Error uploading files', status: 400 });
            } else if (err) {
                console.error('Error uploading files:', err);
                return res.status(500).json({ message: 'Failed to upload files', status: 500 });
            }

            try {
                const parsedData = JSON.parse(req.body.data);
                console.log("Parsed Data:", parsedData);
                console.log("Files:", req.files);

                // Separate files into respective fields
                const orderImages = req.files
                    .filter(file => file.fieldname === 'orderImages')
                    .map(file => ({
                        filename: file.filename,
                        path: file.path
                    }));

                const orderDocuments = req.files
                    .filter(file => file.fieldname === 'orderDocuments')
                    .map(file => ({
                        filename: file.filename,
                        path: file.path
                    }));


                // Create a new return order document
                const newReturnOrder = new ReturnOrder({
                    ...parsedData,
                    orderImages,
                    orderDocuments
                });

                // Save to the database
                await newReturnOrder.save();
            console.log("New Return Order:", newReturnOrder);
                res.status(201).json({
                    message: 'Return order created successfully',
                    status: 201,
                    data: newReturnOrder
                });
            } catch (error) {
                console.error('Error creating return order:', error);
                res.status(500).json({
                    message: 'Internal server error',
                    status: 500,
                    errors: error.errors || {}
                });
            }
        });
    },

    updateReturnOrder: async (req, res) => {
        uploadImage(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: 'Error uploading files', status: 400 });
            } else if (err) {
                console.error('Error uploading files:', err);
                return res.status(500).json({ message: 'Failed to upload files', status: 500 });
            }
    
            try {
                const { id } = req.params;
                let updates = req.body;
                console.log("Update Request:", req.body);
                console.log("Files:", req.files);
    
                // Parse `data` field if it exists
                if (updates.data) {
                    try {
                        updates = { ...updates, ...JSON.parse(updates.data) };
                        delete updates.data;
                    } catch (parseError) {
                        console.error('Error parsing JSON data:', parseError);
                        return res.status(400).json({
                            message: 'Invalid JSON data provided',
                            status: 400,
                        });
                    }
                }
    
                // Validate ID
                if (!mongoose.Types.ObjectId.isValid(id)) {
                    return res.status(400).json({
                        message: 'Invalid return order ID',
                        status: 400,
                    });
                }
    
                // Convert `orderImages` to array of objects if it's an array of strings
                if (Array.isArray(updates.orderImages)) {
                    updates.orderImages = updates.orderImages.map(imagePath => ({
                        filename: path.basename(imagePath),
                        path: imagePath,
                    }));
                }
    
                // Convert `orderDocuments` to array of objects if it's an array of strings
                if (Array.isArray(updates.orderDocuments)) {
                    updates.orderDocuments = updates.orderDocuments.map(docPath => ({
                        filename: path.basename(docPath),
                        path: docPath,
                    }));
                }
    
                // Handle files if `req.files` exists
                if (req.files && req.files.length > 0) {
                    updates.orderImages = [
                        ...(updates.orderImages || []),
                        ...req.files
                            .filter(file => file.fieldname === 'orderImages')
                            .map(file => ({ filename: file.filename, path: file.path })),
                    ];
    
                    updates.orderDocuments = [
                        ...(updates.orderDocuments || []),
                        ...req.files
                            .filter(file => file.fieldname === 'orderDocuments')
                            .map(file => ({ filename: file.filename, path: file.path })),
                    ];
                }
    
                // Update the document in the database
                const updatedReturnOrder = await ReturnOrder.findByIdAndUpdate(
                    id,
                    updates,
                    { new: true, runValidators: true }
                );
    
                if (!updatedReturnOrder) {
                    return res.status(404).json({
                        message: 'Return order not found',
                        status: 404,
                    });
                }
    
                console.log('Updated Return Order:', updatedReturnOrder);
    
                res.status(200).json({
                    message: 'Return order updated successfully',
                    status: 200,
                    data: updatedReturnOrder,
                });
            } catch (error) {
                console.error('Error updating return order:', error);
                res.status(500).json({
                    message: 'Internal server error',
                    status: 500,
                    errors: error.message || error.errors || {},
                });
            }
        });
    },

    getReturnOrderByID: async (req, res, next) => {
        try {
            const { id } = req.params;
            const returnOrder = await ReturnOrder.findById(id)
                .populate({
                    path: 'requestOrder',
                    populate: [
                        {
                            path: 'userId',
                            model: 'User'
                        },
                        {
                            path: 'orderId',
                            model: 'Order'
                        }
                    ]
                });
            console.log("Return Order:", returnOrder);
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
            // Check for date filter in query params
            const { dateFilter } = req.query;
            let query = {};
            
            // If dateFilter is 'initial', get orders from last 7 days (initial load)
            if (dateFilter === 'initial') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                query.createdAt = { $gte: sevenDaysAgo };
            } 
            // If dateFilter is 'remaining', get orders older than 7 days (remaining data)
            else if (dateFilter === 'remaining') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                query.createdAt = { $lt: sevenDaysAgo };
            }
            // Otherwise, no filter (get all orders)

            // Retrieve return orders from the database with the query
            const returnOrders = await ReturnOrder.find(query).populate({
                path: 'requestOrder',
                model: 'RequestOrder',
                populate: [
                    { path: 'userId', model: 'User' },
                    { path: 'orderId', model: 'Order' },
                ]
            }).lean();

            // Get labels for all return orders
            const returnOrderIds = returnOrders.map(order => order._id);
            const labels = await Label.find({
                returnOrder: { $in: returnOrderIds },
                isDeleted: false
            }).lean();

            // Create a map of returnOrderId -> label
            const labelMap = {};
            labels.forEach(label => {
                labelMap[label.returnOrder.toString()] = label;
            });

            // Attach labels to return orders
            const returnOrdersWithLabels = returnOrders.map(order => ({
                ...order,
                label: labelMap[order._id.toString()] || null
            }));

            // Respond with the array of return orders
            res.json({
                message: 'Return orders retrieved successfully',
                returnOrders: returnOrdersWithLabels,
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving return orders:", error);
            res.json({ message: "Internal server error", status: 500 });
        }
    },

    
    updateStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;


            console.log("Update Request:", { status });

            // Find the return order by ID and update only its status
            const updatedReturnOrder = await ReturnOrder.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });

            if (!updatedReturnOrder) {
                return res.status(404).json({
                    message: "Return order not found",
                    status: 404
                });
            }
             console.log("Updated Return Order:", updatedReturnOrder);
            // Respond with a success message and the updated order
            res.status(200).json({
                message: "Return order status updated successfully",
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

    /**
     * Get return orders for a specific user by their user ID
     * Matches user's email with the email field in ReturnOrder
     */
    getReturnOrdersByUserId: async (req, res) => {
        try {
            const { userId } = req.params;

            // First, get the user's email
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    status: 404
                });
            }

            // Find return orders by user's email
            const returnOrders = await ReturnOrder.find({
                email: { $regex: new RegExp(`^${user.email}$`, 'i') } // Case-insensitive match
            })
            .populate({
                path: 'requestOrder',
                populate: [
                    { path: 'userId', model: 'User' },
                    { path: 'orderId', model: 'Order' }
                ]
            })
            .sort({ createdAt: -1 }); // Newest first

            res.status(200).json({
                message: 'Return orders retrieved successfully',
                returnOrders,
                status: 200
            });
        } catch (error) {
            console.error('Error fetching return orders for user:', error);
            res.status(500).json({
                message: 'Internal server error',
                status: 500,
                error: error.message
            });
        }
    },



   
    


};
module.exports = returnOrderController;