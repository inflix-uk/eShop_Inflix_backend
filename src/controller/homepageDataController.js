const HomepageData = require('../models/homepageData');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

// Check if we should use Blob storage (Vercel) or local disk storage (development)
const useBlobStorage = blobStorage.isConfigured();

// Get admin identifier for logging
const getAdminIdentifier = (req) => {
  return req.headers['x-user-id'] ||
         req.headers['x-admin-id'] ||
         req.headers['authorization']?.substring(0, 20) ||
         req.ip ||
         'unknown';
};

// Memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

// Configure multer disk storage
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationFolder = './uploads/homepage';
    fs.mkdirSync(destinationFolder, { recursive: true });
    cb(null, destinationFolder);
  },
  filename: function (req, file, cb) {
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase();

    const timestamp = Date.now();
    const extension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, extension);
    const uniqueFilename = `${baseName}_${timestamp}${extension}`;

    cb(null, uniqueFilename);
  }
});

// Helper function to upload file to Blob storage
async function uploadToBlob(file, folder = 'homepage') {
  if (!file) return null;
  try {
    const result = await blobStorage.uploadFile(file, folder);
    return result ? result.url : null;
  } catch (error) {
    console.error('Error uploading to blob:', error);
    return null;
  }
}

// Single homepage image upload (strict images only)
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, svg, gif)'));
};

// Block uploads: images (homepage / widgets) or video widget files
const blockMediaFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase().replace(/^\./, '');
  const imageExt = /^(jpeg|jpg|png|webp|svg|gif)$/.test(ext);
  const videoExt = /^(mp4|webm|ogv|ogg)$/.test(ext);
  const mime = file.mimetype || '';
  if (imageExt && mime.startsWith('image/')) return cb(null, true);
  if (videoExt && mime.startsWith('video/')) return cb(null, true);
  if (mime.startsWith('image/')) return cb(null, true);
  if (mime.startsWith('video/')) return cb(null, true);
  cb(new Error('Only image or video files are allowed for content blocks'));
};

const BLOCK_IMAGE_SLOT_COUNT = 40;
const multerBlockImageFields = Array.from({ length: BLOCK_IMAGE_SLOT_COUNT }, (_, i) => ({
  name: `blockImages_${i}`,
  maxCount: 1
}));

/**
 * Replace __FILE_REFERENCE__n__ in image blocks and slider widget slide imageUrls.
 */
function replaceFileReferenceInBlocks(blocks, placeholder, fileUrl) {
  if (!Array.isArray(blocks)) return false;
  for (const row of blocks) {
    if (!row.columns || !Array.isArray(row.columns)) continue;
    for (const column of row.columns) {
      if (!column.blocks || !Array.isArray(column.blocks)) continue;
      for (const block of column.blocks) {
        if (!block) continue;
        if (block.type === 'image' && block.content && block.content.url === placeholder) {
          block.content.url = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'slider' &&
          Array.isArray(block.content.slides)
        ) {
          for (const slide of block.content.slides) {
            if (slide && slide.imageUrl === placeholder) {
              slide.imageUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'newsletter' &&
          block.content.imageUrl === placeholder
        ) {
          block.content.imageUrl = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'video' &&
          block.content.videoUrl === placeholder
        ) {
          block.content.videoUrl = fileUrl;
          return true;
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'gallery' &&
          Array.isArray(block.content.items)
        ) {
          for (const gi of block.content.items) {
            if (gi && gi.imageUrl === placeholder) {
              gi.imageUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'testimonials' &&
          Array.isArray(block.content.items)
        ) {
          for (const ti of block.content.items) {
            if (ti && ti.avatarUrl === placeholder) {
              ti.avatarUrl = fileUrl;
              return true;
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'siteBanners' &&
          Array.isArray(block.content.items)
        ) {
          for (const bi of block.content.items) {
            if (!bi) continue;
            for (const field of ['imageLarge', 'imageSmall', 'extraImage']) {
              if (bi[field] === placeholder) {
                bi[field] = fileUrl;
                return true;
              }
            }
          }
        }
        if (
          block.type === 'widget' &&
          block.content &&
          block.content.widgetType === 'categoryCards' &&
          Array.isArray(block.content.items)
        ) {
          for (const ci of block.content.items) {
            if (!ci) continue;
            for (const field of ['backgroundImage', 'categoryImage']) {
              if (ci[field] === placeholder) {
                ci[field] = fileUrl;
                return true;
              }
            }
          }
        }
        if (block.type === 'widget' && block.content && block.content.widgetType === 'promotionalSections') {
          const c = block.content;
          if (c.buyNowPayLater) {
            if (c.buyNowPayLater.backgroundImage === placeholder) {
              c.buyNowPayLater.backgroundImage = fileUrl;
              return true;
            }
            if (Array.isArray(c.buyNowPayLater.paymentImages)) {
              for (let pi = 0; pi < c.buyNowPayLater.paymentImages.length; pi++) {
                if (c.buyNowPayLater.paymentImages[pi] === placeholder) {
                  c.buyNowPayLater.paymentImages[pi] = fileUrl;
                  return true;
                }
              }
            }
          }
          if (c.sellBuyCards?.sellCard) {
            const s = c.sellBuyCards.sellCard;
            if (s.backgroundImage === placeholder) {
              s.backgroundImage = fileUrl;
              return true;
            }
            if (s.productImage === placeholder) {
              s.productImage = fileUrl;
              return true;
            }
          }
          if (c.sellBuyCards?.buyCard) {
            const b = c.sellBuyCards.buyCard;
            if (b.backgroundImage === placeholder) {
              b.backgroundImage = fileUrl;
              return true;
            }
            if (b.productImage === placeholder) {
              b.productImage = fileUrl;
              return true;
            }
          }
          if (c.tinyPhoneBanner) {
            const t = c.tinyPhoneBanner;
            if (t.backgroundImage === placeholder) {
              t.backgroundImage = fileUrl;
              return true;
            }
            if (t.centerImage === placeholder) {
              t.centerImage = fileUrl;
              return true;
            }
            if (t.rightImage === placeholder) {
              t.rightImage = fileUrl;
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function getLocalUploadFileUrl(file) {
  if (!file) return null;
  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/${relativePath}`;
}

/**
 * Meta keywords (stored as metaTags) — align with new blog SeoTabForm / newBlog.js
 */
function normalizeMetaTags(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((t) => (typeof t === 'string' ? t.trim() : String(t)))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Meta schema list (URLs or strings per row) — align with new blog
 */
function normalizeMetaSchema(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((s) => (typeof s === 'string' ? s.trim() : String(s)))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function seoPayloadFromDoc(data) {
  if (!data) {
    return {
      metaTitle: '',
      metaDescription: '',
      metaTags: [],
      metaSchema: [],
      updatedAt: null
    };
  }
  return {
    metaTitle: data.metaTitle || '',
    metaDescription: data.metaDescription || '',
    metaTags: normalizeMetaTags(data.metaTags),
    metaSchema: normalizeMetaSchema(data.metaSchema),
    updatedAt: data.updatedAt || null
  };
}

/**
 * GET /homepage-data/seo (admin)
 * Homepage SEO only: Meta Title, Meta Description, meta keywords (metaTags), Meta Schema
 */
const getHomepageSeo = async (req, res) => {
  try {
    const data = await HomepageData.findOne()
      .select('metaTitle metaDescription metaTags metaSchema updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      data: seoPayloadFromDoc(data)
    });
  } catch (error) {
    console.error('Error fetching homepage SEO:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage SEO',
      error: error.message
    });
  }
};

/**
 * GET /homepage-data/public/seo
 * Public read for storefront metadata (no blocks).
 */
const getHomepagePublicSeo = async (req, res) => {
  try {
    const data = await HomepageData.findOne()
      .select('metaTitle metaDescription metaTags metaSchema updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      data: seoPayloadFromDoc(data)
    });
  } catch (error) {
    console.error('Error fetching public homepage SEO:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage SEO',
      error: error.message
    });
  }
};

/**
 * PATCH /homepage-data/seo (admin, JSON body)
 * Updates only SEO fields; does not require blocks (upsert uses empty blocks if new doc).
 */
const patchHomepageSeo = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

    const $set = {};
    if (Object.prototype.hasOwnProperty.call(body, 'metaTitle')) {
      $set.metaTitle = typeof body.metaTitle === 'string' ? body.metaTitle : String(body.metaTitle ?? '');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'metaDescription')) {
      $set.metaDescription =
        typeof body.metaDescription === 'string'
          ? body.metaDescription
          : String(body.metaDescription ?? '');
    }
    if (Object.prototype.hasOwnProperty.call(body, 'metaTags')) {
      $set.metaTags = normalizeMetaTags(body.metaTags);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'metaSchema')) {
      $set.metaSchema = normalizeMetaSchema(body.metaSchema);
    }

    if (Object.keys($set).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid SEO fields to update (metaTitle, metaDescription, metaTags, metaSchema)'
      });
    }

    $set.updatedAt = new Date();

    const data = await HomepageData.findOneAndUpdate(
      {},
      { $set, $setOnInsert: { blocks: [] } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(`[ADMIN ACTION] Admin ${adminId} patched homepage SEO at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Homepage SEO updated successfully',
      data: seoPayloadFromDoc(data)
    });
  } catch (error) {
    console.error('Error patching homepage SEO:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update homepage SEO',
      error: error.message
    });
  }
};

/**
 * GET /homepage-data
 * Get homepage data or return empty structure
 */
const getHomepageData = async (req, res) => {
  try {
    let data = await HomepageData.findOne();

    if (!data) {
      return res.status(200).json({
        success: true,
        data: {
          blocks: [],
          ...seoPayloadFromDoc(null)
        },
        message: 'No homepage data found, returning empty structure'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        blocks: data.blocks || [],
        ...seoPayloadFromDoc(data)
      }
    });
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage data',
      error: error.message
    });
  }
};

/**
 * POST /homepage-data
 * Create or update homepage data (upsert).
 * Multipart: field `homepageData` (JSON string) + optional `blockImages_*` files.
 * JSON body: `{ blocks }` (legacy / no uploads).
 * Optional in homepageData JSON (same as blog SEO): metaTitle, metaDescription, metaTags (keywords), metaSchema.
 */
const saveHomepageData = async (req, res) => {
  try {
    let payload;
    const rawHomepage = req.body && req.body.homepageData;

    if (rawHomepage != null && rawHomepage !== '') {
      if (typeof rawHomepage === 'string') {
        try {
          payload = JSON.parse(rawHomepage);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'Invalid homepageData JSON'
          });
        }
      } else if (typeof rawHomepage === 'object') {
        payload = rawHomepage;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid homepageData'
        });
      }
    } else {
      payload = req.body && typeof req.body === 'object' ? req.body : {};
    }

    let blocks = payload.blocks;
    if (typeof blocks === 'string') {
      try {
        blocks = JSON.parse(blocks);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blocks JSON'
        });
      }
    }

    if (blocks === undefined || blocks === null) {
      return res.status(400).json({
        success: false,
        message: 'Blocks data is required'
      });
    }

    const blockImageCount = parseInt(payload.blockImageCount || '0', 10);

    if (blockImageCount > 0 && req.files) {
      for (let i = 0; i < blockImageCount; i++) {
        const imageField = `blockImages_${i}`;
        if (req.files[imageField] && req.files[imageField].length > 0) {
          const file = req.files[imageField][0];
          let fileUrl;
          if (useBlobStorage) {
            fileUrl = await uploadToBlob(file, 'homepage/blocks');
          } else {
            fileUrl = getLocalUploadFileUrl(file);
          }
          if (fileUrl) {
            const placeholder = `__FILE_REFERENCE__${i}__`;
            const replaced = replaceFileReferenceInBlocks(blocks, placeholder, fileUrl);
            if (!replaced) {
              console.warn(`[homepage-data] No placeholder ${placeholder} for uploaded file`);
            }
          }
        }
      }
    }

    const setDoc = { blocks };
    if (payload.metaTitle !== undefined) {
      setDoc.metaTitle =
        typeof payload.metaTitle === 'string' ? payload.metaTitle : String(payload.metaTitle ?? '');
    }
    if (payload.metaDescription !== undefined) {
      setDoc.metaDescription =
        typeof payload.metaDescription === 'string'
          ? payload.metaDescription
          : String(payload.metaDescription ?? '');
    }
    if (payload.metaTags !== undefined) {
      setDoc.metaTags = normalizeMetaTags(payload.metaTags);
    }
    if (payload.metaSchema !== undefined) {
      setDoc.metaSchema = normalizeMetaSchema(payload.metaSchema);
    }

    const data = await HomepageData.findOneAndUpdate(
      {},
      { $set: setDoc },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(`[ADMIN ACTION] Admin ${adminId} saved homepage data at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Homepage data saved successfully',
      data: {
        blocks: data.blocks,
        ...seoPayloadFromDoc(data)
      }
    });
  } catch (error) {
    console.error('Error saving homepage data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save homepage data',
      error: error.message
    });
  }
};

/**
 * POST /homepage-data/upload-image
 * Upload an image for homepage content
 */
const uploadHomepageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    let imagePath;

    if (useBlobStorage) {
      imagePath = await uploadToBlob(req.file, 'homepage');

      if (!imagePath) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to storage'
        });
      }
    } else {
      const relativePath = path.relative('./uploads', req.file.path).replace(/\\/g, '/');
      imagePath = `/${relativePath}`;
    }

    const adminId = getAdminIdentifier(req);
    console.log(`[ADMIN ACTION] Admin ${adminId} uploaded homepage image: ${imagePath} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imagePath,
      url: imagePath,
      data: {
        path: imagePath,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading homepage image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
};

// Multer upload configuration
const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter
}).single('image');

// Middleware to handle file uploads
const handleHomepageImageUpload = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB'
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
        message: 'Unknown upload error',
        error: err.message
      });
    }
    next();
  });
};

const uploadHomepageSave = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: blockMediaFileFilter
}).fields(multerBlockImageFields);

const handleHomepageDataSave = (req, res, next) => {
  uploadHomepageSave(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 80MB per block file'
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
        message: 'Unknown upload error',
        error: err.message
      });
    }
    next();
  });
};

module.exports = {
  getHomepageData,
  getHomepageSeo,
  getHomepagePublicSeo,
  patchHomepageSeo,
  saveHomepageData,
  uploadHomepageImage,
  handleHomepageImageUpload,
  handleHomepageDataSave
};
