const { sendMail } = require('../utils/mailer');
const { resolveContactInboxTo } = require('../services/contactInboxResolve');

const MAX_MESSAGE = 10000;

function escapeHtml(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeReplyName(name) {
  return String(name || 'Website visitor')
    .replace(/[\r\n<>]/g, ' ')
    .replace(/"/g, '')
    .trim()
    .slice(0, 120) || 'Website visitor';
}

/**
 * Public contact form — sends one email using the same SMTP as the rest of the app.
 * Delivered to: CONTACT_FORM_TO_EMAIL, or the From email saved in Admin → SMTP, or hello@zextons.co.uk.
 */
exports.submitContactForm = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 200);
    const email = String(req.body?.email || '').trim().slice(0, 320);
    const subject = String(req.body?.subject || '').trim().slice(0, 300);
    const message = String(req.body?.message || '').trim().slice(0, MAX_MESSAGE);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }

    const to = await resolveContactInboxTo();
    const safeName = sanitizeReplyName(name);
    const mailSubject = `[Contact us] ${subject}`.slice(0, 900);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
  <h2 style="margin-bottom: 8px;">Contact form (website)</h2>
  <p><strong>Name:</strong> ${escapeHtml(name)}</p>
  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
  <p><strong>Message:</strong></p>
  <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 14px; border-radius: 8px; font-size: 14px;">${escapeHtml(message)}</pre>
</body></html>`;

    await sendMail({
      to,
      replyTo: `"${safeName}" <${email}>`,
      subject: mailSubject,
      html,
    });

    console.log(`[public/contact] delivered to inbox: ${to}`);

    return res.status(201).json({
      success: true,
      message: 'Your message has been sent. We will get back to you soon.',
    });
  } catch (err) {
    console.error('Public contact form error:', err);
    const code = err && err.code;
    const isConfig =
      code === 'SMTP_NOT_CONFIGURED' ||
      code === 'SMTP_FROM_MISSING' ||
      (err.message && /SMTP is not/i.test(err.message));
    const message = isConfig
      ? 'Email is not configured on the server. Please try again later.'
      : 'Failed to send your message. Please try again later.';
    return res.status(500).json({ success: false, message });
  }
};
