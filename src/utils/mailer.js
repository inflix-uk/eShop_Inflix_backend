const nodemailer = require('nodemailer');
const SmtpSettings = require('../models/smtpSettings');

function buildFromHeader(fromName, fromEmail) {
  const email = (fromEmail || '').trim();
  if (!email) return undefined;
  const name = (fromName || 'Zextons').replace(/"/g, '').trim() || 'Zextons';
  return `"${name}" <${email}>`;
}

/**
 * Merge DB document with optional overrides (e.g. unsaved form values for test).
 * Falls back to env vars when DB fields are empty.
 */
async function resolveEffectiveConfig(overrides = {}) {
  const doc = await SmtpSettings.getSettings();
  const o = overrides || {};

  const pick = (key, envKeys = []) => {
    const v = o[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    const fromDoc = doc[key];
    if (fromDoc !== undefined && fromDoc !== null && String(fromDoc).trim() !== '') {
      if (typeof fromDoc === 'number') return fromDoc;
      return String(fromDoc).trim();
    }
    for (const ek of envKeys) {
      if (process.env[ek]) return String(process.env[ek]).trim();
    }
    return '';
  };

  const host = pick('host', ['EMAIL_HOST', 'NEWSLETTER_EMAIL_HOST']);
  const portRaw = o.port !== undefined && o.port !== '' ? o.port : doc.port;
  const port = Number(portRaw) || Number(process.env.EMAIL_PORT || process.env.NEWSLETTER_EMAIL_PORT) || 465;
  const user = pick('username', ['EMAIL_USER', 'NEWSLETTER_EMAIL_USER']);

  let pass = '';
  if (o.password !== undefined && o.password !== null && String(o.password).trim() !== '') {
    pass = String(o.password).trim();
  } else {
    pass = (doc.password && String(doc.password).trim()) || process.env.EMAIL_PASS || process.env.NEWSLETTER_EMAIL_PASS || '';
  }

  const fromEmail = pick('fromEmail', ['EMAIL_FROM', 'NEWSLETTER_FROM_EMAIL']);
  const fromName = pick('fromName', ['EMAIL_FROM_NAME', 'NEWSLETTER_FROM_NAME']);

  let secure = doc.secure !== false;
  if (o.secure !== undefined) secure = Boolean(o.secure);
  if (port === 465) secure = true;

  return { host, port, secure, user, pass, fromEmail, fromName, doc };
}

function buildTransportOptions(effective) {
  const { host, port, secure, user, pass } = effective;
  const opts = {
    host,
    port,
    secure,
    auth: { user, pass },
  };
  if (port === 587 && !secure) opts.requireTLS = true;
  return opts;
}

async function createTransporter(overrides) {
  const effective = await resolveEffectiveConfig(overrides);
  if (!effective.host || !effective.user || !effective.pass) {
    const err = new Error(
      'SMTP is not fully configured. Set host, username, and password in Admin → Settings → SMTP (or use EMAIL_* env vars).'
    );
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  return nodemailer.createTransport(buildTransportOptions(effective));
}

async function getDefaultFrom(overrides) {
  const effective = await resolveEffectiveConfig(overrides);
  const from = buildFromHeader(effective.fromName, effective.fromEmail);
  if (from) return from;
  const legacy = process.env.NEWSLETTER_FROM || process.env.EMAIL_FROM;
  if (legacy && String(legacy).trim()) return String(legacy).trim();
  return undefined;
}

/**
 * Send mail using DB/env SMTP. If mailOptions.from is omitted, uses configured default From.
 */
async function sendMail(mailOptions, overrides) {
  const fromDefault = await getDefaultFrom(overrides);
  const payload = { ...mailOptions };
  if (!payload.from) {
    if (!fromDefault) {
      const err = new Error('Missing From address. Set From email in SMTP settings or pass mailOptions.from.');
      err.code = 'SMTP_FROM_MISSING';
      throw err;
    }
    payload.from = fromDefault;
  }
  const transporter = await createTransporter(overrides);
  return transporter.sendMail(payload);
}

async function verifyTransporter(overrides) {
  const transporter = await createTransporter(overrides);
  await transporter.verify();
  return true;
}

module.exports = {
  sendMail,
  createTransporter,
  verifyTransporter,
  getDefaultFrom,
  resolveEffectiveConfig,
  buildTransportOptions,
};
