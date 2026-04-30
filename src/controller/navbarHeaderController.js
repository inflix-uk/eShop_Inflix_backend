const NavbarHeaderSettings = require('../models/navbarHeaderSettings');

const DEFAULT_PHONE = '';
const DEFAULT_EMAIL = '';

function sanitizePhone(s) {
  if (s == null) return '';
  return String(s).trim().slice(0, 40).replace(/[^\d\s+().-]/g, '');
}

function sanitizeEmail(s) {
  if (s == null) return '';
  const t = String(s).trim().slice(0, 120);
  if (!t) return '';
  if (/[\s<>"]/.test(t)) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return '';
  return t.toLowerCase();
}

function mergeDoc(doc) {
  const d = doc || {};
  const supportPhone = sanitizePhone(d.supportPhone) || DEFAULT_PHONE;
  const supportEmail = sanitizeEmail(d.supportEmail) || DEFAULT_EMAIL;
  return {
    supportPhone,
    supportEmail,
    updatedAt: d.updatedAt || null,
  };
}

const getNavbarHeaderPublic = async (req, res) => {
  try {
    const doc = await NavbarHeaderSettings.findOne().lean();
    return res.status(200).json({
      success: true,
      data: mergeDoc(doc),
    });
  } catch (error) {
    console.error('getNavbarHeaderPublic:', error);
    return res.status(200).json({
      success: true,
      data: mergeDoc(null),
    });
  }
};

const getNavbarHeaderAdmin = async (req, res) => {
  try {
    const doc = await NavbarHeaderSettings.findOne().lean();
    return res.status(200).json({
      success: true,
      data: mergeDoc(doc),
    });
  } catch (error) {
    console.error('getNavbarHeaderAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load navbar header settings',
    });
  }
};

const saveNavbarHeader = async (req, res) => {
  try {
    const body = req.body || {};
    const $set = {};
    if (Object.prototype.hasOwnProperty.call(body, 'supportPhone')) {
      $set.supportPhone = sanitizePhone(body.supportPhone) || DEFAULT_PHONE;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'supportEmail')) {
      $set.supportEmail = sanitizeEmail(body.supportEmail) || DEFAULT_EMAIL;
    }
    if (Object.keys($set).length === 0) {
      const existing = await NavbarHeaderSettings.findOne().lean();
      return res.status(200).json({
        success: true,
        message: 'No changes',
        data: mergeDoc(existing),
      });
    }
    const doc = await NavbarHeaderSettings.findOneAndUpdate(
      {},
      { $set },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      success: true,
      message: 'Header contact saved',
      data: mergeDoc(doc.toObject()),
    });
  } catch (error) {
    console.error('saveNavbarHeader:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save header contact',
    });
  }
};

module.exports = {
  getNavbarHeaderPublic,
  getNavbarHeaderAdmin,
  saveNavbarHeader,
};
