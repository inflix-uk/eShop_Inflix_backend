const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BookingPackage = require('../models/bookingPackage');
const { BOOKING_PACKAGE_TYPES, BOOKING_PRICING_MODES } = require('../models/bookingPackage');
const blobStorage = require('../utils/blobStorage');
const { toSeoSlug } = require('../utils/slugUtils');

const useBlobStorage = blobStorage.isConfigured();

const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const destinationFolder = './uploads/booking';
    fs.mkdirSync(destinationFolder, { recursive: true });
    cb(null, destinationFolder);
  },
  filename(_req, file, cb) {
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase();
    const timestamp = Date.now();
    const extension = path.extname(sanitizedName);
    const baseName = path.basename(sanitizedName, extension);
    cb(null, `${baseName}_${timestamp}${extension}`);
  },
});

const imageFileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype && file.mimetype.startsWith('image/');
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, gif)'));
  }
};

const upload = multer({
  storage: useBlobStorage ? memoryStorage : diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
}).single('image');

async function uploadPackageImageToStorage(file) {
  if (!file) return null;

  if (useBlobStorage) {
    const result = await blobStorage.uploadFile(file, 'booking');
    return result ? result.url : null;
  }

  const relativePath = path.relative('./uploads', file.path).replace(/\\/g, '/');
  return `/${relativePath}`;
}

const handlePackageImageUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size too large. Maximum size is 5MB',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message,
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File validation error',
      });
    }
    return next();
  });
};

function isValidPackageType(type) {
  return BOOKING_PACKAGE_TYPES.includes(type);
}

function normalizePricingMode(value) {
  const mode = String(value ?? '').trim();
  return BOOKING_PRICING_MODES.includes(mode) ? mode : 'hourly';
}

/** 0 means no limit. */
function normalizeMaxHours(value) {
  const hours = Math.floor(Number(value) || 0);
  return hours > 0 ? hours : 0;
}

/** 0 means the turnaround line is hidden on the storefront. */
function normalizeTurnaroundDays(value) {
  const days = Math.floor(Number(value) || 0);
  return days > 0 ? days : 0;
}

function normalizeFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function normalizeMoney(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 0;
  return Math.max(0, Math.round(Number(value) * 100) / 100);
}

function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras
    .map((item) => {
      const price = normalizeMoney(item?.price);
      const discountPrice = normalizeMoney(item?.discountPrice);
      // A discount only holds when it actually undercuts a known list price.
      const discountEnabled =
        Boolean(item?.discountEnabled) && price > 0 && discountPrice < price;

      return {
        image: item?.image ? String(item.image).trim() : '',
        title: item?.title ? String(item.title).trim() : '',
        price,
        description: item?.description ? String(item.description).trim() : '',
        quantityEnabled: Boolean(item?.quantityEnabled),
        discountEnabled,
        discountPrice: discountEnabled ? discountPrice : 0,
        unitLabel: item?.unitLabel ? String(item.unitLabel).trim() : '',
        priceTbc: false,
      };
    })
    .filter((item) => item.title.length > 0);
}

const DEFAULT_WHAT_HAPPENS_NEXT = {
  heading: 'What happens next',
  listStyle: 'numbered',
  items: [
    'Confirmation and calendar invite by email straight away.',
    'Free parking at the back of the studio — no app, no permit.',
    'Arrive 5 minutes early. The room is already rigged and tested.',
    'Leave with your raw files. Free reschedule up to 72 hrs before.',
  ],
};

function normalizeWhatHappensNext(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const heading =
    String(src.heading ?? DEFAULT_WHAT_HAPPENS_NEXT.heading).trim() ||
    DEFAULT_WHAT_HAPPENS_NEXT.heading;
  const listStyle = src.listStyle === 'bullets' ? 'bullets' : 'numbered';
  const items = Array.isArray(src.items)
    ? src.items
        .map((item) => String(item || '').trim())
        .filter((item) => item.length > 0)
        .slice(0, 20)
    : [];
  return {
    heading,
    listStyle,
    items: items.length > 0 ? items : [...DEFAULT_WHAT_HAPPENS_NEXT.items],
  };
}

function normalizeHighlightBadgeText(value) {
  const text = String(value ?? '').trim();
  return text || 'Most Popular';
}

function normalizeHighlightBadgeUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    /* ignore */
  }
  return '';
}

async function clearOtherHighlightBadges(exceptId) {
  const filter = { isdeleted: false, highlightBadgeEnabled: true };
  if (exceptId) {
    filter._id = { $ne: exceptId };
  }
  await BookingPackage.updateMany(filter, { $set: { highlightBadgeEnabled: false } });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isObjectIdString(value) {
  return (
    mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === String(value)
  );
}

function normalizePackageSlug(value, fallbackName) {
  const fromValue = toSeoSlug(value);
  if (fromValue) return fromValue;
  return toSeoSlug(fallbackName) || null;
}

async function ensureUniquePackageSlug(baseSlug, excludeId) {
  const base = toSeoSlug(baseSlug);
  if (!base) return null;

  let candidate = base;
  let n = 2;
  while (true) {
    const filter = {
      isdeleted: false,
      slug: candidate,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const existing = await BookingPackage.findOne(filter).select('_id').lean();
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) return `${base}-${Date.now()}`;
  }
}

/** Resolve public package by Mongo id or SEO slug (also matches slugified name). */
async function findPublicPackageByParam(param) {
  const key = String(param || '').trim();
  if (!key) return null;

  const baseQuery = { isdeleted: false, isActive: true };

  if (isObjectIdString(key)) {
    const byId = await BookingPackage.findOne({ ...baseQuery, _id: key }).lean();
    if (byId) return byId;
  }

  const bySlug = await BookingPackage.findOne({
    ...baseQuery,
    slug: new RegExp(`^${escapeRegex(key)}$`, 'i'),
  }).lean();
  if (bySlug) return bySlug;

  const packages = await BookingPackage.find(baseQuery).lean();
  const needle = toSeoSlug(key);
  return (
    packages.find((pkg) => {
      const stored = pkg.slug ? toSeoSlug(pkg.slug) : '';
      const fromName = toSeoSlug(pkg.name);
      return stored === needle || fromName === needle;
    }) || null
  );
}

const bookingPackageController = {
  getPublicPackages: async (req, res) => {
    try {
      const { type } = req.query;
      const filter = {
        isdeleted: false,
        isActive: true,
      };

      if (type) {
        if (!isValidPackageType(type)) {
          return res.status(400).json({ error: 'Invalid package type', status: 400 });
        }
        filter.type = type;
      }

      const packages = await BookingPackage.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

      return res.json({
        message: 'Booking packages fetched successfully',
        status: 200,
        packages: packages.map((pkg) => ({
          ...pkg,
          slug: pkg.slug || toSeoSlug(pkg.name) || null,
        })),
      });
    } catch (error) {
      console.error('Error fetching public booking packages:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAdminPackages: async (req, res) => {
    try {
      const { type, includeDeleted } = req.query;
      const filter = {};

      if (type) {
        if (!isValidPackageType(type)) {
          return res.status(400).json({ error: 'Invalid package type', status: 400 });
        }
        filter.type = type;
      }

      if (includeDeleted !== 'true') {
        filter.isdeleted = false;
      }

      const packages = await BookingPackage.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

      return res.json({
        message: 'Booking packages fetched successfully',
        status: 200,
        packages,
      });
    } catch (error) {
      console.error('Error fetching admin booking packages:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  getPackageById: async (req, res) => {
    try {
      const { id } = req.params;
      const pkg = await findPublicPackageByParam(id);

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      // Backfill missing slug from name so future URLs stay stable
      if (!pkg.slug && pkg.name) {
        const nextSlug = await ensureUniquePackageSlug(pkg.name, pkg._id);
        if (nextSlug) {
          await BookingPackage.updateOne({ _id: pkg._id }, { $set: { slug: nextSlug } });
          pkg.slug = nextSlug;
        }
      }

      return res.json({
        message: 'Booking package fetched successfully',
        status: 200,
        package: pkg,
      });
    } catch (error) {
      console.error('Error fetching booking package:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  createPackage: async (req, res) => {
    try {
      const {
        name,
        slug,
        type,
        durationMinutes,
        durationDisplayUnit,
        price,
        pricingMode,
        maxHours,
        turnaroundDays,
        includedMics,
        subtitle,
        maxGuests,
        description,
        detailPage,
        detailPageHtml,
        detailPageCss,
        features,
        extras,
        whatHappensNext,
        image,
        sortOrder,
        isActive,
        highlightBadgeEnabled,
        highlightBadgeText,
        highlightBadgeUrl,
        bundleBenefits,
      } = req.body;

      if (!name || !type || durationMinutes === undefined || price === undefined) {
        return res.status(400).json({
          error: 'name, type, durationMinutes, and price are required',
          status: 400,
        });
      }

      if (!isValidPackageType(type)) {
        return res.status(400).json({ error: 'Invalid package type', status: 400 });
      }

      const unit =
        durationDisplayUnit === 'hours' || durationDisplayUnit === 'minutes'
          ? durationDisplayUnit
          : 'minutes';

      const packageName = String(name).trim();
      const resolvedSlug = await ensureUniquePackageSlug(
        normalizePackageSlug(slug, packageName),
        null
      );

      const newPackage = new BookingPackage({
        name: packageName,
        slug: resolvedSlug,
        type,
        durationMinutes: Number(durationMinutes),
        durationDisplayUnit: unit,
        price: Number(price),
        pricingMode: normalizePricingMode(pricingMode),
        maxHours: normalizeMaxHours(maxHours),
        turnaroundDays: normalizeTurnaroundDays(turnaroundDays),
        includedMics: Math.max(0, Number(includedMics) || 0),
        subtitle: subtitle != null ? String(subtitle).trim() : '',
        maxGuests: Math.min(9, Math.max(1, Number(maxGuests) || 5)),
        description: description || '',
        detailPage: detailPage || '',
        detailPageHtml: detailPageHtml || '',
        detailPageCss: detailPageCss || '',
        features: normalizeFeatures(features),
        whatHappensNext: normalizeWhatHappensNext(whatHappensNext),
        extras: normalizeExtras(extras),
        image: image || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        highlightBadgeEnabled: Boolean(highlightBadgeEnabled),
        highlightBadgeText: normalizeHighlightBadgeText(highlightBadgeText),
        highlightBadgeUrl: normalizeHighlightBadgeUrl(highlightBadgeUrl),
        bundleBenefits: bundleBenefits || '',
      });

      await newPackage.save();
      if (newPackage.highlightBadgeEnabled) {
        await clearOtherHighlightBadges(newPackage._id);
      }

      return res.json({
        message: 'Booking package created successfully',
        status: 201,
        package: newPackage,
      });
    } catch (error) {
      console.error('Error creating booking package:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Package slug already exists', status: 400 });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  updatePackage: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid package id', status: 400 });
      }

      const existing = await BookingPackage.findOne({ _id: id, isdeleted: false });
      if (!existing) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      const {
        name,
        slug,
        type,
        durationMinutes,
        durationDisplayUnit,
        price,
        pricingMode,
        maxHours,
        turnaroundDays,
        includedMics,
        subtitle,
        maxGuests,
        description,
        detailPage,
        detailPageHtml,
        detailPageCss,
        features,
        extras,
        whatHappensNext,
        image,
        sortOrder,
        isActive,
        highlightBadgeEnabled,
        highlightBadgeText,
        highlightBadgeUrl,
        bundleBenefits,
      } = req.body;

      if (type !== undefined && !isValidPackageType(type)) {
        return res.status(400).json({ error: 'Invalid package type', status: 400 });
      }

      if (name !== undefined) existing.name = String(name).trim();
      if (slug !== undefined) {
        existing.slug = slug
          ? await ensureUniquePackageSlug(normalizePackageSlug(slug, existing.name), existing._id)
          : null;
      } else if (!existing.slug && existing.name) {
        existing.slug = await ensureUniquePackageSlug(existing.name, existing._id);
      }
      if (type !== undefined) existing.type = type;
      if (durationMinutes !== undefined) existing.durationMinutes = Number(durationMinutes);
      if (durationDisplayUnit === 'hours' || durationDisplayUnit === 'minutes') {
        existing.durationDisplayUnit = durationDisplayUnit;
      }
      if (price !== undefined) existing.price = Number(price);
      if (pricingMode !== undefined) existing.pricingMode = normalizePricingMode(pricingMode);
      if (maxHours !== undefined) existing.maxHours = normalizeMaxHours(maxHours);
      if (turnaroundDays !== undefined) {
        existing.turnaroundDays = normalizeTurnaroundDays(turnaroundDays);
      }
      if (includedMics !== undefined) {
        existing.includedMics = Math.max(0, Number(includedMics) || 0);
      }
      if (subtitle !== undefined) {
        existing.subtitle = String(subtitle || '').trim();
      }
      if (maxGuests !== undefined) {
        existing.maxGuests = Math.min(9, Math.max(1, Number(maxGuests) || 5));
      }
      if (description !== undefined) existing.description = description;
      if (detailPage !== undefined) existing.detailPage = detailPage;
      if (detailPageHtml !== undefined) existing.detailPageHtml = detailPageHtml;
      if (detailPageCss !== undefined) existing.detailPageCss = detailPageCss;
      if (features !== undefined) existing.features = normalizeFeatures(features);
      if (whatHappensNext !== undefined) {
        existing.whatHappensNext = normalizeWhatHappensNext(whatHappensNext);
      }
      if (extras !== undefined) {
        existing.set('extras', normalizeExtras(extras));
        existing.markModified('extras');
      }
      if (image !== undefined) existing.image = image;
      if (sortOrder !== undefined) existing.sortOrder = Number(sortOrder);
      if (isActive !== undefined) existing.isActive = Boolean(isActive);
      if (highlightBadgeEnabled !== undefined) {
        existing.highlightBadgeEnabled = Boolean(highlightBadgeEnabled);
      }
      if (highlightBadgeText !== undefined) {
        existing.highlightBadgeText = normalizeHighlightBadgeText(highlightBadgeText);
      }
      if (bundleBenefits !== undefined) {
        existing.bundleBenefits = bundleBenefits || '';
      }
      if (highlightBadgeUrl !== undefined) {
        existing.highlightBadgeUrl = normalizeHighlightBadgeUrl(highlightBadgeUrl);
      }

      await existing.save();
      if (existing.highlightBadgeEnabled) {
        await clearOtherHighlightBadges(existing._id);
      }

      return res.json({
        message: 'Booking package updated successfully',
        status: 200,
        package: existing,
      });
    } catch (error) {
      console.error('Error updating booking package:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Package slug already exists', status: 400 });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  deletePackage: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid package id', status: 400 });
      }

      const updated = await BookingPackage.findOneAndUpdate(
        { _id: id, isdeleted: false },
        { isdeleted: true, isActive: false },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
      }

      return res.json({
        message: 'Booking package deleted successfully',
        status: 200,
      });
    } catch (error) {
      console.error('Error deleting booking package:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  uploadPackageImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
        });
      }

      const imageUrl = await uploadPackageImageToStorage(req.file);

      if (!imageUrl) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to storage',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        imageUrl,
        imagePath: imageUrl,
        data: {
          url: imageUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error('Error uploading booking package image:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
        error: error.message,
      });
    }
  },

  handlePackageImageUpload,

  reorderPackages: async (req, res) => {
    try {
      const { orderedIds } = req.body;

      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({
          error: 'orderedIds must be a non-empty array of package IDs',
          status: 400,
        });
      }

      for (const id of orderedIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({
            error: `Invalid package id: ${id}`,
            status: 400,
          });
        }
      }

      const bulkOps = orderedIds.map((id, index) => ({
        updateOne: {
          filter: { _id: id, isdeleted: false },
          update: { $set: { sortOrder: index } },
        },
      }));

      await BookingPackage.bulkWrite(bulkOps);

      return res.json({
        message: 'Packages reordered successfully',
        status: 200,
      });
    } catch (error) {
      console.error('Error reordering packages:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};

module.exports = bookingPackageController;
