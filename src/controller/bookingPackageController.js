const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const BookingPackage = require('../models/bookingPackage');
const { BOOKING_PACKAGE_TYPES } = require('../models/bookingPackage');
const blobStorage = require('../utils/blobStorage');

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

function normalizeFeatures(features) {
  if (!Array.isArray(features)) return [];
  return features
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}

function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras
    .map((item) => ({
      image: item?.image ? String(item.image).trim() : '',
      title: item?.title ? String(item.title).trim() : '',
      price:
        item?.price !== undefined && item?.price !== null && !Number.isNaN(Number(item.price))
          ? Math.max(0, Number(item.price))
          : 0,
      description: item?.description ? String(item.description).trim() : '',
    }))
    .filter((item) => item.title.length > 0);
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
        packages,
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
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid package id', status: 400 });
      }

      const pkg = await BookingPackage.findOne({
        _id: id,
        isdeleted: false,
        isActive: true,
      }).lean();

      if (!pkg) {
        return res.status(404).json({ error: 'Package not found', status: 404 });
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
        price,
        description,
        detailPage,
        features,
        extras,
        image,
        sortOrder,
        isActive,
        highlightBadgeEnabled,
        highlightBadgeText,
        highlightBadgeUrl,
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

      const newPackage = new BookingPackage({
        name: String(name).trim(),
        slug: slug ? String(slug).trim() : null,
        type,
        durationMinutes: Number(durationMinutes),
        price: Number(price),
        description: description || '',
        detailPage: detailPage || '',
        features: normalizeFeatures(features),
        extras: normalizeExtras(extras),
        image: image || null,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        highlightBadgeEnabled: Boolean(highlightBadgeEnabled),
        highlightBadgeText: normalizeHighlightBadgeText(highlightBadgeText),
        highlightBadgeUrl: normalizeHighlightBadgeUrl(highlightBadgeUrl),
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
        price,
        description,
        detailPage,
        features,
        extras,
        image,
        sortOrder,
        isActive,
        highlightBadgeEnabled,
        highlightBadgeText,
        highlightBadgeUrl,
      } = req.body;

      if (type !== undefined && !isValidPackageType(type)) {
        return res.status(400).json({ error: 'Invalid package type', status: 400 });
      }

      if (name !== undefined) existing.name = String(name).trim();
      if (slug !== undefined) existing.slug = slug ? String(slug).trim() : null;
      if (type !== undefined) existing.type = type;
      if (durationMinutes !== undefined) existing.durationMinutes = Number(durationMinutes);
      if (price !== undefined) existing.price = Number(price);
      if (description !== undefined) existing.description = description;
      if (detailPage !== undefined) existing.detailPage = detailPage;
      if (features !== undefined) existing.features = normalizeFeatures(features);
      if (extras !== undefined) existing.extras = normalizeExtras(extras);
      if (image !== undefined) existing.image = image;
      if (sortOrder !== undefined) existing.sortOrder = Number(sortOrder);
      if (isActive !== undefined) existing.isActive = Boolean(isActive);
      if (highlightBadgeEnabled !== undefined) {
        existing.highlightBadgeEnabled = Boolean(highlightBadgeEnabled);
      }
      if (highlightBadgeText !== undefined) {
        existing.highlightBadgeText = normalizeHighlightBadgeText(highlightBadgeText);
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
