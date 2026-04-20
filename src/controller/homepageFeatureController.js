// controller/homepageFeatureController.js
const HomepageFeature = require('../models/homepageFeature');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const UPLOAD_DIR = './uploads/homepage-features';
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local development
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname) || '.png';
        const sanitized = (file.originalname || 'icon').replace(/[^a-zA-Z0-9.-]/g, '_');
        const base = path.basename(sanitized, path.extname(sanitized)) || 'icon';
        const unique = `icon-${base}-${Date.now()}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'), false);
    }
};

const upload = multer({
    storage: useBlobStorage ? memoryStorage : diskStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
}).single('iconImage');

const handleHomepageFeatureUpload = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 1MB limit'
                });
            }
            return res.status(400).json({
                success: false,
                message: 'File upload error',
                error: err.message
            });
        }
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'File validation error'
            });
        }
        next();
    });
};

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'homepage-features') {
    if (!file) return null;
    try {
        const result = await blobStorage.uploadFile(file, folder);
        return result ? result.url : null;
    } catch (error) {
        console.error('Error uploading to blob:', error);
        return null;
    }
}

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
            }
        } catch (e) {
            console.error('Error deleting file:', e);
        }
    }
}

function sanitizeText(text) {
    if (text == null) return '';
    return String(text).trim().replace(/[<>]/g, '');
}

function parseFeatureData(req) {
    const raw = req.body.featureData;
    if (!raw) return null;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
        return null;
    }
}

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

const getHomepageFeatures = async (req, res) => {
    try {
        const features = await HomepageFeature.find()
            .sort({ order: 1, createdAt: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: features
        });
    } catch (error) {
        console.error('Error getting homepage features:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch homepage features'
        });
    }
};

const getHomepageFeaturesActive = async (req, res) => {
    try {
        const features = await HomepageFeature.find({ isActive: true })
            .sort({ order: 1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: features
        });
    } catch (error) {
        console.error('Error getting active homepage features:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch active homepage features'
        });
    }
};

const createHomepageFeature = async (req, res) => {
    let iconImagePath = null;
    try {
        const featureData = parseFeatureData(req);
        if (!featureData) {
            return res.status(400).json({
                success: false,
                message: 'featureData (JSON string) is required'
            });
        }

        const title = sanitizeText(featureData.title);
        const subtitle = sanitizeText(featureData.subtitle);
        if (!title) {
            return res.status(400).json({ success: false, message: 'Title is required' });
        }
        if (!subtitle) {
            return res.status(400).json({ success: false, message: 'Subtitle is required' });
        }

        if (req.file) {
            if (useBlobStorage) {
                iconImagePath = await uploadToBlob(req.file, 'homepage-features');
            } else {
                iconImagePath = getFileUrl(req.file);
            }
        }

        let order = featureData.order;
        if (order === undefined || order === null) {
            const maxOrder = await HomepageFeature.findOne().sort({ order: -1 }).select('order').lean();
            order = maxOrder ? maxOrder.order + 1 : 0;
        }
        order = Number(order) || 0;
        const isActive = featureData.isActive !== undefined ? Boolean(featureData.isActive) : true;
        const iconWidth = featureData.iconWidth !== undefined ? Number(featureData.iconWidth) || 25 : 25;
        const iconHeight = featureData.iconHeight !== undefined ? Number(featureData.iconHeight) || 25 : 25;

        const feature = new HomepageFeature({
            title,
            subtitle,
            iconImage: iconImagePath,
            iconWidth,
            iconHeight,
            order,
            isActive
        });
        await feature.save();

        return res.status(200).json({
            success: true,
            message: 'Homepage feature created successfully',
            data: feature.toObject()
        });
    } catch (error) {
        if (iconImagePath) {
            await deleteFile(iconImagePath);
        } else if (req.file && !useBlobStorage) {
            await deleteFile(getFileUrl(req.file));
        }
        console.error('Error creating homepage feature:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create homepage feature'
        });
    }
};

const updateHomepageFeature = async (req, res) => {
    let newIconImagePath = null;
    try {
        const { id } = req.params;
        const feature = await HomepageFeature.findById(id);
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        const featureData = parseFeatureData(req);
        const updates = {};

        if (featureData) {
            if (featureData.title !== undefined) {
                const title = sanitizeText(featureData.title);
                if (!title) {
                    return res.status(400).json({ success: false, message: 'Title is required' });
                }
                updates.title = title;
            }
            if (featureData.subtitle !== undefined) {
                const subtitle = sanitizeText(featureData.subtitle);
                if (!subtitle) {
                    return res.status(400).json({ success: false, message: 'Subtitle is required' });
                }
                updates.subtitle = subtitle;
            }
            if (featureData.order !== undefined) updates.order = Number(featureData.order) || 0;
            if (featureData.isActive !== undefined) updates.isActive = Boolean(featureData.isActive);
            if (featureData.iconWidth !== undefined) updates.iconWidth = Number(featureData.iconWidth) || 25;
            if (featureData.iconHeight !== undefined) updates.iconHeight = Number(featureData.iconHeight) || 25;
        }

        if (req.file) {
            // Upload new file
            if (useBlobStorage) {
                newIconImagePath = await uploadToBlob(req.file, 'homepage-features');
            } else {
                newIconImagePath = getFileUrl(req.file);
            }
            updates.iconImage = newIconImagePath;

            // Delete old file after successful upload
            if (feature.iconImage) {
                await deleteFile(feature.iconImage);
            }
        }

        Object.assign(feature, updates);
        await feature.save();

        return res.status(200).json({
            success: true,
            message: 'Homepage feature updated successfully',
            data: feature.toObject()
        });
    } catch (error) {
        if (newIconImagePath) {
            await deleteFile(newIconImagePath);
        } else if (req.file && !useBlobStorage) {
            await deleteFile(getFileUrl(req.file));
        }
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Feature not found' });
        }
        console.error('Error updating homepage feature:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update homepage feature'
        });
    }
};

const deleteHomepageFeature = async (req, res) => {
    try {
        const { id } = req.params;
        const feature = await HomepageFeature.findById(id);
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }
        if (feature.iconImage) {
            await deleteFile(feature.iconImage);
        }
        await HomepageFeature.findByIdAndDelete(id);
        return res.status(200).json({
            success: true,
            message: 'Homepage feature deleted successfully'
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Feature not found' });
        }
        console.error('Error deleting homepage feature:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete homepage feature'
        });
    }
};

const toggleHomepageFeature = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.body.isActive;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive (boolean) is required in request body'
            });
        }
        const feature = await HomepageFeature.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        ).lean();
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: feature.isActive ? 'Feature activated successfully' : 'Feature deactivated successfully',
            data: feature
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Feature not found' });
        }
        console.error('Error toggling homepage feature:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to toggle homepage feature'
        });
    }
};

const deleteHomepageFeatureImage = async (req, res) => {
    try {
        const { id } = req.params;
        const feature = await HomepageFeature.findById(id);
        if (!feature) {
            return res.status(404).json({
                success: false,
                message: 'Feature not found'
            });
        }

        if (feature.iconImage) {
            await deleteFile(feature.iconImage);
            feature.iconImage = null;
            await feature.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Feature not found' });
        }
        console.error('Error deleting homepage feature image:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete image'
        });
    }
};

const reorderHomepageFeatures = async (req, res) => {
    try {
        const { featureIds } = req.body;
        if (!Array.isArray(featureIds) || featureIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'featureIds array is required'
            });
        }
        const existing = await HomepageFeature.find({ _id: { $in: featureIds } }).select('_id').lean();
        if (existing.length !== featureIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid feature IDs provided'
            });
        }
        const updatePromises = featureIds.map((featureId, index) =>
            HomepageFeature.findByIdAndUpdate(featureId, { order: index }, { new: true })
        );
        await Promise.all(updatePromises);
        return res.status(200).json({
            success: true,
            message: 'Features reordered successfully'
        });
    } catch (error) {
        console.error('Error reordering homepage features:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Invalid feature IDs provided'
        });
    }
};

module.exports = {
    getHomepageFeatures,
    getHomepageFeaturesActive,
    createHomepageFeature,
    updateHomepageFeature,
    deleteHomepageFeature,
    deleteHomepageFeatureImage,
    toggleHomepageFeature,
    reorderHomepageFeatures,
    handleHomepageFeatureUpload
};
