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
const {
    notifyRequestCreated,
    notifyRefundStatus,
} = require('../services/email/transactionalEmailService');
const {
    resolveScopedUserId,
    assertOrderAccess,
    assertRequestOrderAccess,
    getRequesterId,
    sendOwnershipError,
} = require('../utils/ownershipAuth');

const blobStorage = require('../utils/blobStorage');
const { resolveOrderLineImageUrlServer } = require('../utils/orderLineImageUrlServer');

const RETURN_UPLOAD_DIR = './uploads/requestOrder';
const RETURN_STORAGE_FOLDER = 'requestOrder';

// Customer return images used to be written to the API server's local disk only. That disk
// is not shared between instances and is wiped on redeploy, so admins later saw broken
// "Attached Images". Files are now kept in memory and pushed to the same object storage as
// product images; local disk is only a fallback when object storage isn't configured.
const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 10 },
}).any();

function safeFilename(name) {
    return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function saveReturnFileToDisk(file) {
    await fs.promises.mkdir(RETURN_UPLOAD_DIR, { recursive: true });
    const filename = moment().format('YYYYMMDD_HHmmss_') + safeFilename(file.originalname);
    const relPath = `uploads/requestOrder/${filename}`;
    await fs.promises.writeFile(path.join(RETURN_UPLOAD_DIR, filename), file.buffer);
    return { originalname: file.originalname, filename, path: relPath, url: null, size: file.size };
}

async function persistReturnFile(file) {
    if (blobStorage.isConfigured()) {
        try {
            const uploaded = await blobStorage.uploadFile(file, RETURN_STORAGE_FOLDER);
            if (uploaded?.url) {
                return {
                    originalname: file.originalname,
                    filename: uploaded.filename || file.originalname,
                    path: uploaded.path,
                    key: uploaded.key || null,
                    url: uploaded.url,
                    size: uploaded.size || file.size,
                    mimetype: file.mimetype,
                };
            }
        } catch (e) {
            console.error('Return image upload to object storage failed, saving to disk instead:', e?.message || e);
        }
    }
    return { ...(await saveReturnFileToDisk(file)), mimetype: file.mimetype };
}

/** Absolute URL for a stored return file (new records carry `url`; legacy ones only a disk path). */
function resolveReturnFileUrl(file) {
    if (!file) return '';
    if (file.url && /^https?:\/\//i.test(file.url)) return file.url;
    const raw = String(file.path || '').replace(/\\/g, '/').replace(/^\.?\/+/, '');
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
    return base ? `${base}/${raw}` : `/${raw}`;
}

/** Add display-ready image URLs to a (lean or doc) request order for the admin/customer UIs. */
function withResolvedImages(requestOrder) {
    if (!requestOrder) return requestOrder;
    const ro = typeof requestOrder.toObject === 'function' ? requestOrder.toObject() : requestOrder;
    const files = Array.isArray(ro.files)
        ? ro.files.map((f) => ({ ...f, url: resolveReturnFileUrl(f) || f.url || null }))
        : ro.files;
    let orderId = ro.orderId;
    if (orderId && typeof orderId === 'object' && Array.isArray(orderId.cart)) {
        orderId = {
            ...orderId,
            cart: orderId.cart.map((line) => ({
                ...line,
                lineImageUrl: resolveOrderLineImageUrlServer(line) || null,
            })),
        };
    }
    return { ...ro, files, orderId };
}

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
                const { orderDetails, reason, status, additionalDetails, requestType } = req.body;
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

                const order = await Order.findById(orderId);
                if (!order) {
                    return res.status(404).json({
                        message: 'Order not found',
                        status: 404,
                    });
                }

                const orderAccess = assertOrderAccess(req, order, { allowAdmin: true });
                if (!orderAccess.ok) {
                    return sendOwnershipError(res, orderAccess);
                }

                const scopedUserId = getRequesterId(req);

                // Check if a return request already exists for this order
                const existingRequest = await RequestOrder.findOne({ orderId: orderId });
                if (existingRequest) {
                    return res.status(400).json({
                        message: 'A return request has already been submitted for this order',
                        status: 400
                    });
                }

                // Prepare file data
                const files = [];
                for (const file of req.files || []) {
                    files.push(await persistReturnFile(file));
                }
            
                // Create a new RequestOrder instance
                const requestOrder = new RequestOrder({
                    userId: scopedUserId,
                    orderId: orderId, // Fixed: Use the parsed `orderId`
                    notes: additionalDetails || '',
                    status: status || 'Pending',
                    files: files,
                    reason: reason || '',
                    requestType: String(requestType || '').toLowerCase() === 'refund' ? 'refund' : 'return',
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

                // Return / refund request emails → customer + admin/business inbox. Fire-and-forget:
                // never affects the API response.
                notifyRequestCreated(requestOrder, order, { customerEmail: req.user?.email }).catch((e) =>
                    console.error('Return/refund request emails failed:', e)
                );

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

            const access = assertRequestOrderAccess(req, requestOrder, { allowAdmin: true });
            if (!access.ok) {
                return sendOwnershipError(res, access);
            }    

            // Respond with the retrieved return order
            return res.json({   
                message: 'Request order found',
                status: 200,
                data: withResolvedImages(requestOrder)
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
                })
                .lean();

            // Respond with the retrieved request orders
            return res.json({
                message: 'Request orders found',
                status: 200,
                data: requestOrders.map(withResolvedImages),
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

            // Tell the customer their return/refund request status changed (deduped per status).
            if (status && status !== requestOrder.status && requestOrder.orderId) {
                notifyRefundStatus(requestOrder.orderId, {
                    status,
                    requestOrder,
                    customerEmail: requestOrder.userId?.email,
                    dedupeKey: `request|${requestOrder._id}|${status}`,
                }).catch((e) => console.error('Request status email failed:', e));
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
            const scope = resolveScopedUserId(req, req.params.userId);
            if (!scope.ok) {
                return sendOwnershipError(res, scope);
            }

            const requestOrders = await RequestOrder.find({ userId: scope.userId, status: "Accepted" })
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
            const scope = resolveScopedUserId(req, req.params.userId);
            if (!scope.ok) {
                return sendOwnershipError(res, scope);
            }
    
            const requestOrders = await RequestOrder.find({ userId: scope.userId })
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

    getMyReturnRequests: async (req, res, next) => {
        req.params = { ...req.params, userId: getRequesterId(req) };
        return requestOrderController.getAllRequestByUserId(req, res, next);
    },
    
};

module.exports = requestOrderController;
