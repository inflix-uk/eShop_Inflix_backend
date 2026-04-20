// controller/logoController.js
const db = require('../../connections/mongo');
const Logo = require('../models/logo');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const blobStorage = require('../utils/blobStorage');
const sizeOf = require('image-size');

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
        const destinationFolder = './uploads/logo';
        // Create directory if it doesn't exist
        fs.mkdirSync(destinationFolder, { recursive: true });
        cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
        // Use fixed filename: zextons-logo.{extension}
        const extension = path.extname(file.originalname);
        cb(null, `zextons-logo${extension}`);
    }
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage: useBlobStorage ? memoryStorage : diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
}).single('logo');

const faviconDiskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const destinationFolder = './uploads/favicon';
        fs.mkdirSync(destinationFolder, { recursive: true });
        cb(null, destinationFolder);
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeExt = extension === '.ico' ? '.ico' : '.png';
        cb(null, `zextons-favicon${safeExt}`);
    }
});

const faviconFileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (extension === '.png' || extension === '.ico') {
        cb(null, true);
    } else {
        cb(new Error('Only PNG or ICO files are allowed for favicon'), false);
    }
};

const uploadFavicon = multer({
    storage: useBlobStorage ? memoryStorage : faviconDiskStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB — enough for 512×512 PNG/ICO
    fileFilter: faviconFileFilter
}).single('favicon');

const FAVICON_SIZE = 512;

function validateFaviconDimensions(file) {
    try {
        const dimensions = useBlobStorage
            ? sizeOf(file.buffer)
            : sizeOf(file.path);
        if (!dimensions || dimensions.width !== FAVICON_SIZE || dimensions.height !== FAVICON_SIZE) {
            return {
                ok: false,
                message: `Favicon must be exactly ${FAVICON_SIZE}×${FAVICON_SIZE} pixels (got ${dimensions?.width ?? '?'}×${dimensions?.height ?? '?'})`
            };
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, message: 'Could not read favicon image dimensions. Use a valid PNG or ICO file.' };
    }
}

// Middleware to handle file uploads
const handleLogoUpload = (req, res, next) => {
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

const handleFaviconUpload = (req, res, next) => {
    uploadFavicon(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'Favicon file size exceeds 2MB limit',
                    error: err.message
                });
            }
            return res.status(400).json({
                success: false,
                message: 'Favicon upload error',
                error: err.message
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: 'Favicon validation error',
                error: err.message
            });
        }
        next();
    });
};

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'logo') {
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

    // Check if it's a Blob URL
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

// Helper function to sanitize text
function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/[<>]/g, '');
}

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

const logoController = {
    
    /**
     * GET /get/logo - Get current logo (Admin)
     */
    getLogo: async (req, res) => {
        try {
            const logo = await Logo.getLogo();
            
            res.status(200).json({
                success: true,
                data: {
                    logoUrl: logo.logoUrl || '',
                    altText: logo.altText || 'Logo',
                    faviconUrl: logo.faviconUrl || '',
                    updatedAt: logo.updatedAt || null
                }
            });
        } catch (error) {
            console.error('Error getting logo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve logo',
                error: error.message
            });
        }
    },
    
    /**
     * GET /get/logo/public - Get current logo (Public)
     */
    getLogoPublic: async (req, res) => {
        try {
            const logo = await Logo.getLogo();
            
            res.status(200).json({
                success: true,
                data: {
                    logoUrl: logo.logoUrl || '',
                    altText: logo.altText || 'Logo',
                    faviconUrl: logo.faviconUrl || '',
                    updatedAt: logo.updatedAt || null
                }
            });
        } catch (error) {
            console.error('Error getting logo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve logo',
                error: error.message
            });
        }
    },
    
    /**
     * POST /update/logo - Upload or update logo (Admin)
     */
    updateLogo: async (req, res) => {
        let logoUrl = null;
        try {
            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Logo file is required'
                });
            }

            // Get or create logo document
            let logo = await Logo.findOne();

            // Get altText from request body (optional)
            const altText = req.body.altText ? sanitizeText(req.body.altText) : 'Logo';

            // Delete old logo file if exists
            if (logo && logo.logoUrl) {
                await deleteFile(logo.logoUrl);
            }

            // Get file URL (blob or local)
            if (useBlobStorage) {
                logoUrl = await uploadToBlob(req.file, 'logo');
            } else {
                logoUrl = getFileUrl(req.file);
            }

            // Update or create logo
            if (logo) {
                logo.logoUrl = logoUrl;
                logo.altText = altText;
                await logo.save();
            } else {
                logo = new Logo({
                    logoUrl: logoUrl,
                    altText: altText
                });
                await logo.save();
            }

            res.status(200).json({
                success: true,
                message: 'Logo updated successfully',
                data: {
                    logoUrl: logo.logoUrl,
                    altText: logo.altText,
                    updatedAt: logo.updatedAt
                }
            });
        } catch (error) {
            console.error('Error updating logo:', error);

            // Clean up uploaded file on error
            if (logoUrl) {
                await deleteFile(logoUrl);
            } else if (req.file && !useBlobStorage) {
                await deleteFile(getFileUrl(req.file));
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update logo',
                error: error.message
            });
        }
    },
    
    /**
     * DELETE /delete/logo - Remove logo (Admin)
     */
    deleteLogo: async (req, res) => {
        try {
            const logo = await Logo.findOne();

            if (!logo || !logo.logoUrl) {
                return res.status(200).json({
                    success: true,
                    message: 'No logo found to delete',
                    data: null
                });
            }

            // Delete the logo file
            await deleteFile(logo.logoUrl);

            // Clear logo data
            logo.logoUrl = null;
            logo.altText = 'Logo';
            await logo.save();

            res.status(200).json({
                success: true,
                message: 'Logo removed successfully',
                data: null
            });
        } catch (error) {
            console.error('Error deleting logo:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove logo',
                error: error.message
            });
        }
    },

    /**
     * POST /update/favicon - Upload or update favicon (Admin), PNG or ICO, 512×512
     */
    updateFavicon: async (req, res) => {
        let faviconUrl = null;
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Favicon file is required'
                });
            }

            const dimCheck = validateFaviconDimensions(req.file);
            if (!dimCheck.ok) {
                if (!useBlobStorage && req.file.path) {
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (e) {
                        /* ignore */
                    }
                }
                return res.status(400).json({
                    success: false,
                    message: dimCheck.message
                });
            }

            let logo = await Logo.findOne();
            if (!logo) {
                logo = await Logo.getLogo();
            }

            if (logo.faviconUrl) {
                await deleteFile(logo.faviconUrl);
            }

            if (useBlobStorage) {
                faviconUrl = await uploadToBlob(req.file, 'favicon');
            } else {
                faviconUrl = getFileUrl(req.file);
            }

            if (!faviconUrl) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to store favicon'
                });
            }

            logo.faviconUrl = faviconUrl;
            await logo.save();

            res.status(200).json({
                success: true,
                message: 'Favicon updated successfully',
                data: {
                    faviconUrl: logo.faviconUrl,
                    updatedAt: logo.updatedAt
                }
            });
        } catch (error) {
            console.error('Error updating favicon:', error);

            if (faviconUrl) {
                await deleteFile(faviconUrl);
            } else if (req.file && !useBlobStorage && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (e) {
                    /* ignore */
                }
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update favicon',
                error: error.message
            });
        }
    },

    /**
     * DELETE /delete/favicon - Remove favicon (Admin)
     */
    deleteFavicon: async (req, res) => {
        try {
            const logo = await Logo.findOne();
            if (!logo) {
                logo = await Logo.getLogo();
            }

            if (!logo.faviconUrl) {
                return res.status(200).json({
                    success: true,
                    message: 'No favicon found to delete',
                    data: null
                });
            }

            await deleteFile(logo.faviconUrl);
            logo.faviconUrl = null;
            await logo.save();

            res.status(200).json({
                success: true,
                message: 'Favicon removed successfully',
                data: null
            });
        } catch (error) {
            console.error('Error deleting favicon:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove favicon',
                error: error.message
            });
        }
    }
};

module.exports = logoController;
module.exports.handleLogoUpload = handleLogoUpload;
module.exports.handleFaviconUpload = handleFaviconUpload;
