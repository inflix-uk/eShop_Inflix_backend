const RobotsSettings = require('../models/robotsSettings');

const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /search
Disallow: /checkout
Disallow: /admin/
Disallow: /login
Disallow: /cgi-bin
Disallow: /revieworder
Disallow: /register
Disallow: /account
Disallow: /reset-password/
Disallow: /log-out
Disallow: /Support/Your-payments
Disallow: /customer/
`;

const getAdminIdentifier = (req) =>
  req.headers['x-user-id'] ||
  req.headers['x-admin-id'] ||
  req.headers['authorization']?.substring(0, 20) ||
  req.ip ||
  'unknown';

const getRobotsSettingsAdmin = async (_req, res) => {
  try {
    const data = await RobotsSettings.findOne();
    if (!data) {
      return res.status(200).json({
        success: true,
        data: { content: DEFAULT_ROBOTS_TXT, updatedAt: null },
      });
    }
    return res.status(200).json({
      success: true,
      data: { content: data.content || '', updatedAt: data.updatedAt || null },
    });
  } catch (error) {
    console.error('Error fetching robots settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch robots settings',
      error: error.message,
    });
  }
};

const getRobotsSettingsPublic = async (_req, res) => {
  try {
    const data = await RobotsSettings.findOne();
    const content = data?.content || DEFAULT_ROBOTS_TXT;
    return res.status(200).json({
      success: true,
      data: { content },
    });
  } catch (error) {
    console.error('Error fetching public robots settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch robots settings',
      error: error.message,
    });
  }
};

const saveRobotsSettings = async (req, res) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    const data = await RobotsSettings.findOneAndUpdate(
      {},
      { content },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const adminId = getAdminIdentifier(req);
    console.log(
      `[ADMIN ACTION] Admin ${adminId} saved robots settings at ${new Date().toISOString()}`
    );

    return res.status(200).json({
      success: true,
      message: 'Robots settings saved successfully',
      data: { content: data.content || '', updatedAt: data.updatedAt || null },
    });
  } catch (error) {
    console.error('Error saving robots settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save robots settings',
      error: error.message,
    });
  }
};

module.exports = {
  DEFAULT_ROBOTS_TXT,
  getRobotsSettingsAdmin,
  getRobotsSettingsPublic,
  saveRobotsSettings,
};
