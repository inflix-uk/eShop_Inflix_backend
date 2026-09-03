const mongoose = require('mongoose');
const SiteScriptsSettings = require('../models/siteScriptsSettings');

const getAdminIdentifier = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-admin-id'] ||
  req.headers['authorization']?.substring(0, 20) ||
  req.ip ||
  'unknown';

const MAX_CUSTOM_SCRIPTS = 50;
const MAX_LABEL_LEN = 120;

function sanitizeCustomScripts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CUSTOM_SCRIPTS).map((item) => {
    const entry = {
      label: String(item.label ?? '')
        .trim()
        .slice(0, MAX_LABEL_LEN),
      placement: ['head', 'bodyStart', 'bodyEnd'].includes(item.placement)
        ? item.placement
        : 'head',
      content: String(item.content ?? ''),
    };
    const id = item._id != null ? String(item._id) : '';
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      entry._id = id;
    }
    return entry;
  });
}

/** Legacy flat fields → list when customScripts is still empty */
function legacyToCustomScripts(doc) {
  const out = [];
  if (doc.customHeadScript?.trim()) {
    out.push({
      label: 'Custom (legacy — head)',
      placement: 'head',
      content: doc.customHeadScript,
    });
  }
  if (doc.customBodyStartScript?.trim()) {
    out.push({
      label: 'Custom (legacy — body start)',
      placement: 'bodyStart',
      content: doc.customBodyStartScript,
    });
  }
  if (doc.customBodyEndScript?.trim()) {
    out.push({
      label: 'Custom (legacy — body end)',
      placement: 'bodyEnd',
      content: doc.customBodyEndScript,
    });
  }
  return out;
}

function adminCustomScriptsFromDoc(doc) {
  const stored = Array.isArray(doc.customScripts) ? doc.customScripts : [];
  if (stored.length > 0) {
    return stored.map((s) => ({
      _id: s._id ? String(s._id) : undefined,
      label: s.label || '',
      placement: s.placement,
      content: s.content || '',
    }));
  }
  return legacyToCustomScripts(doc);
}

function publicCustomScriptsFromDoc(doc) {
  const adminList = adminCustomScriptsFromDoc(doc);
  return adminList.map(({ placement, content }) => ({
    placement,
    content: content || '',
  }));
}

/** Normalize GTM-XXXX / AW-XXXX IDs; strip accidental script tags and whitespace. */
function sanitizeTrackingId(raw, prefix) {
  let value = String(raw ?? '').trim();
  if (!value) return '';
  // If admin pasted a full snippet, try to extract the ID
  const gtmMatch = value.match(/\b(GTM-[A-Z0-9]+)\b/i);
  const adsMatch = value.match(/\b(AW-\d+)\b/i);
  if (prefix === 'GTM' && gtmMatch) value = gtmMatch[1];
  if (prefix === 'AW' && adsMatch) value = adsMatch[1];
  value = value.replace(/<[^>]*>/g, '').trim();
  if (prefix === 'GTM') {
    const normalized = value.toUpperCase();
    if (/^GTM-[A-Z0-9]+$/.test(normalized)) return normalized;
    // Allow bare suffix → prepend GTM-
    if (/^[A-Z0-9]+$/.test(normalized) && !normalized.startsWith('GTM')) {
      return `GTM-${normalized}`;
    }
    return normalized.startsWith('GTM-') ? normalized : '';
  }
  if (prefix === 'AW') {
    const upper = value.toUpperCase();
    if (/^AW-\d+$/.test(upper)) return upper;
    if (/^\d+$/.test(value)) return `AW-${value}`;
    return upper.startsWith('AW-') ? upper : '';
  }
  return value;
}

const emptyPayloadAdmin = () => ({
  semrushScript: '',
  ahrefsScript: '',
  googleSearchConsoleScript: '',
  gtmContainerId: '',
  googleAdsConversionId: '',
  customScripts: [],
  updatedAt: null,
});

const emptyPayloadPublic = () => ({
  semrushScript: '',
  ahrefsScript: '',
  googleSearchConsoleScript: '',
  gtmContainerId: '',
  googleAdsConversionId: '',
  customScripts: [],
});

const toResponse = (doc) => ({
  semrushScript: doc.semrushScript || '',
  ahrefsScript: doc.ahrefsScript || '',
  googleSearchConsoleScript: doc.googleSearchConsoleScript || '',
  gtmContainerId: doc.gtmContainerId || '',
  googleAdsConversionId: doc.googleAdsConversionId || '',
  customScripts: adminCustomScriptsFromDoc(doc),
  updatedAt: doc.updatedAt || null,
});

/**
 * GET /site-scripts (admin)
 */
const getSiteScriptsSettings = async (req, res) => {
  try {
    const data = await SiteScriptsSettings.findOne();

    if (!data) {
      return res.status(200).json({
        success: true,
        data: { ...emptyPayloadAdmin() },
        message: 'No site scripts saved yet, returning defaults',
      });
    }

    res.status(200).json({
      success: true,
      data: toResponse(data),
    });
  } catch (error) {
    console.error('Error fetching site scripts settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site scripts settings',
      error: error.message,
    });
  }
};

/**
 * GET /site-scripts/public (storefront)
 */
const getSiteScriptsSettingsPublic = async (req, res) => {
  try {
    const data = await SiteScriptsSettings.findOne();

    if (!data) {
      return res.status(200).json({
        success: true,
        data: emptyPayloadPublic(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        semrushScript: data.semrushScript || '',
        ahrefsScript: data.ahrefsScript || '',
        googleSearchConsoleScript: data.googleSearchConsoleScript || '',
        gtmContainerId: data.gtmContainerId || '',
        googleAdsConversionId: data.googleAdsConversionId || '',
        customScripts: publicCustomScriptsFromDoc(data),
      },
    });
  } catch (error) {
    console.error('Error fetching public site scripts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch site scripts',
      error: error.message,
    });
  }
};

/**
 * POST /site-scripts (admin upsert)
 */
const saveSiteScriptsSettings = async (req, res) => {
  try {
    const {
      semrushScript,
      ahrefsScript,
      googleSearchConsoleScript,
      gtmContainerId,
      googleAdsConversionId,
      customScripts: rawCustomScripts,
    } = req.body;

    const customScripts = sanitizeCustomScripts(rawCustomScripts);
    const normalizedGtm = sanitizeTrackingId(gtmContainerId, 'GTM');
    const normalizedAds = sanitizeTrackingId(googleAdsConversionId, 'AW');

    const data = await SiteScriptsSettings.findOneAndUpdate(
      {},
      {
        semrushScript: semrushScript ?? '',
        ahrefsScript: ahrefsScript ?? '',
        googleSearchConsoleScript: googleSearchConsoleScript ?? '',
        gtmContainerId: normalizedGtm,
        googleAdsConversionId: normalizedAds,
        customScripts,
        customHeadScript: '',
        customBodyStartScript: '',
        customBodyEndScript: '',
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    const adminId = getAdminIdentifier(req);
    console.log(
      `[ADMIN ACTION] Admin ${adminId} saved site scripts at ${new Date().toISOString()}`
    );

    res.status(200).json({
      success: true,
      message: 'Site scripts saved successfully',
      data: toResponse(data),
    });
  } catch (error) {
    console.error('Error saving site scripts settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save site scripts settings',
      error: error.message,
    });
  }
};

module.exports = {
  getSiteScriptsSettings,
  getSiteScriptsSettingsPublic,
  saveSiteScriptsSettings,
};
