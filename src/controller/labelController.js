const Label = require('../models/label');
const Order = require('../models/order');
const ReturnOrder = require('../models/returnOrder');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/labels');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create unique filename with original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

// File filter - only allow PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const labelController = {
    // Upload multiple PDF labels
    uploadLabels: async (req, res, next) => {
        // Use multer middleware for file upload
        const uploadMiddleware = upload.array('labels', 10); // Allow up to 10 files at once
        
        uploadMiddleware(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            try {
                const files = req.files;
                const uploadedBy = req.body.userId || null;
                
                if (!files || files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No files uploaded'
                    });
                }
                
                // Save each file information to database
                const savedLabels = [];
                
                for (const file of files) {
                    const newLabel = new Label({
                        fileName: file.originalname,
                        filePath: file.path,
                        fileSize: file.size,
                        uploadedBy: uploadedBy
                    });
                    
                    const savedLabel = await newLabel.save();
                    savedLabels.push(savedLabel);
                }
                
                res.status(201).json({
                    success: true,
                    message: `${savedLabels.length} labels uploaded successfully`,
                    data: savedLabels
                });
            } catch (error) {
                console.error('Error uploading labels:', error);
                res.status(500).json({
                    success: false,
                    message: 'An error occurred while uploading labels',
                    error: error.message
                });
            }
        });
    },

    // Get all labels with pagination and search
    getAllLabels: async (req, res) => {
        try {
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Build search query using $and to combine multiple conditions
            const andConditions = [{ isDeleted: false }];

            // Search by file name
            if (req.query.search) {
                andConditions.push({ fileName: { $regex: req.query.search, $options: 'i' } });
            }

            // Handle used filter
            if (req.query.used !== undefined) {
                if (req.query.used === 'true') {
                    // Only show labels that have an associated order or returnOrder (used)
                    andConditions.push({
                        $or: [
                            { order: { $exists: true, $ne: null } },
                            { returnOrder: { $exists: true, $ne: null } }
                        ]
                    });
                } else {
                    // Only show labels that don't have any associated order (unused)
                    andConditions.push(
                        { $or: [{ order: { $exists: false } }, { order: null }] },
                        { $or: [{ returnOrder: { $exists: false } }, { returnOrder: null }] }
                    );
                }
            }

            // Handle order number filter
            let labels;
            if (req.query.orderNumber) {
                const searchPattern = { $regex: req.query.orderNumber, $options: 'i' };

                // Search in Order model (Regular orders)
                const orders = await Order.find({
                    orderNumber: searchPattern
                }).select('_id');
                const allOrderIds = orders.map(o => o._id);

                // Search in ReturnOrder model (by rma or orderNumber)
                const returnOrders = await ReturnOrder.find({
                    $or: [
                        { rma: searchPattern },
                        { orderNumber: searchPattern }
                    ]
                }).select('_id');
                const returnOrderIds = returnOrders.map(r => r._id);

                // Build filter to match labels with either order or returnOrder
                const orderFilter = [];
                if (allOrderIds.length > 0) {
                    orderFilter.push({ order: { $in: allOrderIds } });
                }
                if (returnOrderIds.length > 0) {
                    orderFilter.push({ returnOrder: { $in: returnOrderIds } });
                }

                // If no matches found, return empty results
                if (orderFilter.length === 0) {
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            pages: 0
                        }
                    });
                }

                // Add order filter as an $or condition
                andConditions.push({ $or: orderFilter });

                // Build final query
                const searchQuery = { $and: andConditions };

                // Count total documents matching the query
                const total = await Label.countDocuments(searchQuery);
                const pages = Math.ceil(total / limit);

                // Get paginated results
                labels = await Label.find(searchQuery)
                    .sort({ createdAt: 1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('uploadedBy', 'name email')
                    .populate('order', 'orderNumber')
                    .populate('returnOrder', 'rma orderNumber');

                return res.status(200).json({
                    success: true,
                    data: labels,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages
                    }
                });
            }

            // Build final query (no order number filter)
            const searchQuery = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

            // Count total documents matching the query
            const total = await Label.countDocuments(searchQuery);
            const pages = Math.ceil(total / limit);

            // Get paginated results
            labels = await Label.find(searchQuery)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .populate('uploadedBy', 'name email')
                .populate('order', 'orderNumber')
                .populate('returnOrder', 'rma orderNumber');

            res.status(200).json({
                success: true,
                data: labels,
                pagination: {
                    page,
                    limit,
                    total,
                    pages
                }
            });
        } catch (error) {
            console.error('Error fetching labels:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch labels',
                error: error.message
            });
        }
    },

    // Get a single label by ID
    getLabelById: async (req, res) => {
        try {
            const label = await Label.findById(req.params.id)
                .populate('uploadedBy', 'name email')
                .populate('order', 'orderNumber'); // Add this to include order number
            
            if (!label || label.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }
            
            res.status(200).json({
                success: true,
                data: label
            });
        } catch (error) {
            console.error('Error fetching label:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch label',
                error: error.message
            });
        }
    },

    // Update label (only filename can be updated)
    updateLabel: async (req, res) => {
        try {
            const { fileName } = req.body;
            
            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    message: 'File name is required'
                });
            }
            
            const label = await Label.findByIdAndUpdate(
                req.params.id,
                { fileName },
                { new: true, runValidators: true }
            );
            
            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }
            
            res.status(200).json({
                success: true,
                message: 'Label updated successfully',
                data: label
            });
        } catch (error) {
            console.error('Error updating label:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update label',
                error: error.message
            });
        }
    },

    // Permanently delete a label
    deleteLabel: async (req, res) => {
        try {
            const label = await Label.findById(req.params.id);

            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }

            // Delete the physical file from the server
            if (fs.existsSync(label.filePath)) {
                try {
                    fs.unlinkSync(label.filePath);
                    console.log(`✅ Physical file deleted: ${label.filePath}`);
                } catch (fileError) {
                    console.error(`⚠️  Failed to delete physical file: ${fileError.message}`);
                    // Continue with database deletion even if file deletion fails
                }
            } else {
                console.log(`⚠️  Physical file not found: ${label.filePath}`);
            }

            // Permanently delete from database
            await Label.findByIdAndDelete(req.params.id);

            console.log(`✅ Label permanently deleted from database: ${label._id}`);

            res.status(200).json({
                success: true,
                message: 'Label permanently deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting label:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete label',
                error: error.message
            });
        }
    },

    // View/download a PDF label
    viewLabel: async (req, res) => {
        try {
            const label = await Label.findById(req.params.id);
            
            if (!label || label.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }
            
            // Check if file exists on server
            if (!fs.existsSync(label.filePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found on server'
                });
            }
            
            // Stream the file to the client
            res.contentType('application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${label.fileName}"`);
            fs.createReadStream(label.filePath).pipe(res);
        } catch (error) {
            console.error('Error viewing label:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to view label',
                error: error.message
            });
        }
    },
    getOneUnusedLabel: async (req, res) => {
        try {
            const label = await Label.findOne({ used: false }).sort({ uploadDate: -1 }).limit(1);
            
            if (!label || label.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }
            
            res.status(200).json({
                success: true,
                label: label
            });
        } catch (error) {
            console.error('Error fetching unused label:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch unused label',
                error: error.message
            });
        }
    },
    // Get label assigned to an order
    getLabelOfOrder: async (req, res) => {
        try {
            const label = await Label.findOne({ order: req.params.id, isDeleted: false });

            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found for this order'
                });
            }

            res.status(200).json({
                success: true,
                label: label
            });
        } catch (error) {
            console.error('Error fetching label of order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch label of order',
                error: error.message
            });
        }
    },

    // Assign a label to an order
    assignLabelToOrder: async (req, res) => {
        try {
            const { labelId, orderId } = req.body;

            // Validate required fields
            if (!labelId || !orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Label ID and Order ID are required'
                });
            }

            const label = await Label.findById(labelId);
            if (!label || label.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }

            // STRICT CHECK: Ensure label has never been used
            if (label.used === true) {
                return res.status(400).json({
                    success: false,
                    message: 'Label has already been used and cannot be reused'
                });
            }

            // STRICT CHECK: Ensure label is not assigned to any order
            if (label.order) {
                return res.status(400).json({
                    success: false,
                    message: 'Label is already assigned to another order'
                });
            }

            // STRICT CHECK: Ensure label is not assigned to any return order
            if (label.returnOrder) {
                return res.status(400).json({
                    success: false,
                    message: 'Label is already assigned to a return order'
                });
            }

            const order = await Order.findById(orderId);
            if (!order || order.isdeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Check if order already has a label
            const existingLabel = await Label.findOne({ order: orderId, isDeleted: false });
            if (existingLabel) {
                return res.status(400).json({
                    success: false,
                    message: 'Order already has a label assigned'
                });
            }

            // Use atomic update to prevent race conditions
            const updatedLabel = await Label.findOneAndUpdate(
                {
                    _id: labelId,
                    used: { $ne: true },
                    $or: [{ order: { $exists: false } }, { order: null }]
                },
                {
                    $set: {
                        order: order._id,
                        used: true,
                        assignedAt: new Date()
                    }
                },
                { new: true }
            );

            if (!updatedLabel) {
                return res.status(400).json({
                    success: false,
                    message: 'Label was already assigned by another request'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Label assigned to order successfully',
                data: updatedLabel
            });
        } catch (error) {
            console.error('Error assigning label to order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign label to order',
                error: error.message
            });
        }
    },

    // ========================================================================
    // RETURN ORDER LABEL FUNCTIONS
    // ========================================================================

    // Get label assigned to a return order
    getLabelOfReturnOrder: async (req, res) => {
        try {
            const label = await Label.findOne({ returnOrder: req.params.id, isDeleted: false });

            if (!label) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found for this return order'
                });
            }

            res.status(200).json({
                success: true,
                label: label
            });
        } catch (error) {
            console.error('Error fetching label of return order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch label of return order',
                error: error.message
            });
        }
    },

    // Assign a label to a return order
    assignLabelToReturnOrder: async (req, res) => {
        try {
            const { labelId, orderId } = req.body;

            // Validate required fields
            if (!labelId || !orderId) {
                return res.status(400).json({
                    success: false,
                    message: 'Label ID and Order ID are required'
                });
            }

            const label = await Label.findById(labelId);
            if (!label || label.isDeleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Label not found'
                });
            }

            // STRICT CHECK: Ensure label has never been used
            if (label.used === true) {
                return res.status(400).json({
                    success: false,
                    message: 'Label has already been used and cannot be reused'
                });
            }

            // STRICT CHECK: Ensure label is not assigned to any order
            if (label.order) {
                return res.status(400).json({
                    success: false,
                    message: 'Label is already assigned to an order'
                });
            }

            // STRICT CHECK: Ensure label is not assigned to any return order
            if (label.returnOrder) {
                return res.status(400).json({
                    success: false,
                    message: 'Label is already assigned to another return order'
                });
            }

            const returnOrder = await ReturnOrder.findById(orderId);
            if (!returnOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Return order not found'
                });
            }

            // Check if return order already has a label
            const existingLabel = await Label.findOne({ returnOrder: orderId, isDeleted: false });
            if (existingLabel) {
                return res.status(400).json({
                    success: false,
                    message: 'Return order already has a label assigned'
                });
            }

            // Use atomic update to prevent race conditions
            const updatedLabel = await Label.findOneAndUpdate(
                {
                    _id: labelId,
                    used: { $ne: true },
                    $and: [
                        { $or: [{ order: { $exists: false } }, { order: null }] },
                        { $or: [{ returnOrder: { $exists: false } }, { returnOrder: null }] }
                    ]
                },
                {
                    $set: {
                        returnOrder: returnOrder._id,
                        used: true,
                        assignedAt: new Date()
                    }
                },
                { new: true }
            );

            if (!updatedLabel) {
                return res.status(400).json({
                    success: false,
                    message: 'Label was already assigned by another request'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Label assigned to return order successfully',
                data: updatedLabel
            });
        } catch (error) {
            console.error('Error assigning label to return order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to assign label to return order',
                error: error.message
            });
        }
    }
};

module.exports = labelController;