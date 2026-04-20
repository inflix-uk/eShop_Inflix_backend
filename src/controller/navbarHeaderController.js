const NavbarHeaderSettings = require('../models/navbarHeaderSettings');

const DEFAULT_PHONE = '0333 344 8541';

function sanitizePhone(s) {
  if (s == null) return '';
  return String(s).trim().slice(0, 40).replace(/[^\d\s+().-]/g, '');
}

function mergeDoc(doc) {
  const d = doc || {};
  const supportPhone = sanitizePhone(d.supportPhone) || DEFAULT_PHONE;
  return {
    supportPhone,
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
    const supportPhone = sanitizePhone(req.body?.supportPhone) || DEFAULT_PHONE;
    const doc = await NavbarHeaderSettings.findOneAndUpdate(
      {},
      { $set: { supportPhone } },
      { upsert: true, new: true }
    );
    return res.status(200).json({
      success: true,
      message: 'Header phone saved',
      data: mergeDoc(doc.toObject()),
    });
  } catch (error) {
    console.error('saveNavbarHeader:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save header phone',
    });
  }
};

module.exports = {
  getNavbarHeaderPublic,
  getNavbarHeaderAdmin,
  saveNavbarHeader,
};
