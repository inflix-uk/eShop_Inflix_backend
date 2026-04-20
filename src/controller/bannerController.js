// controller/bannerController.js
const db = require('../../connections/mongo'); // Ensure MongoDB connection is established
const Banner = require('../models/banner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const blobStorage = require('../utils/blobStorage');

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local development
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/banners';
        // Create directory if it doesn't exist
        fs.mkdirSync(destinationFolder, { recursive: true });
        cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const timestamp = moment().format('YYYYMMDD_HHmmss_');
        const extension = path.extname(file.originalname);
        const uniqueFilename = `${timestamp}${Date.now()}${extension}`;
        cb(null, uniqueFilename);
    }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|webp)$/i;
    if (allowedTypes.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'), false);
    }
};

const upload = multer({
    storage: useBlobStorage ? memoryStorage : diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
}).fields([
    { name: 'imageLarge', maxCount: 1 },
    { name: 'imageSmall', maxCount: 1 },
    { name: 'extraImage', maxCount: 1 }
]);

// Middleware to handle file uploads
const handleBannerUpload = (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 5MB limit',
                    error: err.message
                });
            }
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: 'File validation error',
                error: err.message
            });
        }
        next();
    });
};

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'banners') {
    if (!file) return null;
    try {
        const result = await blobStorage.uploadFile(file, folder);
        return result ? result.url : null;
    } catch (error) {
        console.error('Error uploading to blob:', error);
        return null;
    }
}

// Helper function to get file URL (for local disk storage)
function getFileUrl(file) {
    if (!file) return null;
    const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
    return `/${relativePath}`;
}

// Helper function to delete file (handles both blob and local storage)
async function deleteFile(filePath) {
    if (!filePath) return;

    // Check if it's a Blob URL (Vercel Blob URLs contain specific patterns)
    if (filePath.includes('blob.vercel-storage.com') || filePath.includes('public.blob.vercel-storage.com')) {
        try {
            await blobStorage.deleteFile(filePath);
            console.log(`Deleted blob file: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting blob file ${filePath}:`, error);
        }
    } else {
        // Local file deletion
        try {
            const fullPath = path.join(process.cwd(), filePath.startsWith('/') ? filePath.substring(1) : filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`Deleted file: ${fullPath}`);
            }
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }
}

// Helper function to get admin user ID from request
function getAdminUserId(req) {
    return req.headers['x-user-id'] || 
           req.headers['x-admin-id'] || 
           req.body.createdBy || 
           null;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateSimpleBanner(data) {
    const errors = [];
    
    if (!data.type || data.type !== 'simple') {
        errors.push('Type must be "simple"');
    }
    
    if (!data.imageLarge) {
        errors.push('imageLarge is required');
    }
    
    if (!data.imageSmall) {
        errors.push('imageSmall is required');
    }
    
    if (!data.buttonText || data.buttonText.trim() === '') {
        errors.push('buttonText is required for simple type');
    }
    
    if (!data.buttonLink || data.buttonLink.trim() === '') {
        errors.push('buttonLink is required for simple type');
    }
    
    if (!data.altText || data.altText.trim() === '') {
        errors.push('altText is required');
    }
    
    // Validate URL format
    if (data.buttonLink && !isValidUrl(data.buttonLink)) {
        errors.push('buttonLink must be a valid URL');
    }
    
    return errors;
}

function validateFullBanner(data) {
    const errors = [];
    
    if (!data.type || data.type !== 'full') {
        errors.push('Type must be "full"');
    }
    
    if (!data.imageLarge) {
        errors.push('imageLarge is required');
    }
    
    if (!data.imageSmall) {
        errors.push('imageSmall is required');
    }
    
    if (!data.altText || data.altText.trim() === '') {
        errors.push('altText is required');
    }
    
    if (!data.content) {
        errors.push('content object is required for full type');
    } else {
        if (!data.content.title || data.content.title.trim() === '') {
            errors.push('content.title is required for full type');
        }
        
        if (!data.content.subtitle || data.content.subtitle.trim() === '') {
            errors.push('content.subtitle is required for full type');
        }
        
        if (!data.content.buynow || data.content.buynow.trim() === '') {
            errors.push('content.buynow is required for full type');
        }
        
        // Validate URLs
        if (data.content.buynow && !isValidUrl(data.content.buynow)) {
            errors.push('content.buynow must be a valid URL');
        }
        
        if (data.content.sellnow && !isValidUrl(data.content.sellnow)) {
            errors.push('content.sellnow must be a valid URL');
        }
        
        // Validate warranty array
        if (data.content.warranty && !Array.isArray(data.content.warranty)) {
            errors.push('content.warranty must be an array');
        }
        
        // Validate hex color fields if provided
        if (data.content.titleColor && !isValidHexColor(data.content.titleColor)) {
            errors.push('content.titleColor must be a valid hex color (#RRGGBB)');
        }
        if (data.content.subtitleColor && !isValidHexColor(data.content.subtitleColor)) {
            errors.push('content.subtitleColor must be a valid hex color (#RRGGBB)');
        }
        if (data.content.paragraphColor && !isValidHexColor(data.content.paragraphColor)) {
            errors.push('content.paragraphColor must be a valid hex color (#RRGGBB)');
        }
        if (data.content.priceColor && !isValidHexColor(data.content.priceColor)) {
            errors.push('content.priceColor must be a valid hex color (#RRGGBB)');
        }
        
        // Validate font size fields if provided
        if (data.content.titleSize && !isValidFontSize(data.content.titleSize)) {
            errors.push('content.titleSize must be a valid font size (e.g., "16px", "24px", "48px")');
        }
        if (data.content.subtitleSize && !isValidFontSize(data.content.subtitleSize)) {
            errors.push('content.subtitleSize must be a valid font size (e.g., "16px", "24px", "48px")');
        }
        if (data.content.paragraphSize && !isValidFontSize(data.content.paragraphSize)) {
            errors.push('content.paragraphSize must be a valid font size (e.g., "16px", "24px", "48px")');
        }
        if (data.content.priceSize && !isValidFontSize(data.content.priceSize)) {
            errors.push('content.priceSize must be a valid font size (e.g., "16px", "24px", "48px")');
        }
        if (data.content.textAlign && !['left', 'center', 'right'].includes(data.content.textAlign)) {
            errors.push('content.textAlign must be "left", "center", or "right"');
        }
        if (data.content.textPosition && !['left', 'center', 'right'].includes(data.content.textPosition)) {
            errors.push('content.textPosition must be "left", "center", or "right"');
        }
    }
    
    return errors;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        // Also allow relative paths starting with /
        return string.startsWith('/');
    }
}

function isValidHexColor(color) {
    if (!color) return true; // Optional field, so empty is valid
    // Hex color format: #RRGGBB where RR, GG, BB are hexadecimal values
    const hexColorRegex = /^#([A-Fa-f0-9]{6})$/;
    return hexColorRegex.test(color);
}

function isValidFontSize(size) {
    if (!size) return true; // Optional field, so empty is valid
    // Font size format: number followed by "px" (e.g., "16px", "24px", "48px")
    // Validate format: XXpx where XX is a number between 8 and 200 (reasonable range)
    const fontSizeRegex = /^(\d+(?:\.\d+)?)px$/i;
    if (!fontSizeRegex.test(size)) {
        return false;
    }
    // Extract the number part
    const match = size.match(/^(\d+(?:\.\d+)?)px$/i);
    if (match) {
        const numericValue = parseFloat(match[1]);
        // Allow sizes between 8px and 200px (reasonable range)
        return numericValue >= 8 && numericValue <= 200;
    }
    return false;
}

function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/[<>]/g, '');
}

// Helper function to set default color values for content object
function setDefaultColors(content) {
    if (!content) return content;
    
    // Set defaults only if not provided
    if (!content.titleColor) {
        content.titleColor = '#FFFFFF';
    }
    if (!content.subtitleColor) {
        content.subtitleColor = '#FFFFFF';
    }
    if (!content.paragraphColor) {
        content.paragraphColor = '#FFFFFF';
    }
    if (!content.priceColor) {
        content.priceColor = '#FF0000';
    }
    
    return content;
}

// Helper function to set default font size values for content object
function setDefaultFontSizes(content) {
    if (!content) return content;
    
    // Set defaults only if not provided
    if (!content.titleSize) {
        content.titleSize = '24px';
    }
    if (!content.subtitleSize) {
        content.subtitleSize = '32px';
    }
    if (!content.paragraphSize) {
        content.paragraphSize = '18px';
    }
    if (!content.priceSize) {
        content.priceSize = '20px';
    }
    
    return content;
}

function setLayoutDefaults(content) {
    if (!content) return content;
    if (!content.textAlign || !['left', 'center', 'right'].includes(content.textAlign)) {
        content.textAlign = 'left';
    }
    if (!content.textPosition || !['left', 'center', 'right'].includes(content.textPosition)) {
        content.textPosition = 'right';
    }
    return content;
}

// Helper function to ensure color and font size fields are present in response (for backward compatibility)
function ensureColorFieldsInResponse(banner) {
    if (banner && banner.type === 'full' && banner.content) {
        // Ensure color fields
        if (!banner.content.titleColor) {
            banner.content.titleColor = '#FFFFFF';
        }
        if (!banner.content.subtitleColor) {
            banner.content.subtitleColor = '#FFFFFF';
        }
        if (!banner.content.paragraphColor) {
            banner.content.paragraphColor = '#FFFFFF';
        }
        if (!banner.content.priceColor) {
            banner.content.priceColor = '#FF0000';
        }
        
        // Ensure font size fields
        if (!banner.content.titleSize) {
            banner.content.titleSize = '24px';
        }
        if (!banner.content.subtitleSize) {
            banner.content.subtitleSize = '32px';
        }
        if (!banner.content.paragraphSize) {
            banner.content.paragraphSize = '18px';
        }
        if (!banner.content.priceSize) {
            banner.content.priceSize = '20px';
        }
        if (!banner.content.textAlign || !['left', 'center', 'right'].includes(banner.content.textAlign)) {
            banner.content.textAlign = 'left';
        }
        if (!banner.content.textPosition || !['left', 'center', 'right'].includes(banner.content.textPosition)) {
            banner.content.textPosition = 'right';
        }
    }
    return banner;
}

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

const bannerController = {
    
    /**
     * GET /get/all/banners - Get all banners (admin)
     */
    getAllBanners: async (req, res) => {
        try {
            // Build query
            const query = { isDeleted: false };
            
            // Get all banners (no pagination per spec)
            const banners = await Banner.find(query)
                .sort({ order: 1, createdAt: -1 })
                .populate('createdBy', 'firstname lastname email')
                .lean();
            
            // Ensure color fields are present in response (for backward compatibility)
            const bannersWithColors = banners.map(banner => ensureColorFieldsInResponse(banner));
            
            res.status(200).json({
                success: true,
                status: 200,
                message: 'Banners fetched successfully',
                banners: bannersWithColors
            });
        } catch (error) {
            console.error('Error getting banners:', error);
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to fetch banners',
                error: error.message
            });
        }
    },
    
    /**
     * GET /get/banners/active - Get active banners (public)
     */
    getActiveBanners: async (req, res) => {
        try {
            const banners = await Banner.find({
                isActive: true,
                isDeleted: false
            })
                .sort({ order: 1 })
                .select('-createdBy -isDeleted')
                .lean();
            
            // Ensure color fields are present in response (for backward compatibility)
            const bannersWithColors = banners.map(banner => ensureColorFieldsInResponse(banner));
            
            res.status(200).json({
                success: true,
                status: 200,
                banners: bannersWithColors
            });
        } catch (error) {
            console.error('Error getting active banners:', error);
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to fetch active banners',
                error: error.message
            });
        }
    },
    
    /**
     * GET /get/banner/:id - Get single banner by ID
     */
    getBannerById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const banner = await Banner.findOne({
                _id: id,
                isDeleted: false
            })
                .populate('createdBy', 'firstname lastname email')
                .lean();
            
            if (!banner) {
                return res.status(404).json({
                    success: false,
                    status: 404,
                    message: 'Banner not found'
                });
            }
            
            // Ensure color fields are present in response (for backward compatibility)
            const bannerWithColors = ensureColorFieldsInResponse(banner);
            
            res.status(200).json({
                success: true,
                status: 200,
                data: bannerWithColors
            });
        } catch (error) {
            console.error('Error getting banner:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid banner ID',
                    error: 'The provided ID is not valid'
                });
            }
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to retrieve banner',
                error: error.message
            });
        }
    },
    
    /**
     * POST /api/banners - Create new banner
     */
    createBanner: async (req, res) => {
        try {
            // Parse banner data from request body
            let bannerData;
            if (req.body.bannerData) {
                // If sent as FormData
                try {
                    bannerData = JSON.parse(req.body.bannerData);
                } catch (e) {
                    bannerData = req.body;
                }
            } else {
                bannerData = req.body;
            }

            // Process uploaded files
            if (req.files) {
                if (useBlobStorage) {
                    // Upload to Vercel Blob storage
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        bannerData.imageLarge = await uploadToBlob(req.files.imageLarge[0], 'banners');
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        bannerData.imageSmall = await uploadToBlob(req.files.imageSmall[0], 'banners');
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        bannerData.extraImage = await uploadToBlob(req.files.extraImage[0], 'banners');
                    }
                } else {
                    // Local disk storage
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        bannerData.imageLarge = getFileUrl(req.files.imageLarge[0]);
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        bannerData.imageSmall = getFileUrl(req.files.imageSmall[0]);
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        bannerData.extraImage = getFileUrl(req.files.extraImage[0]);
                    }
                }
            }
            
            // Validate based on type
            let validationErrors = [];
            if (bannerData.type === 'simple') {
                validationErrors = validateSimpleBanner(bannerData);
            } else if (bannerData.type === 'full') {
                validationErrors = validateFullBanner(bannerData);
            } else {
                validationErrors.push('Type must be either "simple" or "full"');
            }
            
            if (validationErrors.length > 0) {
                // Clean up uploaded files if validation fails
                if (req.files) {
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        await deleteFile(bannerData.imageLarge);
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        await deleteFile(bannerData.imageSmall);
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        await deleteFile(bannerData.extraImage);
                    }
                }

                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    error: validationErrors.join(', ')
                });
            }
            
            // Sanitize text inputs
            if (bannerData.altText) {
                bannerData.altText = sanitizeText(bannerData.altText);
            }
            if (bannerData.buttonText) {
                bannerData.buttonText = sanitizeText(bannerData.buttonText);
            }
            if (bannerData.content) {
                if (bannerData.content.title) {
                    bannerData.content.title = sanitizeText(bannerData.content.title);
                }
                if (bannerData.content.subtitle) {
                    bannerData.content.subtitle = sanitizeText(bannerData.content.subtitle);
                }
                if (bannerData.content.paragraph) {
                    bannerData.content.paragraph = sanitizeText(bannerData.content.paragraph);
                }
                
                // Set default color and font size values if not provided (for full type banners)
                if (bannerData.type === 'full') {
                    bannerData.content = setDefaultColors(bannerData.content);
                    bannerData.content = setDefaultFontSizes(bannerData.content);
                    bannerData.content = setLayoutDefaults(bannerData.content);
                }
            }
            
            // Set createdBy
            bannerData.createdBy = getAdminUserId(req);
            
            // Set order if not provided (will be auto-incremented in pre-save hook)
            if (!bannerData.order && bannerData.order !== 0) {
                const maxOrder = await Banner.findOne({ isDeleted: false })
                    .sort({ order: -1 })
                    .select('order')
                    .lean();
                bannerData.order = maxOrder ? maxOrder.order + 1 : 1;
            }
            
            // Create banner
            const newBanner = new Banner(bannerData);
            await newBanner.save();
            
            const populatedBanner = await Banner.findById(newBanner._id)
                .populate('createdBy', 'firstname lastname email')
                .lean();
            
            // Ensure color fields are present in response
            const bannerWithColors = ensureColorFieldsInResponse(populatedBanner);
            
            res.status(201).json({
                success: true,
                status: 201,
                message: 'Banner created successfully',
                data: bannerWithColors
            });
        } catch (error) {
            console.error('Error creating banner:', error);

            // Clean up uploaded files on error
            if (req.files) {
                if (useBlobStorage) {
                    // For blob storage, delete using the URLs stored in bannerData
                    if (bannerData && bannerData.imageLarge) {
                        await deleteFile(bannerData.imageLarge);
                    }
                    if (bannerData && bannerData.imageSmall) {
                        await deleteFile(bannerData.imageSmall);
                    }
                    if (bannerData && bannerData.extraImage) {
                        await deleteFile(bannerData.extraImage);
                    }
                } else {
                    // For local storage, delete using file paths
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        await deleteFile(getFileUrl(req.files.imageLarge[0]));
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        await deleteFile(getFileUrl(req.files.imageSmall[0]));
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        await deleteFile(getFileUrl(req.files.extraImage[0]));
                    }
                }
            }

            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to create banner',
                error: error.message
            });
        }
    },
    
    /**
     * PUT /update/banner/:id - Update banner
     */
    updateBanner: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Find existing banner
            const existingBanner = await Banner.findOne({
                _id: id,
                isDeleted: false
            });
            
            if (!existingBanner) {
                return res.status(404).json({
                    success: false,
                    message: 'Banner not found',
                    error: 'Banner with the given ID does not exist'
                });
            }
            
            // Parse banner data
            let bannerData;
            if (req.body.bannerData) {
                try {
                    bannerData = JSON.parse(req.body.bannerData);
                } catch (e) {
                    bannerData = req.body;
                }
            } else {
                bannerData = req.body;
            }
            
            // Track old file paths for deletion
            const oldFiles = {
                imageLarge: existingBanner.imageLarge,
                imageSmall: existingBanner.imageSmall,
                extraImage: existingBanner.extraImage
            };
            
            // Process new uploaded files
            if (req.files) {
                if (useBlobStorage) {
                    // Upload to Vercel Blob storage
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        bannerData.imageLarge = await uploadToBlob(req.files.imageLarge[0], 'banners');
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        bannerData.imageSmall = await uploadToBlob(req.files.imageSmall[0], 'banners');
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        bannerData.extraImage = await uploadToBlob(req.files.extraImage[0], 'banners');
                    }
                } else {
                    // Local disk storage
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        bannerData.imageLarge = getFileUrl(req.files.imageLarge[0]);
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        bannerData.imageSmall = getFileUrl(req.files.imageSmall[0]);
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        bannerData.extraImage = getFileUrl(req.files.extraImage[0]);
                    }
                }
            }
            
            // Merge with existing data
            const updateData = {
                ...existingBanner.toObject(),
                ...bannerData,
                updatedAt: new Date()
            };
            
            // Validate based on type
            const bannerType = updateData.type || existingBanner.type;
            let validationErrors = [];
            if (bannerType === 'simple') {
                validationErrors = validateSimpleBanner(updateData);
            } else if (bannerType === 'full') {
                validationErrors = validateFullBanner(updateData);
            }
            
            if (validationErrors.length > 0) {
                // Clean up newly uploaded files if validation fails
                if (req.files) {
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        await deleteFile(bannerData.imageLarge);
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        await deleteFile(bannerData.imageSmall);
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        await deleteFile(bannerData.extraImage);
                    }
                }

                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Validation error',
                    errors: {
                        validation: validationErrors.join(', ')
                    }
                });
            }
            
            // Sanitize text inputs
            if (updateData.altText) {
                updateData.altText = sanitizeText(updateData.altText);
            }
            if (updateData.buttonText) {
                updateData.buttonText = sanitizeText(updateData.buttonText);
            }
            if (updateData.content) {
                if (updateData.content.title) {
                    updateData.content.title = sanitizeText(updateData.content.title);
                }
                if (updateData.content.subtitle) {
                    updateData.content.subtitle = sanitizeText(updateData.content.subtitle);
                }
                if (updateData.content.paragraph) {
                    updateData.content.paragraph = sanitizeText(updateData.content.paragraph);
                }
                
                // Set default color and font size values if not provided (for full type banners)
                // Only set defaults if the content object is being updated
                if (bannerType === 'full') {
                    // Merge existing content colors and font sizes with new ones, then apply defaults
                    if (existingBanner.content) {
                        updateData.content = {
                            ...existingBanner.content,
                            ...updateData.content
                        };
                    }
                    updateData.content = setDefaultColors(updateData.content);
                    updateData.content = setDefaultFontSizes(updateData.content);
                    updateData.content = setLayoutDefaults(updateData.content);
                }
            }
            
            // Update banner
            Object.assign(existingBanner, updateData);
            await existingBanner.save();
            
            // Delete old files if new ones were uploaded
            if (req.files) {
                if (req.files.imageLarge && req.files.imageLarge[0] && oldFiles.imageLarge) {
                    await deleteFile(oldFiles.imageLarge);
                }
                if (req.files.imageSmall && req.files.imageSmall[0] && oldFiles.imageSmall) {
                    await deleteFile(oldFiles.imageSmall);
                }
                if (req.files.extraImage && req.files.extraImage[0] && oldFiles.extraImage) {
                    await deleteFile(oldFiles.extraImage);
                }
            }
            
            const updatedBanner = await Banner.findById(id)
                .populate('createdBy', 'firstname lastname email')
                .lean();
            
            // Ensure color fields are present in response
            const bannerWithColors = ensureColorFieldsInResponse(updatedBanner);
            
            res.status(200).json({
                success: true,
                status: 200,
                message: 'Banner updated successfully',
                data: bannerWithColors
            });
        } catch (error) {
            console.error('Error updating banner:', error);

            // Clean up newly uploaded files on error
            if (req.files) {
                if (useBlobStorage) {
                    // For blob storage, delete using the URLs stored in bannerData
                    if (bannerData && bannerData.imageLarge) {
                        await deleteFile(bannerData.imageLarge);
                    }
                    if (bannerData && bannerData.imageSmall) {
                        await deleteFile(bannerData.imageSmall);
                    }
                    if (bannerData && bannerData.extraImage) {
                        await deleteFile(bannerData.extraImage);
                    }
                } else {
                    // For local storage, delete using file paths
                    if (req.files.imageLarge && req.files.imageLarge[0]) {
                        await deleteFile(getFileUrl(req.files.imageLarge[0]));
                    }
                    if (req.files.imageSmall && req.files.imageSmall[0]) {
                        await deleteFile(getFileUrl(req.files.imageSmall[0]));
                    }
                    if (req.files.extraImage && req.files.extraImage[0]) {
                        await deleteFile(getFileUrl(req.files.extraImage[0]));
                    }
                }
            }

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid banner ID',
                    error: 'The provided ID is not valid'
                });
            }

            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to update banner',
                error: error.message
            });
        }
    },
    
    /**
     * DELETE /delete/banner/:id - Delete banner
     */
    deleteBanner: async (req, res) => {
        try {
            const { id } = req.params;
            const hardDelete = req.query.hard === 'true'; // Optional hard delete
            
            const banner = await Banner.findOne({
                _id: id,
                isDeleted: false
            });
            
            if (!banner) {
                return res.status(404).json({
                    success: false,
                    status: 404,
                    message: 'Banner not found'
                });
            }
            
            // Hard delete - remove from database and delete files (per spec)
            await deleteFile(banner.imageLarge);
            await deleteFile(banner.imageSmall);
            if (banner.extraImage) {
                await deleteFile(banner.extraImage);
            }
            await Banner.findByIdAndDelete(id);
            
            res.status(200).json({
                success: true,
                status: 200,
                message: 'Banner deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting banner:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid banner ID',
                    error: 'The provided ID is not valid'
                });
            }
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to delete banner',
                error: error.message
            });
        }
    },
    
    /**
     * PATCH /toggle/banner/:id - Toggle isActive status
     */
    toggleBannerStatus: async (req, res) => {
        try {
            const { id } = req.params;
            
            const banner = await Banner.findOne({
                _id: id,
                isDeleted: false
            });
            
            if (!banner) {
                return res.status(404).json({
                    success: false,
                    status: 404,
                    message: 'Banner not found'
                });
            }
            
            // Toggle status
            banner.isActive = !banner.isActive;
            await banner.save();
            
            const bannerObj = banner.toObject();
            // Ensure color fields are present in response
            const bannerWithColors = ensureColorFieldsInResponse(bannerObj);
            
            res.status(200).json({
                success: true,
                status: 200,
                message: 'Banner status updated',
                data: bannerWithColors
            });
        } catch (error) {
            console.error('Error toggling banner status:', error);
            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid banner ID',
                    error: 'The provided ID is not valid'
                });
            }
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to toggle banner status',
                error: error.message
            });
        }
    },
    
    /**
     * PUT /reorder/banners - Reorder multiple banners
     */
    reorderBanners: async (req, res) => {
        try {
            const { banners } = req.body; // Array of {id, order}
            
            if (!Array.isArray(banners) || banners.length === 0) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid reorder data',
                    error: 'banners must be a non-empty array of {id, order} objects'
                });
            }
            
            // Validate all IDs exist
            const ids = banners.map(b => b.id);
            const existingBanners = await Banner.find({
                _id: { $in: ids },
                isDeleted: false
            });
            
            if (existingBanners.length !== ids.length) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: 'Invalid reorder data',
                    error: 'All banner IDs must exist'
                });
            }
            
            // Update orders atomically using bulkWrite
            const bulkOps = banners.map(({ id, order }) => ({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: { order: parseInt(order) } }
                }
            }));
            
            await Banner.bulkWrite(bulkOps);
            
            res.status(200).json({
                success: true,
                status: 200,
                message: 'Banners reordered successfully'
            });
        } catch (error) {
            console.error('Error reordering banners:', error);
            res.status(500).json({
                success: false,
                status: 500,
                message: 'Failed to reorder banners',
                error: error.message
            });
        }
    }
};

module.exports = bannerController;
module.exports.handleBannerUpload = handleBannerUpload;
