const mongoose = require('mongoose');
const SiteWideSchema = require('../models/siteWideSchema');

const MAX_SCHEMAS = 30;
const MAX_LABEL_LEN = 120;

const getAdminIdentifier = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-admin-id'] ||
  req.headers['authorization']?.substring(0, 20) ||
  req.ip ||
  'unknown';

function sanitizeSchemas(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_SCHEMAS).map((item) => {
    const entry = {
      label: String(item.label ?? '').trim().slice(0, MAX_LABEL_LEN),
      schema: String(item.schema ?? ''),
    };
    const id = item._id != null ? String(item._id) : '';
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      entry._id = id;
    }
    return entry;
  });
}

function toAdminResponse(doc) {
  return {
    schemas: (doc.schemas || []).map((s) => ({
      _id: s._id ? String(s._id) : undefined,
      label: s.label || '',
      schema: s.schema || '',
    })),
    updatedAt: doc.updatedAt || null,
  };
}

function toPublicResponse(doc) {
  return {
    schemas: (doc.schemas || [])
      .filter((s) => s.schema && s.schema.trim().length > 0)
      .map((s) => s.schema.trim()),
  };
}

/**
 * GET /site-wide-schema (admin)
 */
const getSiteWideSchema = async (req, res) => {
  try {
    const data = await SiteWideSchema.findOne();

    if (!data) {
      return res.status(200).json({
        success: true,
        data: { schemas: [], updatedAt: null },
        message: 'No site-wide schema saved yet, returning defaults',
      });
    }

    res.status(200).json({
      success: true,
      data: toAdminResponse(data),
    });
  } catch (error) {
    console.error('Error fetching site-wide schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site-wide schema',
      error: error.message,
    });
  }
};

/**
 * GET /site-wide-schema/public (storefront — every page)
 */
const getSiteWideSchemaPublic = async (req, res) => {
  try {
    const data = await SiteWideSchema.findOne();

    if (!data) {
      return res.status(200).json({
        success: true,
        data: { schemas: [] },
      });
    }

    res.status(200).json({
      success: true,
      data: toPublicResponse(data),
    });
  } catch (error) {
    console.error('Error fetching public site-wide schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site-wide schema',
      error: error.message,
    });
  }
};

/**
 * POST /site-wide-schema (admin upsert)
 */
const saveSiteWideSchema = async (req, res) => {
  try {
    const { schemas: rawSchemas } = req.body;
    const schemas = sanitizeSchemas(rawSchemas);

    const data = await SiteWideSchema.findOneAndUpdate(
      {},
      { schemas },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(
      `[ADMIN ACTION] Admin ${adminId} saved site-wide schema (${schemas.length} entries) at ${new Date().toISOString()}`
    );

    res.status(200).json({
      success: true,
      message: 'Site-wide schema saved successfully',
      data: toAdminResponse(data),
    });
  } catch (error) {
    console.error('Error saving site-wide schema:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save site-wide schema',
      error: error.message,
    });
  }
};

module.exports = {
  getSiteWideSchema,
  getSiteWideSchemaPublic,
  saveSiteWideSchema,
};
