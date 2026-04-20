const HomepageNewsletterWidget = require('../models/homepageNewsletterWidget');
const { getEffectiveSettings } = require('./siteWidgetSettingsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

const UPLOAD_DIR = './uploads/homepage-newsletter-widget';
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
    cb(null, `hero-${Date.now()}${ext}`);
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
}).single('heroImage');

const handleHomepageNewsletterWidgetUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image exceeds the 5MB limit',
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
      const result = await blobStorage.uploadFile(file, 'homepage-newsletter-widget');
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

const BLOCKED_NEWSLETTER_PLACEHOLDERS = new Set(['malikoffical32@gmail.com']);

function normalizeNewsletterPlaceholder(raw) {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return '';
  if (BLOCKED_NEWSLETTER_PLACEHOLDERS.has(s.toLowerCase())) {
    return 'Enter your email';
  }
  return s;
}

function serializeDoc(doc) {
  if (!doc) {
    return {
      heading: '',
      description: '',
      placeholder: 'Enter your email',
      buttonLabel: 'Subscribe',
      imageUrl: '',
      updatedAt: null,
    };
  }
  const o = doc;
  return {
    heading: o.heading || '',
    description: o.description || '',
    placeholder: normalizeNewsletterPlaceholder(o.placeholder) || 'Enter your email',
    buttonLabel: o.buttonLabel || 'Subscribe',
    imageUrl: o.imageUrl || '',
    updatedAt: o.updatedAt || null,
  };
}

const getHomepageNewsletterWidget = async (req, res) => {
  try {
    const doc = await HomepageNewsletterWidget.findOne().lean();
    return res.status(200).json({
      success: true,
      data: serializeDoc(doc),
    });
  } catch (error) {
    console.error('getHomepageNewsletterWidget:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load homepage newsletter widget',
      error: error.message,
    });
  }
};

const getHomepageNewsletterWidgetPublic = async (req, res) => {
  try {
    const eff = await getEffectiveSettings();
    if (!eff.newsletterEnabled) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }
    const doc = await HomepageNewsletterWidget.findOne().lean();
    if (!doc) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }
    return res.status(200).json({
      success: true,
      data: serializeDoc(doc),
    });
  } catch (error) {
    console.error('getHomepageNewsletterWidgetPublic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load homepage newsletter widget',
    });
  }
};

const saveHomepageNewsletterWidget = async (req, res) => {
  try {
    let payload = {};
    try {
      const raw = req.body.payload;
      payload = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload JSON',
      });
    }

    const oldDoc = await HomepageNewsletterWidget.findOne();
    const prevImageUrl = oldDoc?.imageUrl ? String(oldDoc.imageUrl).trim() : '';

    let imageUrl = sanitizeText(payload.imageUrl);

    if (req.file) {
      const uploadedUrl = useBlobStorage ? await uploadFile(req.file) : getFileUrlFromDisk(req.file);
      if (uploadedUrl) {
        if (prevImageUrl && prevImageUrl !== uploadedUrl && isManagedStorageUrl(prevImageUrl)) {
          await deleteFile(prevImageUrl);
        }
        imageUrl = uploadedUrl;
      }
    } else if (!imageUrl && prevImageUrl) {
      if (isManagedStorageUrl(prevImageUrl)) {
        await deleteFile(prevImageUrl);
      }
    }

    const doc = await HomepageNewsletterWidget.findOneAndUpdate(
      {},
      {
        $set: {
          heading: sanitizeText(payload.heading),
          description: sanitizeText(payload.description),
          placeholder:
            normalizeNewsletterPlaceholder(sanitizeText(payload.placeholder)) || 'Enter your email',
          buttonLabel: sanitizeText(payload.buttonLabel) || 'Subscribe',
          imageUrl,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Newsletter widget saved',
      data: serializeDoc(doc),
    });
  } catch (error) {
    console.error('saveHomepageNewsletterWidget:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save homepage newsletter widget',
      error: error.message,
    });
  }
};

module.exports = {
  getHomepageNewsletterWidget,
  getHomepageNewsletterWidgetPublic,
  saveHomepageNewsletterWidget,
  handleHomepageNewsletterWidgetUpload,
};
