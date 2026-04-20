// controller/categoryCardController.js
const CategoryCard = require('../models/categoryCard');
const CategoryCardsSection = require('../models/categoryCardsSection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const blobStorage = require('../utils/blobStorage');

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const UPLOAD_DIR = './uploads/category-cards';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per image

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
        const ext = path.extname(file.originalname) || '.jpg';
        const prefix = file.fieldname === 'backgroundImage' ? 'background' : 'category';
        const unique = `${prefix}-${Date.now()}-${moment().format('HHmmss')}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp)$/i;
    const name = file.originalname || '';
    if (allowed.test(name) || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'), false);
    }
};

const upload = multer({
    storage: useBlobStorage ? memoryStorage : diskStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
}).fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'categoryImage', maxCount: 1 }
]);

const handleCategoryCardUpload = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 2MB limit per image'
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
async function uploadToBlob(file, folder = 'category-cards') {
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

const DEFAULT_CATEGORY_SECTION = {
    headingText: 'Popular Categories',
    headingColor: '#15803d',
    dividerColor: '#000000',
    sectionBackgroundColor: ''
};

/** Overlay on category cards: empty or hex only (#rgb, #rgba, #rrggbb, #rrggbbaa), optional leading #. */
function parseOverlayHexField(raw) {
    if (raw === undefined || raw === null) {
        return { ok: true, value: '' };
    }
    let s = String(raw).trim();
    if (s === '') {
        return { ok: true, value: '' };
    }
    if (s.length > 12) {
        return { ok: false, message: 'Overlay hex value too long' };
    }
    if (/^(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/i.test(s)) {
        s = `#${s}`;
    }
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/i.test(s)) {
        return { ok: true, value: s.toLowerCase() };
    }
    // Legacy overlays saved before hex-only admin (keep accepting on API)
    if (/^rgba?\(/i.test(s)) {
        if (!/^rgba?\([\d\s,.%]+\)$/i.test(s)) {
            return { ok: false, message: 'Invalid rgba format' };
        }
        return { ok: true, value: s };
    }
    return { ok: false, message: 'Overlay must be a hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) or empty' };
}

/**
 * Accepts hex (#rgb, #rgba, #rrggbb, #rrggbbaa), naked hex digits, or rgb()/rgba().
 */
function parseColorField(raw, { allowEmpty = false, fallback = '#000000' } = {}) {
    if (raw === undefined || raw === null) {
        return { ok: true, value: fallback };
    }
    let s = String(raw).trim();
    if (allowEmpty && s === '') {
        return { ok: true, value: '' };
    }
    if (!s) {
        return { ok: false, message: 'Invalid color' };
    }
    if (s.length > 80) {
        return { ok: false, message: 'Color value too long' };
    }
    // Allow typing hex without # (e.g. 000000, fff, 15803d)
    if (/^(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/i.test(s)) {
        s = `#${s}`;
    }
    const hexOk =
        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/i.test(s);
    if (hexOk) {
        return { ok: true, value: s.toLowerCase() };
    }
    if (/^rgba?\(/i.test(s)) {
        if (!/^rgba?\([\d\s,.%]+\)$/i.test(s)) {
            return { ok: false, message: 'Invalid rgba format' };
        }
        return { ok: true, value: s };
    }
    return { ok: false, message: 'Invalid color format (use #hex or rgb/rgba)' };
}

function parseCardData(req) {
    const raw = req.body.cardData;
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

const getCategoryCards = async (req, res) => {
    try {
        const cards = await CategoryCard.find()
            .sort({ order: 1, createdAt: 1 })
            .lean();
        const data = cards.map(c => ({ ...c, itemCount: c.itemCount ?? 0 }));
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting category cards:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch category cards'
        });
    }
};

const getCategoryCardsActive = async (req, res) => {
    try {
        const cards = await CategoryCard.find({ isActive: true })
            .sort({ order: 1 })
            .lean();
        const data = cards.map(c => ({ ...c, itemCount: c.itemCount ?? 0 }));
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting active category cards:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch active category cards'
        });
    }
};

const createCategoryCard = async (req, res) => {
    let backgroundImage = null;
    let categoryImage = null;
    try {
        const cardData = parseCardData(req);
        if (!cardData) {
            return res.status(400).json({
                success: false,
                message: 'cardData (JSON string) is required'
            });
        }

        const categoryName = sanitizeText(cardData.categoryName);
        const shopNowLink = sanitizeText(cardData.shopNowLink);
        if (!categoryName) {
            return res.status(400).json({ success: false, message: 'categoryName is required' });
        }
        if (!shopNowLink) {
            return res.status(400).json({ success: false, message: 'shopNowLink is required' });
        }

        const files = req.files || {};
        const bgFile = files.backgroundImage && files.backgroundImage[0];
        const catFile = files.categoryImage && files.categoryImage[0];

        if (bgFile) {
            if (useBlobStorage) {
                backgroundImage = await uploadToBlob(bgFile, 'category-cards');
            } else {
                backgroundImage = getFileUrl(bgFile);
            }
        }

        if (catFile) {
            if (useBlobStorage) {
                categoryImage = await uploadToBlob(catFile, 'category-cards');
            } else {
                categoryImage = getFileUrl(catFile);
            }
        }

        let order = cardData.order;
        if (order === undefined || order === null) {
            const maxOrder = await CategoryCard.findOne().sort({ order: -1 }).select('order').lean();
            order = maxOrder ? maxOrder.order + 1 : 0;
        }
        order = Number(order) || 0;
        const isActive = cardData.isActive !== undefined ? Boolean(cardData.isActive) : true;
        const itemCount = Math.max(0, parseInt(cardData.itemCount, 10) || 0);
        const nameCol = parseColorField(cardData.categoryNameColor, { fallback: '#000000' });
        if (!nameCol.ok) {
            return res.status(400).json({ success: false, message: nameCol.message });
        }
        const countCol = parseColorField(cardData.itemCountColor, { fallback: '#6B7280' });
        if (!countCol.ok) {
            return res.status(400).json({ success: false, message: countCol.message });
        }
        const overlayCol = parseOverlayHexField(cardData.overlayColor);
        if (!overlayCol.ok) {
            return res.status(400).json({ success: false, message: overlayCol.message });
        }

        const newCardData = {
            categoryName,
            categoryNameColor: nameCol.value,
            itemCountColor: countCol.value,
            overlayColor: overlayCol.value,
            shopNowLink,
            itemCount,
            backgroundImage,
            order,
            isActive
        };
        if (categoryImage) {
            newCardData.categoryImage = categoryImage;
        }
        const card = new CategoryCard(newCardData);
        await card.save();

        return res.status(200).json({
            success: true,
            message: 'Category card created successfully',
            data: card.toObject()
        });
    } catch (error) {
        // Clean up uploaded files on error
        if (backgroundImage) await deleteFile(backgroundImage);
        if (categoryImage) await deleteFile(categoryImage);
        console.error('Error creating category card:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create category card'
        });
    }
};

const updateCategoryCard = async (req, res) => {
    let newBackgroundImage = null;
    let newCategoryImage = null;
    try {
        const { id } = req.params;
        const card = await CategoryCard.findById(id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Category card not found'
            });
        }

        const cardData = parseCardData(req);
        const updates = {};

        if (cardData) {
            if (cardData.categoryName !== undefined) {
                const categoryName = sanitizeText(cardData.categoryName);
                if (!categoryName) {
                    return res.status(400).json({ success: false, message: 'categoryName is required' });
                }
                updates.categoryName = categoryName;
            }
            if (cardData.shopNowLink !== undefined) {
                const shopNowLink = sanitizeText(cardData.shopNowLink);
                if (!shopNowLink) {
                    return res.status(400).json({ success: false, message: 'shopNowLink is required' });
                }
                updates.shopNowLink = shopNowLink;
            }
            if (cardData.order !== undefined) updates.order = Number(cardData.order) || 0;
            if (cardData.isActive !== undefined) updates.isActive = Boolean(cardData.isActive);
            if (cardData.itemCount !== undefined) updates.itemCount = Math.max(0, parseInt(cardData.itemCount, 10) || 0);
            if (cardData.categoryNameColor !== undefined) {
                const r = parseColorField(cardData.categoryNameColor, { fallback: '#000000' });
                if (!r.ok) {
                    return res.status(400).json({ success: false, message: r.message });
                }
                updates.categoryNameColor = r.value;
            }
            if (cardData.itemCountColor !== undefined) {
                const r = parseColorField(cardData.itemCountColor, { fallback: '#6B7280' });
                if (!r.ok) {
                    return res.status(400).json({ success: false, message: r.message });
                }
                updates.itemCountColor = r.value;
            }
            if (cardData.overlayColor !== undefined) {
                const r = parseOverlayHexField(cardData.overlayColor);
                if (!r.ok) {
                    return res.status(400).json({ success: false, message: r.message });
                }
                updates.overlayColor = r.value;
            }
        }

        const files = req.files || {};
        if (files.backgroundImage && files.backgroundImage[0]) {
            if (useBlobStorage) {
                newBackgroundImage = await uploadToBlob(files.backgroundImage[0], 'category-cards');
            } else {
                newBackgroundImage = getFileUrl(files.backgroundImage[0]);
            }
            updates.backgroundImage = newBackgroundImage;
            if (card.backgroundImage) await deleteFile(card.backgroundImage);
        } else if (cardData && Object.prototype.hasOwnProperty.call(cardData, 'backgroundImage')) {
            const nextBg = cardData.backgroundImage;
            if (nextBg === null || nextBg === '') {
                if (card.backgroundImage) await deleteFile(card.backgroundImage);
                updates.backgroundImage = null;
            } else if (nextBg) {
                updates.backgroundImage = nextBg;
            }
        }
        if (files.categoryImage && files.categoryImage[0]) {
            if (useBlobStorage) {
                newCategoryImage = await uploadToBlob(files.categoryImage[0], 'category-cards');
            } else {
                newCategoryImage = getFileUrl(files.categoryImage[0]);
            }
            updates.categoryImage = newCategoryImage;
            if (card.categoryImage) await deleteFile(card.categoryImage);
        } else if (cardData && Object.prototype.hasOwnProperty.call(cardData, 'categoryImage')) {
            const nextCat = cardData.categoryImage;
            if (nextCat === null || nextCat === '') {
                if (card.categoryImage) await deleteFile(card.categoryImage);
                updates.categoryImage = null;
            } else if (nextCat) {
                updates.categoryImage = nextCat;
            }
        }

        Object.assign(card, updates);
        await card.save();

        return res.status(200).json({
            success: true,
            message: 'Category card updated successfully',
            data: card.toObject()
        });
    } catch (error) {
        // Clean up newly uploaded files on error
        if (newBackgroundImage) await deleteFile(newBackgroundImage);
        if (newCategoryImage) await deleteFile(newCategoryImage);
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Category card not found' });
        }
        console.error('Error updating category card:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update category card'
        });
    }
};

const deleteCategoryCard = async (req, res) => {
    try {
        const { id } = req.params;
        const card = await CategoryCard.findById(id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Category card not found'
            });
        }
        if (card.backgroundImage) await deleteFile(card.backgroundImage);
        if (card.categoryImage) await deleteFile(card.categoryImage);
        await CategoryCard.findByIdAndDelete(id);
        return res.status(200).json({
            success: true,
            message: 'Category card deleted successfully'
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Category card not found' });
        }
        console.error('Error deleting category card:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete category card'
        });
    }
};

const toggleCategoryCard = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.body.isActive;
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive (boolean) is required in request body'
            });
        }
        const card = await CategoryCard.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        ).lean();
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Category card not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Category card status updated successfully',
            data: card
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Category card not found' });
        }
        console.error('Error toggling category card:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to toggle category card'
        });
    }
};

const deleteCategoryCardImage = async (req, res) => {
    try {
        const { id } = req.params;
        const { imageField } = req.body; // 'categoryImage' or 'backgroundImage'

        if (!imageField || !['categoryImage', 'backgroundImage'].includes(imageField)) {
            return res.status(400).json({
                success: false,
                message: 'imageField must be "categoryImage" or "backgroundImage"'
            });
        }

        const card = await CategoryCard.findById(id);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Category card not found'
            });
        }

        if (card[imageField]) {
            await deleteFile(card[imageField]);
            card[imageField] = null;
            await card.save();
        }

        return res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ success: false, message: 'Category card not found' });
        }
        console.error('Error deleting category card image:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete image'
        });
    }
};

const mergeCategorySection = (doc) => ({
    headingText: doc?.headingText ?? DEFAULT_CATEGORY_SECTION.headingText,
    headingColor: doc?.headingColor ?? DEFAULT_CATEGORY_SECTION.headingColor,
    dividerColor: doc?.dividerColor ?? DEFAULT_CATEGORY_SECTION.dividerColor,
    sectionBackgroundColor: doc?.sectionBackgroundColor ?? DEFAULT_CATEGORY_SECTION.sectionBackgroundColor
});

const getCategoryCardsSectionSettings = async (req, res) => {
    try {
        const doc = await CategoryCardsSection.findOne().lean();
        return res.status(200).json({
            success: true,
            data: mergeCategorySection(doc)
        });
    } catch (error) {
        console.error('Error getting category cards section settings:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to load section settings'
        });
    }
};

const updateCategoryCardsSectionSettings = async (req, res) => {
    try {
        const body = req.body || {};
        const $set = {};

        if (body.headingText !== undefined) {
            const t = sanitizeText(body.headingText);
            $set.headingText = t.slice(0, 120) || DEFAULT_CATEGORY_SECTION.headingText;
        }
        if (body.headingColor !== undefined) {
            const r = parseColorField(body.headingColor, { fallback: DEFAULT_CATEGORY_SECTION.headingColor });
            if (!r.ok) {
                return res.status(400).json({ success: false, message: r.message });
            }
            $set.headingColor = r.value;
        }
        if (body.dividerColor !== undefined) {
            const r = parseColorField(body.dividerColor, { fallback: DEFAULT_CATEGORY_SECTION.dividerColor });
            if (!r.ok) {
                return res.status(400).json({ success: false, message: r.message });
            }
            $set.dividerColor = r.value;
        }
        if (body.sectionBackgroundColor !== undefined) {
            const r = parseColorField(body.sectionBackgroundColor, {
                allowEmpty: true,
                fallback: DEFAULT_CATEGORY_SECTION.sectionBackgroundColor
            });
            if (!r.ok) {
                return res.status(400).json({ success: false, message: r.message });
            }
            $set.sectionBackgroundColor = r.value;
        }

        if (Object.keys($set).length === 0) {
            const doc = await CategoryCardsSection.findOne().lean();
            return res.status(200).json({
                success: true,
                message: 'No changes',
                data: mergeCategorySection(doc)
            });
        }

        const doc = await CategoryCardsSection.findOneAndUpdate(
            {},
            { $set },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        return res.status(200).json({
            success: true,
            message: 'Section settings saved',
            data: mergeCategorySection(doc)
        });
    } catch (error) {
        console.error('Error updating category cards section settings:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to save section settings'
        });
    }
};

const reorderCategoryCards = async (req, res) => {
    try {
        const { cardIds } = req.body;
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'cardIds array is required'
            });
        }
        const existing = await CategoryCard.find({ _id: { $in: cardIds } }).select('_id').lean();
        if (existing.length !== cardIds.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category card IDs provided'
            });
        }
        const updatePromises = cardIds.map((cardId, index) =>
            CategoryCard.findByIdAndUpdate(cardId, { order: index }, { new: true })
        );
        await Promise.all(updatePromises);
        return res.status(200).json({
            success: true,
            message: 'Category cards reordered successfully'
        });
    } catch (error) {
        console.error('Error reordering category cards:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Invalid category card IDs provided'
        });
    }
};

module.exports = {
    getCategoryCards,
    getCategoryCardsActive,
    getCategoryCardsSectionSettings,
    updateCategoryCardsSectionSettings,
    createCategoryCard,
    updateCategoryCard,
    deleteCategoryCard,
    deleteCategoryCardImage,
    toggleCategoryCard,
    reorderCategoryCards,
    handleCategoryCardUpload
};
