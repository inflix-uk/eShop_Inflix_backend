const mongoose = require('mongoose');
const HomepageSliderWidget = require('../models/homepageSliderWidget');
const { getEffectiveSettings } = require('./siteWidgetSettingsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

const UPLOAD_DIR = './uploads/homepage-slider-widget';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const useBlobStorage = blobStorage.isConfigured();
const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const safe = (file.originalname || 'slide').replace(/[^a-zA-Z0-9.-]/g, '_');
    const base = path.basename(safe, path.extname(safe)) || 'slide';
    cb(null, `slide-${base}-${Date.now()}${ext}`);
  },
});

const imageFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
}).any();

const handleHomepageSliderWidgetUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'An image exceeds the 5MB limit',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload error' });
    }
    next();
  });
};

async function uploadFile(file) {
  if (!file) return null;
  if (useBlobStorage) {
    try {
      const result = await blobStorage.uploadFile(file, 'homepage-slider-widget');
      return result ? result.url : null;
    } catch (e) {
      console.error('Blob upload error:', e);
      return null;
    }
  }
  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/${relativePath}`;
}

function getFileUrlFromDisk(file) {
  if (!file) return null;
  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/${relativePath}`;
}

async function deleteFile(filePath) {
  if (!filePath) return;
  if (
    filePath.includes('blob.vercel-storage.com') ||
    filePath.includes('public.blob.vercel-storage.com')
  ) {
    try {
      await blobStorage.deleteFile(filePath);
    } catch (error) {
      console.error(`Error deleting blob ${filePath}:`, error);
    }
    return;
  }
  if (!filePath.startsWith('/')) return;
  try {
    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (e) {
    console.error('Error deleting local file:', e);
  }
}

function isManagedStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('blob.vercel-storage.com') || url.includes('public.blob.vercel-storage.com')) {
    return true;
  }
  return url.startsWith('/uploads/');
}

function sanitizeText(text) {
  if (text == null) return '';
  return String(text).trim().replace(/[<>]/g, '');
}

function serializeSlide(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    heading: o.heading || '',
    description: o.description || '',
    imageUrl: o.imageUrl || '',
  };
}

const MAX_SLIDES = 20;

/**
 * GET /homepage-slider-widget (admin)
 */
const getHomepageSliderWidget = async (req, res) => {
  try {
    const doc = await HomepageSliderWidget.findOne().lean();
    if (!doc) {
      return res.status(200).json({
        success: true,
        data: {
          slides: [],
          isEnabled: true,
          updatedAt: null,
        },
      });
    }
    const slides = (doc.slides || []).map((s) => ({
      id: String(s._id),
      heading: s.heading || '',
      description: s.description || '',
      imageUrl: s.imageUrl || '',
    }));
    return res.status(200).json({
      success: true,
      data: {
        slides,
        isEnabled: doc.isEnabled !== false,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    console.error('getHomepageSliderWidget:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load homepage slider',
      error: error.message,
    });
  }
};

/**
 * GET /homepage-slider-widget/public
 */
const getHomepageSliderWidgetPublic = async (req, res) => {
  try {
    const eff = await getEffectiveSettings();
    if (!eff.sliderEnabled) {
      return res.status(200).json({
        success: true,
        data: { slides: [] },
      });
    }
    const doc = await HomepageSliderWidget.findOne().lean();
    if (!doc || doc.isEnabled === false) {
      return res.status(200).json({
        success: true,
        data: { slides: [] },
      });
    }
    const slides = (doc.slides || []).map((s) => ({
      id: String(s._id),
      heading: s.heading || '',
      description: s.description || '',
      imageUrl: s.imageUrl || '',
    }));
    return res.status(200).json({
      success: true,
      data: { slides },
    });
  } catch (error) {
    console.error('getHomepageSliderWidgetPublic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load homepage slider',
    });
  }
};

/**
 * POST /homepage-slider-widget (admin, multipart)
 * Body: slides = JSON array of { heading, description, imageUrl }
 * Files: slideImage_0, slideImage_1, ...
 */
const saveHomepageSliderWidget = async (req, res) => {
  try {
    let slidesPayload;
    try {
      const raw = req.body.slides;
      slidesPayload = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing slides JSON',
      });
    }

    if (!Array.isArray(slidesPayload)) {
      return res.status(400).json({
        success: false,
        message: 'slides must be an array',
      });
    }

    if (slidesPayload.length > MAX_SLIDES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_SLIDES} slides allowed`,
      });
    }

    const filesByIndex = {};
    (req.files || []).forEach((f) => {
      const m = /^slideImage_(\d+)$/.exec(f.fieldname);
      if (m) {
        filesByIndex[parseInt(m[1], 10)] = f;
      }
    });

    const oldDoc = await HomepageSliderWidget.findOne();
    const previousUrls = oldDoc
      ? oldDoc.slides.map((s) => (s.imageUrl || '').trim()).filter(Boolean)
      : [];

    const builtSlides = [];

    for (let i = 0; i < slidesPayload.length; i += 1) {
      const p = slidesPayload[i] || {};
      let imageUrl = sanitizeText(p.imageUrl);
      const idRaw = p.id != null ? String(p.id).trim() : '';
      const idOk = idRaw && mongoose.Types.ObjectId.isValid(idRaw);

      let prevSlide = null;
      if (oldDoc?.slides?.length && idOk) {
        prevSlide = oldDoc.slides.find((s) => String(s._id) === idRaw);
      }
      const prevImageUrl = prevSlide?.imageUrl ? String(prevSlide.imageUrl).trim() : '';

      const file = filesByIndex[i];
      if (file) {
        const uploadedUrl = useBlobStorage
          ? await uploadFile(file)
          : getFileUrlFromDisk(file);
        if (uploadedUrl) {
          if (prevImageUrl && prevImageUrl !== uploadedUrl && isManagedStorageUrl(prevImageUrl)) {
            await deleteFile(prevImageUrl);
          }
          imageUrl = uploadedUrl;
        }
      }
      if (!imageUrl && prevImageUrl) {
        if (isManagedStorageUrl(prevImageUrl)) {
          await deleteFile(prevImageUrl);
        }
      }

      builtSlides.push({
        ...(idOk ? { _id: new mongoose.Types.ObjectId(idRaw) } : {}),
        heading: sanitizeText(p.heading),
        description: sanitizeText(p.description),
        imageUrl,
      });
    }

    const newUrls = new Set(builtSlides.map((s) => s.imageUrl).filter(Boolean));
    for (const url of previousUrls) {
      if (!newUrls.has(url) && isManagedStorageUrl(url)) {
        await deleteFile(url);
      }
    }

    let isEnabled = true;
    if (req.body.isEnabled === 'false' || req.body.isEnabled === false) {
      isEnabled = false;
    } else if (req.body.isEnabled === 'true' || req.body.isEnabled === true) {
      isEnabled = true;
    }

    const doc = await HomepageSliderWidget.findOneAndUpdate(
      {},
      {
        $set: {
          slides: builtSlides,
          isEnabled,
        },
      },
      { upsert: true, new: true }
    );

    const slides = (doc.slides || []).map((s) => serializeSlide(s));

    return res.status(200).json({
      success: true,
      message: 'Homepage slider saved',
      data: {
        slides,
        isEnabled: doc.isEnabled !== false,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    console.error('saveHomepageSliderWidget:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save homepage slider',
      error: error.message,
    });
  }
};

module.exports = {
  getHomepageSliderWidget,
  getHomepageSliderWidgetPublic,
  saveHomepageSliderWidget,
  handleHomepageSliderWidgetUpload,
};
