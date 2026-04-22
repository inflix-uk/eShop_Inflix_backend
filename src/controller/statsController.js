
const db = require("../../connections/mongo"); // Assuming you have a MongoDB connection setup
const bcrypt = require("bcrypt");
const User = require("../models/user"); // MongoDB models for User, Order, Products, Newsletter
const Order = require("../models/order");
const Products = require("../models/product");
const Newsletter = require("../models/newsletter");
const {
    sendNewsletterSubscriberWelcome,
    sendHotUkDealsWelcome,
} = require("../../email/NewsLetter/sendNewsletterEmails");
const ReturnOrder = require("../models/returnOrder");
const RequestOrder = require("../models/requestOrder");
const MediaFile = require("../models/mediaFile");
const blobStorage = require("../utils/blobStorage");

const crypto = require("crypto");



const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getFeedUploadPath } = require('../utils/feedUploadPath');
const { Parser } = require('json2csv');


// Helper function to delete all files in the directory
const emptyDirectory = (directoryPath) => {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const filePath = path.join(directoryPath, file);
            if (fs.lstatSync(filePath).isFile()) {
                fs.unlinkSync(filePath); // Delete each file
            }
        });
    }
};

// Helper function to sanitize filename (replace spaces with hyphens)
const sanitizeFileName = (fileName) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
        // No extension, sanitize entire filename
        return fileName.replace(/\s+/g, "-");
    }
    // Has extension, sanitize only the name part
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    return nameWithoutExt.replace(/\s+/g, "-") + extension;
};

// Helper function to extract title from filename (filename without extension)
const extractTitleFromFileName = (fileName) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1) {
        return fileName; // No extension, return filename as is
    }
    return fileName.substring(0, lastDotIndex);
};


const statsController = {

    uploadCSV: (req, res) => {
        const products = req.body;
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid or empty product data provided." });
        }
    
        const fields = [
            { label: "id", value: "id" },
            { label: "title", value: "title" },
            { label: "description", value: "description" },
            { label: "availability", value: "availability" },
            { label: "link", value: "link" },
            { label: "image link", value: "image_link" },
            { label: "additional image link", value: "additional_image_link" },
            { label: "price", value: "price" },
            { label: "sale_price", value: "sale_price" },
            { label: "identifier exists", value: "identifier_exists" },
            { label: "gtin", value: "gtin" },
            { label: "mpn", value: "mpn" },
            { label: "brand", value: "brand" },
            { label: "condition", value: "condition" },
            { label: "custom_label_0", value: "custom_label_0" },
            { label: "color", value: "color" },
            { label: "capacity", value: "capacity" },
            { label: "shipping", value: "shipping" },
            { label: "tax", value: "tax" },
            { label: "mobile link", value: "mobile_link" },
            { label: "google_product_category", value: "google_product_category" },
        ];
    
        const json2csvParser = new Parser({ fields });
    
        try {
            const csv = json2csvParser.parse(products);
    
            const uploadPath = getFeedUploadPath();
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
    
            emptyDirectory(uploadPath);
    
            const filePath = path.join(uploadPath, 'products-feed'+ '.csv');
    
            fs.writeFileSync(filePath, csv);
    
            console.log('CSV file written successfully to:', filePath);
    
            return res.json({
                message: "CSV file created successfully!",
                filePath: filePath,
                code: 200
            });
        } catch (err) {
            console.error('Error creating CSV file:', err);
            return res.status(500).json({
                message: "Error creating CSV file",
                error: err.message
            });
        }
    },

    // Export ALL products (both in-stock and out-of-stock) with dynamic availability
    uploadCSVAllProducts: (req, res) => {
        const products = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid or empty product data provided." });
        }

        const fields = [
            { label: "id", value: "id" },
            { label: "title", value: "title" },
            { label: "description", value: "description" },
            { label: "availability", value: "availability" },
            { label: "link", value: "link" },
            { label: "image link", value: "image_link" },
            { label: "additional image link", value: "additional_image_link" },
            { label: "price", value: "price" },
            { label: "sale_price", value: "sale_price" },
            { label: "identifier exists", value: "identifier_exists" },
            { label: "gtin", value: "gtin" },
            { label: "mpn", value: "mpn" },
            { label: "brand", value: "brand" },
            { label: "condition", value: "condition" },
            { label: "custom_label_0", value: "custom_label_0" },
            { label: "color", value: "color" },
            { label: "capacity", value: "capacity" },
            { label: "shipping", value: "shipping" },
            { label: "tax", value: "tax" },
            { label: "mobile link", value: "mobile_link" },
            { label: "google_product_category", value: "google_product_category" },
        ];

        const json2csvParser = new Parser({ fields });

        try {
            const csv = json2csvParser.parse(products);

            const uploadPath = getFeedUploadPath();
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            // Don't empty directory - keep other feed files
            const filePath = path.join(uploadPath, 'all-products-feed.csv');

            fs.writeFileSync(filePath, csv);

            console.log('CSV file (all products) written successfully to:', filePath);

            return res.json({
                message: "All Products CSV file created successfully!",
                filePath: filePath,
                code: 200
            });
        } catch (err) {
            console.error('Error creating CSV file:', err);
            return res.status(500).json({
                message: "Error creating CSV file",
                error: err.message
            });
        }
    },

    uploadCSVWithAccessories: (req, res) => {
        const products = req.body;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: "Invalid or empty product data provided." });
        }

        const fields = [
            { label: "id", value: "id" },
            { label: "title", value: "title" },
            { label: "description", value: "description" },
            { label: "availability", value: "availability" },
            { label: "link", value: "link" },
            { label: "image link", value: "image_link" },
            { label: "additional image link", value: "additional_image_link" },
            { label: "price", value: "price" },
            { label: "sale_price", value: "sale_price" },
            { label: "identifier exists", value: "identifier_exists" },
            { label: "gtin", value: "gtin" },
            { label: "mpn", value: "mpn" },
            { label: "brand", value: "brand" },
            { label: "condition", value: "condition" },
            { label: "custom_label_0", value: "custom_label_0" },
            { label: "color", value: "color" },
            { label: "capacity", value: "capacity" },
            { label: "shipping", value: "shipping" },
            { label: "tax", value: "tax" },
            { label: "mobile link", value: "mobile_link" },
            { label: "google_product_category", value: "google_product_category" },
        ];

        const json2csvParser = new Parser({ fields });

        try {
            const csv = json2csvParser.parse(products);

            const uploadPath = getFeedUploadPath();
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            emptyDirectory(uploadPath);

            const filePath = path.join(uploadPath, 'products-feed-with-accessories'+ '.csv');

            fs.writeFileSync(filePath, csv);

            console.log('CSV file written successfully to:', filePath);

            return res.json({
                message: "CSV file created successfully!",
                filePath: filePath,
                code: 200
            });
        } catch (err) {
            console.error('Error creating CSV file:', err);
            return res.status(500).json({
                message: "Error creating CSV file",
                error: err.message
            });
        }
    },

    /** Serves merchant feed CSV from disk (Lambda/Vercel write to /tmp; static /uploads may miss). */
    downloadFeedCsv: (req, res) => {
        const allowed = new Set([
            'products-feed.csv',
            'all-products-feed.csv',
            'products-feed-with-accessories.csv',
        ]);
        const filename = path.basename(req.params.filename || '');
        if (!allowed.has(filename)) {
            return res.status(404).json({ message: 'Not found' });
        }
        const feedDir = getFeedUploadPath();
        const fullPath = path.join(feedDir, filename);
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.sendFile(path.resolve(fullPath));
    },

    getStats: async (req, res, next) => {
        // Define the getDateRange function inside getStats
        const getDateRange = (filter) => {
            const currentDate = new Date();
            let startDate;

            switch (filter) {
                case '1day':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case '7days':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '1month':
                    startDate = new Date(currentDate);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'custom':
                    // Assuming custom date range is passed as startDate and endDate in the request body
                    startDate = new Date(req.body.startDate);
                    currentDate = new Date(req.body.endDate);
                    break;
                default:
                    // Default to "all time"
                    startDate = new Date('1970-01-01'); // Unix epoch start date
            }

            return { startDate, endDate: currentDate };
        };

        try {


            // Get date range based on filter
            const filter = req.query.filter; // Default to '1day' if no filter is provided
            const { startDate, endDate } = getDateRange(filter);

            // Retrieve all users from the database
            const users = await User.find({
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const orders = await Order.find({
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const products = await Products.find({
                createdAt: { $gte: startDate, $lt: endDate }
            });

          
            const pendingOrders = await Order.countDocuments({
                status: 'Pending',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalPendingreturnOrders = await ReturnOrder.countDocuments({
                status: 'Pending',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalPendingRequestOrders = await RequestOrder.countDocuments({
                status: 'Pending',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const totalUsers = users.length;
            const totalOrders = orders.length;
            const totalProducts = products.length;


            res.json({
                message: 'Stats retrieved successfully',
                stats: {
                    totalUsers,
                    totalOrders,
                    totalProducts,
                    pendingOrders,
                    TotalPendingreturnOrders,
                    TotalPendingRequestOrders,
                  
                },
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving stats:", error);
            res.status(500).json({
                message: "Internal server error",
                status: 500
            });
        }
    },
    getStats2: async (req, res, next) => {
        // Define the getDateRange function inside getStats
        const getDateRange = (filter) => {
            const currentDate = new Date();
            let startDate;

            switch (filter) {
                case '1day':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case '7days':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '1month':
                    startDate = new Date(currentDate);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'custom':
                    // Assuming custom date range is passed as startDate and endDate in the request body
                    startDate = new Date(req.body.startDate);
                    currentDate = new Date(req.body.endDate);
                    break;
                default:
                    // Default to "all time"
                    startDate = new Date('1970-01-01'); // Unix epoch start date
            }

            return { startDate, endDate: currentDate };
        };

        try {


            // Get date range based on filter
            const filter = req.query.filter; // Default to '1day' if no filter is provided
            const { startDate, endDate } = getDateRange(filter);

            const deletedOrders = await Order.countDocuments({
                isdeleted: true,
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalreturnOrders = await ReturnOrder.countDocuments({
                createdAt: { $gte: startDate, $lt: endDate }
            });


            const TotalPendingreturnOrders = await ReturnOrder.countDocuments({
                status: 'Pending',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalSentreturnOrders = await ReturnOrder.countDocuments({
                status: 'Return Sent',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            // const TotalSentForRepairreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Sent For Repair',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            const TotalRefundedreturnOrders = await ReturnOrder.countDocuments({
                status: 'Refunded',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            // const TotalCompletedreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Completed',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            const TotalWaitingForCustomerreturnOrders = await ReturnOrder.countDocuments({
                status: 'Waiting for Customer',
                createdAt: { $gte: startDate, $lt: endDate }
            });


            const TotalWaitingForDeliveryreturnOrders = await ReturnOrder.countDocuments({
                status: 'Waiting for Delivery',
                createdAt: { $gte: startDate, $lt: endDate }
            });

         

            res.json({
                message: 'Stats retrieved successfully',
                stats: {
                 
                    TotalreturnOrders,
                    TotalPendingreturnOrders,
                    TotalSentreturnOrders,
                    // TotalSentForRepairreturnOrders,
                    TotalRefundedreturnOrders,
                    // TotalCompletedreturnOrders,
                    TotalWaitingForCustomerreturnOrders,
                    TotalWaitingForDeliveryreturnOrders,
                   
                },
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving stats:", error);
            res.status(500).json({
                message: "Internal server error",
                status: 500
            });
        }
    },
    getStats3: async (req, res, next) => {
        // Define the getDateRange function inside getStats
        const getDateRange = (filter) => {
            const currentDate = new Date();
            let startDate;

            switch (filter) {
                case '1day':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 1);
                    break;
                case '7days':
                    startDate = new Date(currentDate);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case '1month':
                    startDate = new Date(currentDate);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'custom':
                    // Assuming custom date range is passed as startDate and endDate in the request body
                    startDate = new Date(req.body.startDate);
                    currentDate = new Date(req.body.endDate);
                    break;
                default:
                    // Default to "all time"
                    startDate = new Date('1970-01-01'); // Unix epoch start date
            }

            return { startDate, endDate: currentDate };
        };

        try {


            // Get date range based on filter
            const filter = req.query.filter; // Default to '1day' if no filter is provided
            const { startDate, endDate } = getDateRange(filter);

            // const deletedOrders = await Order.countDocuments({
            //     isdeleted: true,
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            // const TotalreturnOrders = await ReturnOrder.countDocuments({
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            // const TotalClaimreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Claim',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            // const TotalClaimFiledreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Claim Filed',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });


            // const TotalClaimApprovedreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Claim Approved',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            // const TotalClaimRejectedreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Claim Rejected',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            // const TotalOutOfWarrantyreturnOrders = await ReturnOrder.countDocuments({
            //     status: 'Out of Warranty',
            //     createdAt: { $gte: startDate, $lt: endDate }
            // });

            const totalRequestOrders = await RequestOrder.countDocuments({
                createdAt: { $gte: startDate, $lt: endDate }
            })

            const TotalAcceptedRequestOrders = await RequestOrder.countDocuments({
                status: 'Accepted',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalPendingRequestOrders = await RequestOrder.countDocuments({
                status: 'Pending',
                createdAt: { $gte: startDate, $lt: endDate }
            });

            const TotalRejectedRequestOrders = await RequestOrder.countDocuments({
                status: 'Rejected',
                createdAt: { $gte: startDate, $lt: endDate }
            });



            res.json({
                message: 'Stats retrieved successfully',
                stats: {
                 
                    // TotalClaimreturnOrders,
                    // TotalClaimFiledreturnOrders,
                    // TotalClaimApprovedreturnOrders,
                    // TotalClaimRejectedreturnOrders,
                    // TotalOutOfWarrantyreturnOrders,
                    totalRequestOrders,
                    TotalAcceptedRequestOrders,
                    TotalPendingRequestOrders,
                    TotalRejectedRequestOrders
                },
                status: 201
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving stats:", error);
            res.status(500).json({
                message: "Internal server error",
                status: 500
            });
        }
    },
  // GET /get/stats4?filter=1day|7days|1month|custom&startDate=2025-08-01&endDate=2025-08-28
    getStats4: async (req, res) => {
        // build a robust date range
        const buildRange = () => {
        const q = (req.query.filter || '1day').toLowerCase();
        let endDate = new Date(); // now
        let startDate;
    
        const startOfDay = (d) => { d.setHours(0,0,0,0); return d; };
        const endOfDay   = (d) => { d.setHours(23,59,59,999); return d; };
    
        switch (q) {
            case '1day': {
            startDate = startOfDay(new Date());
            // include today only
            endDate = endOfDay(new Date());
            break;
            }
            case '7days': {
            endDate = endOfDay(new Date());
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 6); // last 7 calendar days incl. today
            startOfDay(startDate);
            break;
            }
            case '1month': {
            endDate = endOfDay(new Date());
            startDate = new Date(endDate);
            startDate.setMonth(startDate.getMonth() - 1);
            startOfDay(startDate);
            break;
            }
            case 'custom': {
            const s = new Date(req.query.startDate || req.body?.startDate);
            const e = new Date(req.query.endDate   || req.body?.endDate   || Date.now());
            if (isNaN(s.getTime()) || isNaN(e.getTime())) {
                throw new Error('Invalid custom date range');
            }
            startDate = startOfDay(s);
            endDate = endOfDay(e);
            break;
            }
            default: { // all time
            startDate = new Date('1970-01-01T00:00:00.000Z');
            endDate = endOfDay(new Date());
            }
        }
        return { startDate, endDate };
        };
    
        try {
        const { startDate, endDate } = buildRange();
    
        // Build filters once
        const range = { createdAt: { $gte: startDate, $lt: endDate } };
        const active = { ...range, isdeleted: false };
    
        // Use counts only — no heavy .find()
        const [
            totalOrders,         // active orders in range
            pendingOrders,
            approvedOrders,
            cancelledOrders,
            shippedOrders,
            deletedOrders
        ] = await Promise.all([
            Order.countDocuments(active),
            Order.countDocuments({ ...active, status: 'Pending' }),
            Order.countDocuments({ ...active, status: 'Approved' }),
            Order.countDocuments({ ...active, status: 'Cancelled' }),
            Order.countDocuments({ ...active, status: 'Shipped' }),
            Order.countDocuments({ ...range, isdeleted: true }),
        ]);

        return res.status(200).json({
            message: 'Stats retrieved successfully',
            stats: {
            totalOrders,
            pendingOrders,
            approvedOrders,
            cancelledOrders,
            shippedOrders,
            deletedOrders,
            // Optional: echo the resolved window for debugging
            window: { startDate, endDate }
            },
            status: 200,
        });
        } catch (err) {
        console.error('Error retrieving stats:', err);
        return res.status(500).json({ message: 'Internal server error', status: 500 });
        }
    },
  
    getFiles: async (req, res, next) => {
        const rootDirectory = path.join(__dirname, '../uploads'); // Root 'uploads' directory

        try {
            try {
                fs.mkdirSync(rootDirectory, { recursive: true });
            } catch (mkdirErr) {
                console.error('Could not ensure uploads directory:', mkdirErr);
            }

            // Get base URL from environment variable or construct from request
            let baseUrl = process.env.BACKEND_URL;
            if (!baseUrl) {
                // Fallback: construct from request if BACKEND_URL is not set
                const protocol = req.protocol || 'http';
                const host = req.get('host') || 'localhost:4000';
                baseUrl = `${protocol}://${host}`;
            }
            // Ensure baseUrl doesn't end with a slash
            baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

            // OPTIMIZATION: Fetch all media file data in ONE database query instead of N queries
            let titleMap = {};
            let altTextMap = {};
            let idMap = {};
            try {
                const allMediaFiles = await MediaFile.find({}, { filePath: 1, title: 1, altText: 1, _id: 1 });
                // Create maps: filePath -> title, altText, and _id for O(1) lookup
                allMediaFiles.forEach(mediaFile => {
                    if (mediaFile.title) {
                        titleMap[mediaFile.filePath] = mediaFile.title;
                    }
                    if (mediaFile.altText) {
                        altTextMap[mediaFile.filePath] = mediaFile.altText;
                    }
                    if (mediaFile._id) {
                        idMap[mediaFile.filePath] = mediaFile._id.toString();
                    }
                });
            } catch (dbErr) {
                // If database lookup fails, continue without metadata (graceful degradation)
                console.error('Error fetching media file data:', dbErr);
            }

            const lookupMeta = (pathname) => {
                const keys = [pathname, pathname.replace(/^uploads\//, '')];
                let title = null;
                let altText = null;
                let fileId = null;
                for (const k of keys) {
                    if (!k) continue;
                    if (title == null && titleMap[k]) title = titleMap[k];
                    if (altText == null && altTextMap[k]) altText = altTextMap[k];
                    if (fileId == null && idMap[k]) fileId = idMap[k];
                }
                return { title, altText, _id: fileId };
            };

            // Vercel Blob: primary media source when BLOB_READ_WRITE_TOKEN is set
            if (blobStorage.isConfigured()) {
                try {
                    const blobs = await blobStorage.listAllBlobs();
                    const folderMap = new Map();

                    for (const b of blobs) {
                        const pathname = (b.pathname || '').replace(/\\/g, '/').trim();
                        if (!pathname) continue;

                        const slash = pathname.indexOf('/');
                        const folder = slash === -1 ? 'root' : pathname.slice(0, slash);
                        const fileName = slash === -1 ? pathname : pathname.slice(slash + 1);
                        if (!fileName) continue;
                        if (folder === 'images' || folder === 'feed') continue;

                        const meta = lookupMeta(pathname);
                        let title = meta.title;
                        if (!title) {
                            title = extractTitleFromFileName(fileName);
                        }

                        const fileObj = {
                            name: fileName,
                            path: `uploads/${pathname}`,
                            url: b.url,
                            size: b.size,
                            title,
                            altText: meta.altText,
                            _id: meta._id,
                            storage: 'blob',
                        };

                        if (!folderMap.has(folder)) {
                            folderMap.set(folder, []);
                        }
                        folderMap.get(folder).push(fileObj);
                    }

                    const allContents = Array.from(folderMap.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([name, contents]) => ({ name, contents }));

                    return res.status(200).json({
                        success: true,
                        status: 200,
                        contents: allContents,
                    });
                } catch (blobErr) {
                    console.error('Blob media list failed, falling back to disk:', blobErr);
                }
            }

            // Function to recursively get all files from a directory and its subdirectories
            const getAllFilesInDirectory = (dirPath, baseDir) => {
                const files = [];
                try {
                    const items = fs.readdirSync(dirPath);
                    
                    items.forEach((item) => {
                        const itemPath = path.join(dirPath, item);
                        const stats = fs.statSync(itemPath);
                        
                        if (stats.isFile()) {
                            // Get relative path from uploads root
                            const relativePath = path.relative(baseDir, itemPath).replace(/\\/g, '/');
                            // Ensure path includes "uploads/" prefix for proper URL construction
                            const filePath = relativePath.startsWith('uploads/') ? relativePath : `uploads/${relativePath}`;
                            
                            // Construct full URL
                            const url = `${baseUrl}/${filePath}`;
                            
                            // Title = filename without extension (per spec)
                            // If title exists in DB, use it; otherwise extract from filename
                            let title = titleMap[relativePath];
                            if (!title) {
                                // Extract title from filename (filename without extension)
                                title = extractTitleFromFileName(item);
                            }
                            
                            // Look up altText and _id from pre-loaded maps (O(1) lookup)
                            const altText = altTextMap[relativePath] || null;
                            const fileId = idMap[relativePath] || null;
                            
                            files.push({
                                name: item,
                                path: filePath,
                                url: url,
                                size: stats.size,
                                title: title,
                                altText: altText,
                                _id: fileId
                            });
                        } else if (stats.isDirectory()) {
                            // Recursively get files from subdirectories
                            const subFiles = getAllFilesInDirectory(itemPath, baseDir);
                            files.push(...subFiles);
                        }
                    });
                } catch (err) {
                    console.error(`Error reading directory ${dirPath}:`, err);
                }
                
                return files;
            };

            // Function to get directory contents (organize by top-level directories)
        const getDirectoryContents = (directory) => {
            let results = [];
            const list = fs.readdirSync(directory);

            list.forEach((item) => {
                const itemPath = path.join(directory, item);
                const stats = fs.statSync(itemPath);

                if (stats && stats.isDirectory()) {
                        // Filter out "images" and "feed" directories as per spec
                        if (item === 'images' || item === 'feed') {
                            return; // Skip these directories
                        }
                        
                        // Recursively get ALL files from this directory and subdirectories
                        const dirContents = getAllFilesInDirectory(itemPath, rootDirectory);
                        
                    results.push({
                        name: item,
                            contents: dirContents
                    });
                }
            });

            return results;
        };

            // Get all files and directories starting from the root directory
            const allContents = getDirectoryContents(rootDirectory);

            res.status(200).json({
                success: true,
                status: 200,
                contents: allContents
            });
        } catch (err) {
            console.error("Error scanning directory:", err);
            res.status(500).json({
                success: false,
                error: 'Unable to scan directory!'
            });
        }
    },

    //     try {
    //         const { fullName, email, mode } = req.body; // Destructure the request body

    //         // Check if email is already subscribed
    //         const existingSubscriber = await Newsletter.findOne({ email });
    //         if (existingSubscriber) {
    //             return res.json({
    //                 message: 'Email is already subscribed',
    //                 status: 400
    //             });
    //         }

    //         // Create a new newsletter subscriber entry
    //         const newSubscriber = new Newsletter({
    //             fullName,
    //             email,
    //             mode
    //         });

    //         // Save the new subscriber to the database
    //         await newSubscriber.save();

    //         res.json({
    //             message: 'Newsletter subscribed successfully',
    //             status: 201,
    //             subscriber: newSubscriber
    //         });
    //     } catch (error) {
    //         // Handle errors
    //         console.error("Error subscribing to the newsletter:", error);
    //         res.json({
    //             message: "Internal server error",
    //             status: 500
    //         });
    //     }
    // },
    getNewsletters: async (req, res, next) => {
        try {
            const subscribers = await Newsletter.find();
            res.json({
                message: 'Subscribers retrieved successfully',
                subscribers
            });
        } catch (error) {
            // Handle errors
            console.error("Error retrieving subscribers:", error);
            res.json({
                message: "Internal server error",
                status: 500
            });
        }
    },

    NewsletterSubscribers: async (req, res, next) => {
        try {
            const { fullName, email, mode } = req.body;
            const trimmedEmail = typeof email === 'string' ? email.trim() : '';

            if (!trimmedEmail) {
                return res.status(400).json({
                    message: 'Email is required',
                    status: 400,
                });
            }

            const existingSubscriber = await Newsletter.findOne({ email: trimmedEmail });
            if (existingSubscriber) {
                return res.status(400).json({
                    message: 'Email is already subscribed',
                    status: 400,
                });
            }

            const newSubscriber = new Newsletter({
                fullName: fullName ?? null,
                email: trimmedEmail,
                mode: mode || 'website',
            });

            await newSubscriber.save();

            try {
                await sendNewsletterSubscriberWelcome({ to: trimmedEmail, fullName });
            } catch (mailErr) {
                console.error(
                    'Error sending newsletter welcome email:',
                    mailErr?.message || mailErr,
                    mailErr?.response || ''
                );
            }

            return res.status(201).json({
                message: 'Newsletter subscribed successfully',
                status: 201,
            });
        } catch (error) {
            console.error('Error subscribing to the newsletter:', error);
            return res.status(500).json({
                message: 'Internal server error',
                status: 500,
            });
        }
    },
    blackfridaymodal: async (req, res, next) => {
        try {
            const { fullName, email, mode } = req.body; // Destructure the request body

            // Check if email is already subscribed (optional - you can remove this if you want to allow duplicates)
            const existingSubscriber = await Newsletter.findOne({ email });
            if (existingSubscriber) {
                return res.json({
                    message: 'Email is already subscribed',
                    status: 400
                });
            }

            // Create a new newsletter subscriber entry
            const newSubscriber = new Newsletter({
                fullName,
                email,
                mode
            });

            // Save the new subscriber to the database
            await newSubscriber.save();

            try {
                await sendHotUkDealsWelcome({ to: email });
            } catch (mailErr) {
                console.error("Error sending Hot UK Deals email:", mailErr);
            }

            // Respond with success message
            res.json({
                message: 'Hot UK Deals subscription successful',
                status: 201,
                
            });
        } catch (error) {
            // Handle errors
            console.error("Error processing Hot UK Deals subscription:", error);
            res.json({
                message: "Internal server error",
                status: 500
            });
        }
    },
    // GET /get/order/stats - Fast dedicated order stats for tabs
    getOrderStats: async (req, res) => {
        try {
            // Use optimized count queries with Promise.all for parallel execution
            const [
                totalOrders,
                pendingOrders,
                approvedOrders,
                shippedOrders
            ] = await Promise.all([
                Order.countDocuments({ isdeleted: false }),
                Order.countDocuments({ isdeleted: false, status: 'Pending' }),
                Order.countDocuments({ isdeleted: false, status: 'Approved' }),
                Order.countDocuments({ isdeleted: false, status: 'Shipped' }),
            ]);

            return res.status(200).json({
                message: 'Order stats retrieved successfully',
                stats: {
                    totalOrders,
                    pendingOrders,
                    approvedOrders,
                    shippedOrders,
                },
                status: 200,
            });
        } catch (err) {
            console.error('Error retrieving order stats:', err);
            return res.status(500).json({ message: 'Internal server error', status: 500 });
        }
    },

    getTopProductSold: async (req, res, next) => {
        try {
            // Perform aggregation to get the top products grouped by productName
            const topProducts = await Order.aggregate([
                { $match: { status: "Shipped" } }, 
                { $unwind: "$cart" }, 
                {
                    $group: {
                        _id: "$cart.productName", 
                        productName: { $first: "$cart.productName" },
                        totalQuantity: { $sum: "$cart.qty" }, 
                        variantImages: { $first: "$cart.variantImages" }, 
                        productthumbnail: { $first: "$cart.productthumbnail" },
                        nameCounts: {
                            $push: {
                                name: "$cart.name",
                                count: "$cart.qty"
                            }
                        }
                    }
                },
                { $sort: { totalQuantity: -1 } }, 
                { $limit: 10 } 
            ]);
    
            // Check if products are found
            if (!topProducts || topProducts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "No products found."
                });
            }
    
            // Process the data to compute the correct name counts
            const processedProducts = topProducts.map((product) => {
                // Aggregate name counts
                const aggregatedNameCounts = product.nameCounts.reduce((acc, curr) => {
                    if (acc[curr.name]) {
                        acc[curr.name] += curr.count;
                    } else {
                        acc[curr.name] = curr.count;
                    }
                    return acc;
                }, {});
    
                // Convert aggregatedNameCounts to an array
                const nameCountsArray = Object.entries(aggregatedNameCounts).map(([name, count]) => ({
                    name,
                    count
                }));
    
                // Find the most sold name
                const mostSoldName = Object.keys(aggregatedNameCounts).reduce((a, b) =>
                    aggregatedNameCounts[a] > aggregatedNameCounts[b] ? a : b
                );
    
                return {
                    ...product,
                    nameCounts: nameCountsArray,
                    mostSoldName,
                    mostSoldCount: aggregatedNameCounts[mostSoldName]
                };
            });
    
            // Send response with processed products
            res.status(200).json({
                success: true,
                status: 200,
                message: "Top sold products fetched successfully",
                topProducts: processedProducts
            });
        } catch (error) {
            console.error("Error fetching top sold products:", error);
    
            // Handle errors
            res.status(500).json({
                success: false,
                message: "Failed to fetch top sold products",
                error: error.message
            });
        }
    },
    
    // Rename a file in the uploads directory and/or update title and altText
    renameFile: async (req, res) => {
        try {
            const { directory, oldFileName, newFileName, filePath, title, altText } = req.body;

            // Validate required fields
            if (!directory || !oldFileName || !newFileName) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: directory, oldFileName, and newFileName are required'
                });
            }

            // Sanitize newFileName (replace spaces with hyphens)
            const sanitizedNewFileName = sanitizeFileName(newFileName);
            
            // Extract expected title from sanitized filename (filename without extension)
            const expectedTitle = extractTitleFromFileName(sanitizedNewFileName);
            
            // Validate title matches filename without extension (if title is provided)
            if (title !== undefined && title !== null && title.trim() !== '') {
                if (title.trim() !== expectedTitle) {
                    return res.status(400).json({
                        success: false,
                        error: `Title must match filename without extension. Expected: "${expectedTitle}", got: "${title.trim()}"`
                    });
                }
            }
            
            // Use the extracted title from filename (per spec: title = filename without extension)
            const finalTitle = expectedTitle;
            
            // Check if we're renaming or just updating altText
            const isRenaming = sanitizedNewFileName !== oldFileName;
            const isUpdatingAltText = altText !== undefined && altText !== null;

            // Construct the full paths
            const uploadsRoot = path.join(__dirname, '../uploads');
            const baseDirectory = path.join(uploadsRoot, directory);
            
            // Handle filePath - it might be:
            // 1. A relative path after uploads/{directory}/ (e.g., "images" or "2024/01")
            // 2. An absolute path that includes the full file path
            // 3. Empty/null (file is directly in uploads/{directory}/)
            let targetDirectory = baseDirectory;
            let actualOldFileName = path.basename(oldFileName);
            let actualNewFileName = path.basename(sanitizedNewFileName);
            
            if (filePath && filePath.trim() !== '') {
                const normalizedFilePath = path.normalize(filePath);
                
                // If filePath is an absolute path
                if (path.isAbsolute(normalizedFilePath)) {
                    const normalizedUploadsRoot = path.normalize(uploadsRoot);
                    
                    // Check if the absolute path is under uploads directory
                    if (normalizedFilePath.startsWith(normalizedUploadsRoot)) {
                        // Extract relative path and use it
                        const relativePath = path.relative(normalizedUploadsRoot, normalizedFilePath).replace(/\\/g, '/');
                        
                        // Check if it's a file (has extension) or directory
                        if (fs.existsSync(normalizedFilePath)) {
                            const stats = fs.statSync(normalizedFilePath);
                            if (stats.isFile()) {
                                // It's a file - use its directory and filename
                                targetDirectory = path.dirname(normalizedFilePath);
                                actualOldFileName = path.basename(normalizedFilePath);
                            } else {
                                // It's a directory
                                targetDirectory = normalizedFilePath;
                            }
                        } else {
                            // Path doesn't exist - extract directory from path
                            if (path.extname(relativePath)) {
                                // Has extension, so it's a file path
                                targetDirectory = path.dirname(normalizedFilePath);
                                actualOldFileName = path.basename(normalizedFilePath);
                            } else {
                                // No extension, treat as directory
                                targetDirectory = normalizedFilePath;
                            }
                        }
                    } else {
                        // Absolute path but not under uploads - try to find uploads in path
                        const uploadsIndex = normalizedFilePath.toLowerCase().indexOf('uploads');
                        if (uploadsIndex !== -1) {
                            const afterUploads = normalizedFilePath.substring(uploadsIndex + 'uploads'.length);
                            const relativePath = afterUploads.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
                            
                            // Remove directory name if it's the first part (to avoid duplication)
                            let cleanRelativePath = relativePath;
                            if (cleanRelativePath.startsWith(directory + '/')) {
                                cleanRelativePath = cleanRelativePath.substring(directory.length + 1);
                            } else if (cleanRelativePath === directory) {
                                cleanRelativePath = '';
                            }
                            
                            if (path.extname(cleanRelativePath)) {
                                // It's a file path
                                const fullPath = path.join(uploadsRoot, cleanRelativePath);
                                targetDirectory = path.dirname(fullPath);
                                actualOldFileName = path.basename(cleanRelativePath);
                            } else {
                                // It's a directory path
                                targetDirectory = path.join(uploadsRoot, cleanRelativePath);
                            }
                        } else {
                            // Can't determine path structure
                            return res.status(400).json({
                                success: false,
                                error: `Invalid file path: ${filePath}`
                            });
                        }
                    }
                } else {
                    // Relative path - normalize it
                    let normalizedPath = filePath.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '');
                    
                    // Remove "uploads/" prefix if present
                    if (normalizedPath.startsWith('uploads/')) {
                        normalizedPath = normalizedPath.substring('uploads/'.length);
                    }
                    
                    // Remove directory name if it's the first part (to avoid duplication)
                    if (normalizedPath.startsWith(directory + '/')) {
                        normalizedPath = normalizedPath.substring(directory.length + 1);
                    } else if (normalizedPath === directory) {
                        normalizedPath = '';
                    }
                    
                    // Remove filename if included
                    if (normalizedPath.endsWith(actualOldFileName)) {
                        const pathWithoutFile = normalizedPath.substring(0, normalizedPath.length - actualOldFileName.length).replace(/\/$/, '');
                        if (pathWithoutFile) {
                            targetDirectory = path.join(baseDirectory, pathWithoutFile);
                        } else {
                            // File is directly in the directory
                            targetDirectory = baseDirectory;
                        }
                    } else if (normalizedPath) {
                        targetDirectory = path.join(baseDirectory, normalizedPath);
                    } else {
                        // No additional path, file is directly in baseDirectory
                        targetDirectory = baseDirectory;
                    }
                }
            }

            // Construct old and new file paths
            const oldFilePath = path.join(targetDirectory, actualOldFileName);
            const newFilePath = path.join(targetDirectory, actualNewFileName);

            // Normalize paths for cross-platform compatibility
            const normalizedOldPath = path.normalize(oldFilePath);
            const normalizedNewPath = path.normalize(newFilePath);
            const normalizedTargetDir = path.normalize(targetDirectory);

            // Ensure the target directory exists
            if (!fs.existsSync(normalizedTargetDir)) {
                return res.status(404).json({
                    success: false,
                    error: `Directory not found: ${normalizedTargetDir}`,
                    searchedPath: normalizedTargetDir
                });
            }

            // Check if the old file exists
            if (!fs.existsSync(normalizedOldPath)) {
                // Try to list files in the directory to help with debugging
                let availableFiles = [];
                try {
                    availableFiles = fs.readdirSync(normalizedTargetDir);
                } catch (err) {
                    // Ignore readdir errors
                }

                return res.status(404).json({
                    success: false,
                    error: `File not found: ${actualOldFileName}`,
                    searchedPath: normalizedOldPath,
                    directory: normalizedTargetDir,
                    availableFiles: availableFiles.slice(0, 10) // Show first 10 files for debugging
                });
            }

            // Get relative paths for database operations
            const oldRelativePath = path.relative(uploadsRoot, normalizedOldPath).replace(/\\/g, '/');
            let newRelativePath = null;
            if (isRenaming) {
                newRelativePath = path.relative(uploadsRoot, normalizedNewPath).replace(/\\/g, '/');
            }

            // Check if the new file already exists (only if renaming)
            if (isRenaming && fs.existsSync(normalizedNewPath)) {
                return res.status(409).json({
                    success: false,
                    error: `File already exists: ${actualNewFileName}`
                });
            }

            // Handle file rename if needed
            if (isRenaming) {
                // Rename the physical file
                await fs.promises.rename(normalizedOldPath, normalizedNewPath);
            }

            // Determine success message
            let message = 'File updated successfully';
            if (isRenaming && isUpdatingAltText) {
                message = 'Filename and alt text updated successfully';
            } else if (isRenaming) {
                message = 'Filename updated successfully';
            } else if (isUpdatingAltText) {
                message = 'Alt text updated successfully';
            }

            // Update or create media file record in database
            try {
                if (isRenaming) {
                    // If renaming, update the filePath in database (move metadata to new path)
                    const existingRecord = await MediaFile.findOne({ filePath: oldRelativePath });
                    
                    if (existingRecord) {
                        // Update existing record with new path, filename, title, and altText
                        existingRecord.filePath = newRelativePath;
                        existingRecord.fileName = actualNewFileName;
                        existingRecord.title = finalTitle; // Title = filename without extension
                        if (isUpdatingAltText) {
                            existingRecord.altText = altText.trim() || null;
                        }
                        existingRecord.updatedAt = Date.now();
                        await existingRecord.save();
                    } else {
                        // Create new record for renamed file
                        await MediaFile.create({
                            filePath: newRelativePath,
                            directory: directory,
                            fileName: actualNewFileName,
                            title: finalTitle, // Title = filename without extension
                            altText: isUpdatingAltText ? (altText.trim() || null) : null
                        });
                    }
                } else {
                    // Not renaming, only updating altText
                    const existingRecord = await MediaFile.findOne({ filePath: oldRelativePath });
                    
                    if (existingRecord) {
                        // Update existing altText and ensure title matches filename
                        existingRecord.title = finalTitle; // Ensure title = filename without extension
                        if (isUpdatingAltText) {
                            existingRecord.altText = altText.trim() || null;
                        }
                        existingRecord.updatedAt = Date.now();
                        await existingRecord.save();
                    } else {
                        // Create new record with title and altText
                        await MediaFile.create({
                            filePath: oldRelativePath,
                            directory: directory,
                            fileName: actualOldFileName,
                            title: finalTitle, // Title = filename without extension
                            altText: isUpdatingAltText ? (altText.trim() || null) : null
                        });
                    }
                }
            } catch (dbError) {
                console.error('Error updating media file metadata:', dbError);
                // Don't fail the request if database update fails, but log it
                // The file rename (if any) already succeeded
            }

            return res.status(200).json({
                success: true,
                message: message
            });

        } catch (error) {
            console.error('Error renaming file:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to rename file'
            });
        }
    },

    // Upload files to a specific directory
    uploadFile: async (req, res) => {
        // Configure multer for file uploads - dynamic destination based on directory
        const storage = multer.diskStorage({
            destination: function (req, file, cb) {
                // Get directory from req.body (available after multer processes form data)
                const dir = req.body.directory || 'temp';
                const uploadsRoot = path.join(__dirname, '../uploads');
                const targetDir = path.join(uploadsRoot, dir);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(targetDir)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                }
                cb(null, targetDir);
            },
            filename: function (req, file, cb) {
                // Sanitize filename: replace spaces with hyphens
                const sanitizedOriginal = sanitizeFileName(file.originalname);
                const fileExt = path.extname(sanitizedOriginal);
                const baseName = path.basename(sanitizedOriginal, fileExt);
                
                // Check if file already exists, if so append timestamp
                const uploadsRoot = path.join(__dirname, '../uploads');
                const dir = req.body.directory || 'temp';
                const targetDir = path.join(uploadsRoot, dir);
                let finalFileName = sanitizedOriginal;
                
                // Check if file exists
                const fullPath = path.join(targetDir, sanitizedOriginal);
                if (fs.existsSync(fullPath)) {
                    // File exists, append timestamp to make it unique
                    const timestamp = Date.now();
                    finalFileName = `${baseName}_${timestamp}${fileExt}`;
                }
                
                cb(null, finalFileName);
            }
        });

        const upload = multer({ 
            storage: storage,
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
            fileFilter: function (req, file, cb) {
                // Only allow image files
                const allowedTypes = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
                if (allowedTypes.test(file.originalname)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed'), false);
                }
            }
        }).array('files', 20); // Allow up to 20 files

        upload(req, res, async (uploadErr) => {
            if (uploadErr) {
                return res.status(400).json({
                    success: false,
                    error: `File upload error: ${uploadErr.message}`
                });
            }

            try {
                // Get directory and altText from req.body (available after multer processes form data)
                const { directory, altText } = req.body;
                const files = req.files;

                // Validate required fields
                if (!directory || directory.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        error: 'Directory is required'
                    });
                }

                if (!files || files.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No files uploaded'
                    });
                }

                const uploadsRoot = path.join(__dirname, '../uploads');
                const uploadedFiles = [];

                // Process each uploaded file (already saved by multer)
                for (const file of files) {
                    // Get relative path for database
                    const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
                    const filePath = relativePath.startsWith('uploads/') ? relativePath : `uploads/${relativePath}`;

                    // Extract title from filename (filename without extension) - per spec
                    const title = extractTitleFromFileName(file.filename);

                    // Save file metadata to database
                    try {
                        const mediaFile = await MediaFile.create({
                            filePath: relativePath,
                            directory: directory,
                            fileName: file.filename,
                            title: title, // Title = filename without extension
                            altText: altText ? altText.trim() : null
                        });

                        uploadedFiles.push({
                            name: file.filename,
                            path: filePath,
                            size: file.size,
                            title: title,
                            altText: altText ? altText.trim() : null,
                            _id: mediaFile._id.toString()
                        });
                    } catch (dbErr) {
                        // If database save fails, still include file info but log error
                        console.error('Error saving file metadata:', dbErr);
                        uploadedFiles.push({
                            name: file.filename,
                            path: filePath,
                            size: file.size,
                            title: title,
                            altText: altText ? altText.trim() : null
                        });
                    }
                }

                if (uploadedFiles.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No valid image files were uploaded'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Files uploaded successfully',
                    data: {
                        uploadedFiles: uploadedFiles
                    }
                });

            } catch (error) {
                console.error('Error uploading files:', error);
                return res.status(500).json({
                    success: false,
                    error: `Failed to upload files: ${error.message}`
                });
            }
        });
    },

    // Delete a file from a specific directory
    deleteFile: async (req, res) => {
        try {
            const { directory, fileName, filePath } = req.body;

            // Validate required fields
            if (!directory || !fileName || !filePath) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: directory, fileName, and filePath are required'
                });
            }

            const uploadsRoot = path.join(__dirname, '../uploads');
            
            // Handle filePath - it might be absolute or relative
            let relativePath;
            let fullFilePath;
            
            if (path.isAbsolute(filePath)) {
                // If absolute path, extract relative portion after uploads
                const normalizedFilePath = path.normalize(filePath);
                const normalizedUploadsRoot = path.normalize(uploadsRoot);
                
                if (normalizedFilePath.startsWith(normalizedUploadsRoot)) {
                    // Extract relative path
                    relativePath = path.relative(normalizedUploadsRoot, normalizedFilePath).replace(/\\/g, '/');
                    fullFilePath = normalizedFilePath;
                } else {
                    // Absolute path but not under uploads - try to find uploads in path
                    const uploadsIndex = normalizedFilePath.toLowerCase().indexOf('uploads');
                    if (uploadsIndex !== -1) {
                        const afterUploads = normalizedFilePath.substring(uploadsIndex + 'uploads'.length);
                        relativePath = afterUploads.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
                        fullFilePath = path.join(uploadsRoot, relativePath);
                    } else {
                        return res.status(400).json({
                            success: false,
                            error: `Invalid file path: ${filePath}`
                        });
                    }
                }
            } else {
                // Relative path - remove "uploads/" prefix if present
                relativePath = filePath.replace(/^uploads\//, '').replace(/\\/g, '/');
                fullFilePath = path.join(uploadsRoot, relativePath);
            }

            // Check if file exists
            if (!fs.existsSync(fullFilePath)) {
                return res.status(404).json({
                    success: false,
                    error: `File not found: ${filePath}`
                });
            }

            // Delete file from filesystem
            try {
                await fs.promises.unlink(fullFilePath);
            } catch (unlinkErr) {
                return res.status(500).json({
                    success: false,
                    error: `Failed to delete file: ${unlinkErr.message}`
                });
            }

            // Remove file metadata from database
            try {
                await MediaFile.findOneAndDelete({ filePath: relativePath });
            } catch (dbErr) {
                // Log error but don't fail the request (file is already deleted)
                console.error('Error removing file metadata from database:', dbErr);
            }

            return res.status(200).json({
                success: true,
                message: 'File deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting file:', error);
            return res.status(500).json({
                success: false,
                error: `Failed to delete file: ${error.message}`
            });
        }
    },
    
    
    
    


};

module.exports = statsController