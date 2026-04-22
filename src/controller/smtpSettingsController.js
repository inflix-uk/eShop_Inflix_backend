const SmtpSettings = require('../models/smtpSettings');
const { verifyTransporter, resolveEffectiveConfig } = require('../utils/mailer');

const maskPassword = (pwd) => {
  if (!pwd || pwd.length < 4) return '';
  return '••••••••' + pwd.slice(-4);
};

const smtpSettingsController = {
  getSettings: async (req, res) => {
    try {
      const settings = await SmtpSettings.getSettings();
      res.json({
        success: true,
        data: {
          host: settings.host || '',
          port: settings.port ?? 465,
          secure: settings.secure !== false,
          username: settings.username || '',
          password: settings.password ? maskPassword(settings.password) : '',
          fromEmail: settings.fromEmail || '',
          fromName: settings.fromName || '',
          hasPassword: !!settings.password,
          updatedAt: settings.updatedAt,
          updatedBy: settings.updatedBy,
        },
      });
    } catch (error) {
      console.error('Error fetching SMTP settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch SMTP settings',
        error: error.message,
      });
    }
  },

  saveSettings: async (req, res) => {
    try {
      const { host, port, secure, username, password, fromEmail, fromName } = req.body;

      let settings = await SmtpSettings.getSettings();
      const updateData = {
        updatedBy: req.user?.id || null,
      };

      if (host !== undefined) updateData.host = String(host || '').trim();
      if (port !== undefined && port !== '') updateData.port = Number(port) || 465;
      if (secure !== undefined) updateData.secure = Boolean(secure);
      if (username !== undefined) updateData.username = String(username || '').trim();
      if (fromEmail !== undefined) updateData.fromEmail = String(fromEmail || '').trim();
      if (fromName !== undefined) updateData.fromName = String(fromName || '').trim();

      if (password && !String(password).startsWith('••••')) {
        updateData.password = String(password).trim();
      }

      settings = await SmtpSettings.findByIdAndUpdate(settings._id, updateData, { new: true });

      res.json({
        success: true,
        message: 'SMTP settings saved successfully',
        data: {
          host: settings.host || '',
          port: settings.port ?? 465,
          secure: settings.secure !== false,
          username: settings.username || '',
          password: settings.password ? maskPassword(settings.password) : '',
          fromEmail: settings.fromEmail || '',
          fromName: settings.fromName || '',
          hasPassword: !!settings.password,
          updatedAt: settings.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save SMTP settings',
        error: error.message,
      });
    }
  },

  testConnection: async (req, res) => {
    try {
      const body = req.body || {};
      const existing = await SmtpSettings.getSettings();

      let password = body.password;
      if (!password || String(password).startsWith('••••')) {
        password = existing?.password || '';
      }

      const overrides = {
        host: body.host || existing?.host,
        port: body.port !== undefined && body.port !== '' ? body.port : existing?.port,
        secure: body.secure !== undefined ? body.secure : existing?.secure,
        username: body.username || existing?.username,
        password,
        fromEmail: body.fromEmail || existing?.fromEmail,
        fromName: body.fromName || existing?.fromName,
      };

      const effective = await resolveEffectiveConfig(overrides);
      if (!effective.host || !effective.user || !effective.pass) {
        return res.status(400).json({
          success: false,
          message: 'Host, username, and password are required to test SMTP',
        });
      }

      await verifyTransporter(overrides);

      res.json({
        success: true,
        message: 'SMTP connection successful',
      });
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      res.status(400).json({
        success: false,
        message: 'SMTP connection failed',
        error: error.message,
      });
    }
  },
};

module.exports = smtpSettingsController;
