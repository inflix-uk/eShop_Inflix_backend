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
          orderNotifyEmail: settings.orderNotifyEmail || '',
          orderConfirmationCc: settings.orderConfirmationCc || '',
          orderConfirmationBcc: settings.orderConfirmationBcc || '',
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
      const {
        host,
        port,
        secure,
        username,
        password,
        fromEmail,
        fromName,
        orderNotifyEmail,
        orderConfirmationCc,
        orderConfirmationBcc,
        removePassword,
      } = req.body;

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
      if (orderNotifyEmail !== undefined) {
        updateData.orderNotifyEmail = String(orderNotifyEmail || '').trim();
      }
      if (orderConfirmationCc !== undefined) {
        updateData.orderConfirmationCc = String(orderConfirmationCc || '').trim();
      }
      if (orderConfirmationBcc !== undefined) {
        updateData.orderConfirmationBcc = String(orderConfirmationBcc || '').trim();
      }

      if (removePassword === true) {
        updateData.password = '';
      } else if (password && !String(password).startsWith('••••')) {
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
          orderNotifyEmail: settings.orderNotifyEmail || '',
          orderConfirmationCc: settings.orderConfirmationCc || '',
          orderConfirmationBcc: settings.orderConfirmationBcc || '',
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
        host: String(body.host ?? existing?.host ?? '').trim(),
        port: body.port !== undefined && body.port !== '' ? body.port : existing?.port,
        secure: body.secure !== undefined ? body.secure : existing?.secure,
        username: String(body.username ?? existing?.username ?? '').trim(),
        password: typeof password === 'string' ? password : String(password || ''),
        fromEmail: String(body.fromEmail ?? existing?.fromEmail ?? '').trim(),
        fromName: String(body.fromName ?? existing?.fromName ?? '').trim(),
      };

      const effective = await resolveEffectiveConfig(overrides);
      const missing = [];
      if (!effective.host) missing.push('host');
      if (!effective.user) missing.push('username');
      if (!effective.pass) missing.push('password');
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing SMTP ${missing.join(', ')}. Type the password in the admin form (it is never shown after save) or save settings with a password first.`,
        });
      }

      await verifyTransporter(overrides);

      res.json({
        success: true,
        message: 'SMTP connection successful',
      });
    } catch (error) {
      console.error('Error testing SMTP connection:', error);
      const rawMessage = String(error?.message || 'SMTP connection failed');
      const isInvalidAuth =
        rawMessage.includes('535') ||
        /invalid login|authentication|auth failed/i.test(rawMessage);
      const actionableMessage = isInvalidAuth
        ? 'SMTP authentication failed (535). Use the mailbox password or an app password (Gmail/Google Workspace). Username is usually the full email. Port 465 = implicit SSL (Use SSL on). Port 587 = STARTTLS (Use SSL off in admin). Ensure SMTP is enabled for the account.'
        : rawMessage;
      res.status(400).json({
        success: false,
        message: 'SMTP connection failed',
        error: actionableMessage,
      });
    }
  },
};

module.exports = smtpSettingsController;
