const SmtpSettings = require('../models/smtpSettings');

/**
 * Inbox for contact-style notifications.
 * Priority: CONTACT_FORM_TO_EMAIL → Admin SMTP From email → EMAIL_FROM_EMAIL
 */
async function resolveContactInboxTo() {
  const envTo = (process.env.CONTACT_FORM_TO_EMAIL || '').trim();
  if (envTo) return envTo;

  const settings = await SmtpSettings.getSettings();
  const fromSaved = (settings.fromEmail || '').trim();
  if (fromSaved) return fromSaved;

  const fromEnv = (process.env.EMAIL_FROM_EMAIL || '').trim();
  if (fromEnv) return fromEnv;

  return '';
}

module.exports = { resolveContactInboxTo };
