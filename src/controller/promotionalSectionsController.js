// controller/promotionalSectionsController.js
const BuyNowPayLater = require('../models/buyNowPayLater');
const SellBuyCards = require('../models/sellBuyCards');
const TinyPhoneBanner = require('../models/tinyPhoneBanner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

const UPLOAD_DIR = './uploads/promotional-sections';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local development
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const base = (file.originalname || file.fieldname || 'img').replace(/[^a-zA-Z0-9.-]/g, '_');
        const name = `${path.basename(base, path.extname(base))}-${Date.now()}${ext}`;
        cb(null, name);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'), false);
};

const multerBase = multer({ storage: useBlobStorage ? memoryStorage : diskStorage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'promotional-sections') {
    if (!file) return null;
    try {
        const result = await blobStorage.uploadFile(file, folder);
        return result ? result.url : null;
    } catch (error) {
        console.error('Error uploading to blob:', error);
        return null;
    }
}

const buyNowPayLaterFields = [
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'paymentImage0', maxCount: 1 },
    { name: 'paymentImage1', maxCount: 1 },
    { name: 'paymentImage2', maxCount: 1 }
];
const sellBuyCardsFields = [
    { name: 'sellBackgroundImage', maxCount: 1 },
    { name: 'sellProductImage', maxCount: 1 },
    { name: 'buyBackgroundImage', maxCount: 1 },
    { name: 'buyProductImage', maxCount: 1 }
];
const tinyPhoneBannerFields = [
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'centerImage', maxCount: 1 },
    { name: 'rightImage', maxCount: 1 }
];

const handleBuyNowPayLaterUpload = (req, res, next) => {
    multerBase.fields(buyNowPayLaterFields)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds 2MB limit' : err.message });
        }
        if (err) return res.status(400).json({ success: false, message: err.message || 'File validation error' });
        next();
    });
};
const handleSellBuyCardsUpload = (req, res, next) => {
    multerBase.fields(sellBuyCardsFields)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds 2MB limit' : err.message });
        }
        if (err) return res.status(400).json({ success: false, message: err.message || 'File validation error' });
        next();
    });
};
const handleTinyPhoneBannerUpload = (req, res, next) => {
    multerBase.fields(tinyPhoneBannerFields)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds 2MB limit' : err.message });
        }
        if (err) return res.status(400).json({ success: false, message: err.message || 'File validation error' });
        next();
    });
};

function getFileUrl(file) {
    if (!file) return null;
    const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
    return `/uploads/${relativePath}`;
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
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (e) { console.error('Error deleting file:', e); }
    }
}

// Helper to get image URL from file (blob or local)
async function getImageUrl(file, folder = 'promotional-sections') {
    if (!file) return null;
    if (useBlobStorage) {
        return await uploadToBlob(file, folder);
    } else {
        return getFileUrl(file);
    }
}

function sanitize(text) {
    if (text == null) return '';
    return String(text).trim().replace(/[<>]/g, '');
}

function parseBody(req, key) {
    const raw = req.body[key];
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return null; }
}

// ---------- Buy Now Pay Later ----------
const getBuyNowPayLater = async (req, res) => {
    try {
        const doc = await BuyNowPayLater.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

const getBuyNowPayLaterActive = async (req, res) => {
    try {
        const doc = await BuyNowPayLater.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

const updateBuyNowPayLater = async (req, res) => {
    const uploadedFiles = [];
    try {
        const data = parseBody(req, 'bannerData');
        if (!data) return res.status(400).json({ success: false, message: 'bannerData (JSON string) is required' });
        const heading = sanitize(data.heading);
        const paragraph = sanitize(data.paragraph);
        if (!heading) return res.status(400).json({ success: false, message: 'heading is required' });
        if (!paragraph) return res.status(400).json({ success: false, message: 'paragraph is required' });

        let doc = await BuyNowPayLater.findOne();
        const files = req.files || {};
        const bgFile = files.backgroundImage && files.backgroundImage[0];
        const pay0 = files.paymentImage0 && files.paymentImage0[0];
        const pay1 = files.paymentImage1 && files.paymentImage1[0];
        const pay2 = files.paymentImage2 && files.paymentImage2[0];

        if (!doc && !bgFile) return res.status(400).json({ success: false, message: 'backgroundImage file is required when creating' });

        let backgroundImage = doc ? doc.backgroundImage : (data.backgroundImage || null);
        if (bgFile) {
            const oldBg = doc && doc.backgroundImage;
            backgroundImage = await getImageUrl(bgFile, 'promotional-sections');
            uploadedFiles.push(backgroundImage);
            if (oldBg) await deleteFile(oldBg);
        } else if (data.backgroundImage) backgroundImage = data.backgroundImage;
        if (!backgroundImage) return res.status(400).json({ success: false, message: 'backgroundImage is required' });

        let paymentImages = (doc && doc.paymentImages) ? [...doc.paymentImages] : (data.paymentImages && Array.isArray(data.paymentImages) ? data.paymentImages.slice(0, 3) : ['', '', '']);
        while (paymentImages.length < 3) paymentImages.push('');
        if (pay0) { const old = paymentImages[0]; paymentImages[0] = await getImageUrl(pay0, 'promotional-sections'); uploadedFiles.push(paymentImages[0]); if (old) await deleteFile(old); }
        if (pay1) { const old = paymentImages[1]; paymentImages[1] = await getImageUrl(pay1, 'promotional-sections'); uploadedFiles.push(paymentImages[1]); if (old) await deleteFile(old); }
        if (pay2) { const old = paymentImages[2]; paymentImages[2] = await getImageUrl(pay2, 'promotional-sections'); uploadedFiles.push(paymentImages[2]); if (old) await deleteFile(old); }
        paymentImages = paymentImages.slice(0, 3);

        if (!doc) {
            doc = new BuyNowPayLater({ heading, paragraph, backgroundImage, paymentImages });
            await doc.save();
        } else {
            doc.heading = heading;
            doc.paragraph = paragraph;
            doc.backgroundImage = backgroundImage;
            doc.paymentImages = paymentImages;
            await doc.save();
        }
        return res.status(200).json({ success: true, message: 'Buy Now Pay Later banner updated successfully', data: doc.toObject ? doc.toObject() : doc });
    } catch (e) {
        // Clean up any uploaded files on error
        for (const url of uploadedFiles) {
            if (url) await deleteFile(url);
        }
        return res.status(500).json({ success: false, message: e.message || 'Failed to update' });
    }
};

// ---------- Sell/Buy Cards ----------
const getSellBuyCards = async (req, res) => {
    try {
        const doc = await SellBuyCards.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

const getSellBuyCardsActive = async (req, res) => {
    try {
        const doc = await SellBuyCards.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

function validateCard(card, prefix) {
    if (!card || typeof card !== 'object') return `${prefix} is required`;
    if (!sanitize(card.heading)) return `${prefix}.heading is required`;
    if (!sanitize(card.paragraph)) return `${prefix}.paragraph is required`;
    if (!sanitize(card.buttonName)) return `${prefix}.buttonName is required`;
    if (!sanitize(card.buttonLink)) return `${prefix}.buttonLink is required`;
    return null;
}

const updateSellBuyCards = async (req, res) => {
    const uploadedFiles = [];
    try {
        const data = parseBody(req, 'cardsData');
        if (!data) return res.status(400).json({ success: false, message: 'cardsData (JSON string) is required' });
        const sellCard = data.sellCard;
        const buyCard = data.buyCard;
        let errMsg = validateCard(sellCard, 'sellCard');
        if (errMsg) return res.status(400).json({ success: false, message: errMsg });
        errMsg = validateCard(buyCard, 'buyCard');
        if (errMsg) return res.status(400).json({ success: false, message: errMsg });

        let doc = await SellBuyCards.findOne();
        const files = req.files || {};

        const sellBg = files.sellBackgroundImage && files.sellBackgroundImage[0];
        const sellProd = files.sellProductImage && files.sellProductImage[0];
        const buyBg = files.buyBackgroundImage && files.buyBackgroundImage[0];
        const buyProd = files.buyProductImage && files.buyProductImage[0];

        const buildCard = async (card, existing, bgFile, prodFile) => {
            let backgroundImage = existing ? existing.backgroundImage : (card.backgroundImage || '');
            let productImage = existing ? existing.productImage : (card.productImage || null);
            if (bgFile) {
                const oldBg = existing && existing.backgroundImage;
                backgroundImage = await getImageUrl(bgFile, 'promotional-sections');
                uploadedFiles.push(backgroundImage);
                if (oldBg) await deleteFile(oldBg);
            } else if (card.backgroundImage) backgroundImage = card.backgroundImage;
            if (prodFile) {
                const oldProd = existing && existing.productImage;
                productImage = await getImageUrl(prodFile, 'promotional-sections');
                uploadedFiles.push(productImage);
                if (oldProd) await deleteFile(oldProd);
            } else if (card.productImage !== undefined) productImage = card.productImage || null;
            return {
                heading: sanitize(card.heading),
                paragraph: sanitize(card.paragraph),
                buttonName: sanitize(card.buttonName),
                buttonLink: sanitize(card.buttonLink),
                backgroundImage,
                productImage: productImage || undefined
            };
        };

        if (!doc) {
            if (!sellBg) return res.status(400).json({ success: false, message: 'sellBackgroundImage file is required when creating' });
            if (!buyBg) return res.status(400).json({ success: false, message: 'buyBackgroundImage file is required when creating' });
        }
        const sell = await buildCard(sellCard, doc && doc.sellCard, sellBg, sellProd);
        const buy = await buildCard(buyCard, doc && doc.buyCard, buyBg, buyProd);
        if (!sell.backgroundImage) return res.status(400).json({ success: false, message: 'sellCard.backgroundImage is required' });
        if (!buy.backgroundImage) return res.status(400).json({ success: false, message: 'buyCard.backgroundImage is required' });

        if (!doc) {
            doc = new SellBuyCards({ sellCard: sell, buyCard: buy });
            await doc.save();
        } else {
            doc.sellCard = sell;
            doc.buyCard = buy;
            await doc.save();
        }
        return res.status(200).json({ success: true, message: 'Sell/Buy Cards updated successfully', data: doc.toObject ? doc.toObject() : doc });
    } catch (e) {
        // Clean up any uploaded files on error
        for (const url of uploadedFiles) {
            if (url) await deleteFile(url);
        }
        return res.status(500).json({ success: false, message: e.message || 'Failed to update' });
    }
};

// ---------- Delete Image from Promotional Section ----------
const deletePromotionalImage = async (req, res) => {
    try {
        const { sectionType, imageField, imageIndex } = req.body;

        if (!sectionType || !imageField) {
            return res.status(400).json({ success: false, message: 'sectionType and imageField are required' });
        }

        let imageUrl;

        switch (sectionType) {
            case 'buy-now-pay-later':
                const buyNowDoc = await BuyNowPayLater.findOne();
                if (!buyNowDoc) return res.status(404).json({ success: false, message: 'Buy Now Pay Later not found' });

                if (imageField === 'backgroundImage') {
                    imageUrl = buyNowDoc.backgroundImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        // Update DB - bypass validation with updateOne
                        await BuyNowPayLater.updateOne({}, { $set: { backgroundImage: '' } });
                    }
                } else if (imageField === 'paymentImage' && typeof imageIndex === 'number') {
                    if (imageIndex >= 0 && imageIndex < 3 && buyNowDoc.paymentImages[imageIndex]) {
                        imageUrl = buyNowDoc.paymentImages[imageIndex];
                        await deleteFile(imageUrl);
                        const updatePath = `paymentImages.${imageIndex}`;
                        await BuyNowPayLater.updateOne({}, { $set: { [updatePath]: '' } });
                    }
                }
                break;

            case 'sell-buy-cards':
                const sellBuyDoc = await SellBuyCards.findOne();
                if (!sellBuyDoc) return res.status(404).json({ success: false, message: 'Sell/Buy Cards not found' });

                if (imageField === 'sellBackgroundImage') {
                    imageUrl = sellBuyDoc.sellCard?.backgroundImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await SellBuyCards.updateOne({}, { $set: { 'sellCard.backgroundImage': '' } });
                    }
                } else if (imageField === 'sellProductImage') {
                    imageUrl = sellBuyDoc.sellCard?.productImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await SellBuyCards.updateOne({}, { $set: { 'sellCard.productImage': null } });
                    }
                } else if (imageField === 'buyBackgroundImage') {
                    imageUrl = sellBuyDoc.buyCard?.backgroundImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await SellBuyCards.updateOne({}, { $set: { 'buyCard.backgroundImage': '' } });
                    }
                } else if (imageField === 'buyProductImage') {
                    imageUrl = sellBuyDoc.buyCard?.productImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await SellBuyCards.updateOne({}, { $set: { 'buyCard.productImage': null } });
                    }
                }
                break;

            case 'tiny-phone-banner':
                const tinyDoc = await TinyPhoneBanner.findOne();
                if (!tinyDoc) return res.status(404).json({ success: false, message: 'Tiny Phone Banner not found' });

                if (imageField === 'backgroundImage') {
                    imageUrl = tinyDoc.backgroundImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await TinyPhoneBanner.updateOne({}, { $set: { backgroundImage: '' } });
                    }
                } else if (imageField === 'centerImage') {
                    imageUrl = tinyDoc.centerImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await TinyPhoneBanner.updateOne({}, { $set: { centerImage: null } });
                    }
                } else if (imageField === 'rightImage') {
                    imageUrl = tinyDoc.rightImage;
                    if (imageUrl) {
                        await deleteFile(imageUrl);
                        await TinyPhoneBanner.updateOne({}, { $set: { rightImage: null } });
                    }
                }
                break;

            default:
                return res.status(400).json({ success: false, message: 'Invalid section type' });
        }

        return res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } catch (e) {
        console.error('Error deleting promotional image:', e);
        return res.status(500).json({ success: false, message: e.message || 'Failed to delete image' });
    }
};

// ---------- Tiny Phone Banner ----------
const getTinyPhoneBanner = async (req, res) => {
    try {
        const doc = await TinyPhoneBanner.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

const getTinyPhoneBannerActive = async (req, res) => {
    try {
        const doc = await TinyPhoneBanner.findOne().lean();
        if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: doc });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message || 'Failed to fetch' });
    }
};

const updateTinyPhoneBanner = async (req, res) => {
    const uploadedFiles = [];
    try {
        const data = parseBody(req, 'bannerData');
        if (!data) return res.status(400).json({ success: false, message: 'bannerData (JSON string) is required' });
        const heading = sanitize(data.heading);
        const paragraph = sanitize(data.paragraph);
        const buttonName = sanitize(data.buttonName);
        const buttonLink = sanitize(data.buttonLink);
        if (!heading) return res.status(400).json({ success: false, message: 'heading is required' });
        if (!paragraph) return res.status(400).json({ success: false, message: 'paragraph is required' });
        if (!buttonName) return res.status(400).json({ success: false, message: 'buttonName is required' });
        if (!buttonLink) return res.status(400).json({ success: false, message: 'buttonLink is required' });

        let doc = await TinyPhoneBanner.findOne();
        const files = req.files || {};
        const bgFile = files.backgroundImage && files.backgroundImage[0];
        const centerFile = files.centerImage && files.centerImage[0];
        const rightFile = files.rightImage && files.rightImage[0];

        if (!doc && !bgFile) return res.status(400).json({ success: false, message: 'backgroundImage file is required when creating' });

        let backgroundImage = doc ? doc.backgroundImage : (data.backgroundImage || null);
        if (bgFile) {
            const oldBg = doc && doc.backgroundImage;
            backgroundImage = await getImageUrl(bgFile, 'promotional-sections');
            uploadedFiles.push(backgroundImage);
            if (oldBg) await deleteFile(oldBg);
        }
        if (!backgroundImage) return res.status(400).json({ success: false, message: 'backgroundImage is required' });

        let centerImage = doc ? doc.centerImage : (data.centerImage || null);
        if (centerFile) {
            const oldCenter = doc && doc.centerImage;
            centerImage = await getImageUrl(centerFile, 'promotional-sections');
            uploadedFiles.push(centerImage);
            if (oldCenter) await deleteFile(oldCenter);
        } else if (data.centerImage !== undefined) centerImage = data.centerImage || null;

        let rightImage = doc ? doc.rightImage : (data.rightImage || null);
        if (rightFile) {
            const oldRight = doc && doc.rightImage;
            rightImage = await getImageUrl(rightFile, 'promotional-sections');
            uploadedFiles.push(rightImage);
            if (oldRight) await deleteFile(oldRight);
        } else if (data.rightImage !== undefined) rightImage = data.rightImage || null;

        if (!doc) {
            doc = new TinyPhoneBanner({ heading, paragraph, buttonName, buttonLink, backgroundImage, centerImage, rightImage });
            await doc.save();
        } else {
            doc.heading = heading;
            doc.paragraph = paragraph;
            doc.buttonName = buttonName;
            doc.buttonLink = buttonLink;
            doc.backgroundImage = backgroundImage;
            doc.centerImage = centerImage;
            doc.rightImage = rightImage;
            await doc.save();
        }
        return res.status(200).json({ success: true, message: 'Tiny Phone Banner updated successfully', data: doc.toObject ? doc.toObject() : doc });
    } catch (e) {
        // Clean up any uploaded files on error
        for (const url of uploadedFiles) {
            if (url) await deleteFile(url);
        }
        return res.status(500).json({ success: false, message: e.message || 'Failed to update' });
    }
};

module.exports = {
    getBuyNowPayLater,
    getBuyNowPayLaterActive,
    updateBuyNowPayLater,
    handleBuyNowPayLaterUpload,
    getSellBuyCards,
    getSellBuyCardsActive,
    updateSellBuyCards,
    handleSellBuyCardsUpload,
    getTinyPhoneBanner,
    getTinyPhoneBannerActive,
    updateTinyPhoneBanner,
    handleTinyPhoneBannerUpload,
    deletePromotionalImage
};
