const DealsModalSettings = require('../models/dealsModalSettings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const blobStorage = require('../utils/blobStorage');

const UPLOAD_DIR = './uploads/deals-modal';
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const useBlobStorage = blobStorage.isConfigured();
const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `deals-modal-${Date.now()}${ext}`);
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
}).single('bannerImage');

const handleDealsModalUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Image exceeds the 8MB limit',
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

async function uploadBannerFile(file) {
  if (!file) return null;
  if (useBlobStorage) {
    try {
      const result = await blobStorage.uploadFile(file, 'deals-modal');
      return result ? result.url : null;
    } catch (e) {
      console.error('Deals modal blob upload error:', e);
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

async function deleteManagedFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  const p = filePath.trim();
  if (
    p.includes('blob.vercel-storage.com') ||
    p.includes('public.blob.vercel-storage.com')
  ) {
    try {
      await blobStorage.deleteFile(p);
    } catch (e) {
      console.error('Deals modal delete blob:', e);
    }
    return;
  }
  if (!p.startsWith('/')) return;
  try {
    const fullPath = path.join(process.cwd(), p.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.error('Deals modal delete local:', e);
  }
}

function isManagedStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('blob.vercel-storage.com') || url.includes('public.blob.vercel-storage.com')) {
    return true;
  }
  return url.startsWith('/uploads/') || (url.startsWith('/') && url.includes('deals-modal'));
}

function sanitizeText(text) {
  if (text == null) return '';
  return String(text).trim().replace(/[<>]/g, '');
}

/** Matches current storefront defaults (BlackFridayModal) */
const DEFAULT_CONTENT = {
  enabled: true,
  openDelayMs: 10000,
  countdownEndsAt: new Date('2026-01-31T00:00:00.000Z'),
  discountCode: 'LOREM123',
  collapsedBannerText: 'Lorem ipsum',
  badgeText: 'Lorem ipsum',
  headline: 'Lorem ipsum dolor sit amet',
  descriptionPrimary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  descriptionSecondary: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  countdownLabel: 'Lorem countdown',
  emailPlaceholder: 'Lorem ipsum email',
  submitButtonText: 'Lorem ipsum button',
  successSubscribeMessage: 'Lorem ipsum success message.',
  discountViewSuccessBadge: 'Lorem ipsum',
  discountViewHeadline: 'Lorem ipsum heading',
  discountViewDescription: 'Lorem ipsum description for discount view.',
  discountViewLabel: 'Lorem code label',
  discountViewThankYou: 'Lorem ipsum thank you message.',
  privacyDisclaimerText:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Please review our',
  copyCodeButtonText: 'Copy Code',
  copiedButtonText: 'Copied!',
  rightPanelImageAlt: 'Lorem ipsum image',
  bannerImageUrl: '',
};

function mergeWithDefaults(doc) {
  const d = doc || {};
  let countdown = DEFAULT_CONTENT.countdownEndsAt;
  if (d.countdownEndsAt) {
    const parsed = new Date(d.countdownEndsAt);
    if (!Number.isNaN(parsed.getTime())) countdown = parsed;
  }
  const delay = Number(d.openDelayMs);
  const openDelayMs =
    Number.isFinite(delay) && delay >= 0 && delay <= 120000 ? delay : DEFAULT_CONTENT.openDelayMs;

  return {
    enabled: d.enabled !== false,
    openDelayMs,
    countdownEndsAt: countdown.toISOString(),
    discountCode: sanitizeText(d.discountCode) || DEFAULT_CONTENT.discountCode,
    collapsedBannerText: sanitizeText(d.collapsedBannerText) || DEFAULT_CONTENT.collapsedBannerText,
    badgeText: sanitizeText(d.badgeText) || DEFAULT_CONTENT.badgeText,
    headline: sanitizeText(d.headline) || DEFAULT_CONTENT.headline,
    descriptionPrimary:
      sanitizeText(d.descriptionPrimary) || DEFAULT_CONTENT.descriptionPrimary,
    descriptionSecondary:
      sanitizeText(d.descriptionSecondary) || DEFAULT_CONTENT.descriptionSecondary,
    countdownLabel: sanitizeText(d.countdownLabel) || DEFAULT_CONTENT.countdownLabel,
    emailPlaceholder: sanitizeText(d.emailPlaceholder) || DEFAULT_CONTENT.emailPlaceholder,
    submitButtonText: sanitizeText(d.submitButtonText) || DEFAULT_CONTENT.submitButtonText,
    successSubscribeMessage:
      sanitizeText(d.successSubscribeMessage) || DEFAULT_CONTENT.successSubscribeMessage,
    discountViewSuccessBadge:
      sanitizeText(d.discountViewSuccessBadge) || DEFAULT_CONTENT.discountViewSuccessBadge,
    discountViewHeadline:
      sanitizeText(d.discountViewHeadline) || DEFAULT_CONTENT.discountViewHeadline,
    discountViewDescription:
      sanitizeText(d.discountViewDescription) || DEFAULT_CONTENT.discountViewDescription,
    discountViewLabel: sanitizeText(d.discountViewLabel) || DEFAULT_CONTENT.discountViewLabel,
    discountViewThankYou:
      sanitizeText(d.discountViewThankYou) || DEFAULT_CONTENT.discountViewThankYou,
    privacyDisclaimerText:
      sanitizeText(d.privacyDisclaimerText) || DEFAULT_CONTENT.privacyDisclaimerText,
    copyCodeButtonText: sanitizeText(d.copyCodeButtonText) || DEFAULT_CONTENT.copyCodeButtonText,
    copiedButtonText: sanitizeText(d.copiedButtonText) || DEFAULT_CONTENT.copiedButtonText,
    rightPanelImageAlt:
      sanitizeText(d.rightPanelImageAlt) || DEFAULT_CONTENT.rightPanelImageAlt,
    bannerImageUrl: sanitizeText(d.bannerImageUrl) || '',
    updatedAt: d.updatedAt || null,
  };
}

const getDealsModalPublic = async (req, res) => {
  try {
    const doc = await DealsModalSettings.findOne().lean();
    if (doc && doc.enabled === false) {
      return res.status(200).json({ success: true, data: { enabled: false } });
    }
    const merged = mergeWithDefaults(doc);
    if (!merged.enabled) {
      return res.status(200).json({ success: true, data: { enabled: false } });
    }
    return res.status(200).json({
      success: true,
      data: merged,
    });
  } catch (error) {
    console.error('getDealsModalPublic:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load deals modal settings',
    });
  }
};

const getDealsModalAdmin = async (req, res) => {
  try {
    const doc = await DealsModalSettings.findOne().lean();
    return res.status(200).json({
      success: true,
      data: mergeWithDefaults(doc),
    });
  } catch (error) {
    console.error('getDealsModalAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load deals modal settings',
    });
  }
};

const saveDealsModal = async (req, res) => {
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

    const oldDoc = await DealsModalSettings.findOne();
    const prevBanner = oldDoc?.bannerImageUrl ? String(oldDoc.bannerImageUrl).trim() : '';

    let bannerImageUrl = sanitizeText(payload.bannerImageUrl);

    if (req.file) {
      const uploadedUrl = useBlobStorage ? await uploadBannerFile(req.file) : getFileUrlFromDisk(req.file);
      if (uploadedUrl) {
        if (prevBanner && prevBanner !== uploadedUrl && isManagedStorageUrl(prevBanner)) {
          await deleteManagedFile(prevBanner);
        }
        bannerImageUrl = uploadedUrl;
      }
    } else if (payload.clearBannerImage === true || payload.clearBannerImage === 'true') {
      if (prevBanner && isManagedStorageUrl(prevBanner)) {
        await deleteManagedFile(prevBanner);
      }
      bannerImageUrl = '';
    }

    let countdownDate = DEFAULT_CONTENT.countdownEndsAt;
    const prevCountdown = oldDoc?.countdownEndsAt;
    if (prevCountdown) {
      const prev = new Date(prevCountdown);
      if (!Number.isNaN(prev.getTime())) countdownDate = prev;
    }
    if (payload.countdownEndsAt) {
      const parsed = new Date(payload.countdownEndsAt);
      if (!Number.isNaN(parsed.getTime())) countdownDate = parsed;
    }

    const payloadHas = (key) =>
      payload != null && Object.prototype.hasOwnProperty.call(payload, key);

    let copyCodeButtonText =
      sanitizeText(oldDoc?.copyCodeButtonText) || DEFAULT_CONTENT.copyCodeButtonText;
    if (payloadHas('copyCodeButtonText')) {
      copyCodeButtonText =
        sanitizeText(payload.copyCodeButtonText) || DEFAULT_CONTENT.copyCodeButtonText;
    }

    let copiedButtonText =
      sanitizeText(oldDoc?.copiedButtonText) || DEFAULT_CONTENT.copiedButtonText;
    if (payloadHas('copiedButtonText')) {
      copiedButtonText =
        sanitizeText(payload.copiedButtonText) || DEFAULT_CONTENT.copiedButtonText;
    }

    const delay = Number(payload.openDelayMs);
    const openDelayMs =
      Number.isFinite(delay) && delay >= 0 && delay <= 120000
        ? delay
        : DEFAULT_CONTENT.openDelayMs;

    const setDoc = {
      enabled: payload.enabled !== false,
      openDelayMs,
      countdownEndsAt: countdownDate,
      discountCode: sanitizeText(payload.discountCode) || DEFAULT_CONTENT.discountCode,
      collapsedBannerText:
        sanitizeText(payload.collapsedBannerText) || DEFAULT_CONTENT.collapsedBannerText,
      badgeText: sanitizeText(payload.badgeText) || DEFAULT_CONTENT.badgeText,
      headline: sanitizeText(payload.headline) || DEFAULT_CONTENT.headline,
      descriptionPrimary:
        sanitizeText(payload.descriptionPrimary) || DEFAULT_CONTENT.descriptionPrimary,
      descriptionSecondary:
        sanitizeText(payload.descriptionSecondary) || DEFAULT_CONTENT.descriptionSecondary,
      countdownLabel: sanitizeText(payload.countdownLabel) || DEFAULT_CONTENT.countdownLabel,
      emailPlaceholder:
        sanitizeText(payload.emailPlaceholder) || DEFAULT_CONTENT.emailPlaceholder,
      submitButtonText:
        sanitizeText(payload.submitButtonText) || DEFAULT_CONTENT.submitButtonText,
      successSubscribeMessage:
        sanitizeText(payload.successSubscribeMessage) ||
        DEFAULT_CONTENT.successSubscribeMessage,
      discountViewSuccessBadge:
        sanitizeText(payload.discountViewSuccessBadge) ||
        DEFAULT_CONTENT.discountViewSuccessBadge,
      discountViewHeadline:
        sanitizeText(payload.discountViewHeadline) || DEFAULT_CONTENT.discountViewHeadline,
      discountViewDescription:
        sanitizeText(payload.discountViewDescription) ||
        DEFAULT_CONTENT.discountViewDescription,
      discountViewLabel:
        sanitizeText(payload.discountViewLabel) || DEFAULT_CONTENT.discountViewLabel,
      discountViewThankYou:
        sanitizeText(payload.discountViewThankYou) || DEFAULT_CONTENT.discountViewThankYou,
      privacyDisclaimerText:
        sanitizeText(payload.privacyDisclaimerText) || DEFAULT_CONTENT.privacyDisclaimerText,
      copyCodeButtonText,
      copiedButtonText,
      rightPanelImageAlt:
        sanitizeText(payload.rightPanelImageAlt) || DEFAULT_CONTENT.rightPanelImageAlt,
      bannerImageUrl,
    };

    const doc = await DealsModalSettings.findOneAndUpdate({}, { $set: setDoc }, { upsert: true, new: true });

    return res.status(200).json({
      success: true,
      message: 'Deals modal saved',
      data: mergeWithDefaults(doc.toObject()),
    });
  } catch (error) {
    console.error('saveDealsModal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save deals modal',
      error: error.message,
    });
  }
};

module.exports = {
  getDealsModalPublic,
  getDealsModalAdmin,
  saveDealsModal,
  handleDealsModalUpload,
};
