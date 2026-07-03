const nodemailer = require('nodemailer');
const SmtpSettings = require('../models/smtpSettings');

function buildFromHeader(fromName, fromEmail) {
  const email = (fromEmail || '').trim();
  if (!email) return undefined;
  const name = (fromName || process.env.STORE_NAME || 'Store').replace(/"/g, '').trim() || 'Store';
  return `"${name}" <${email}>`;
}

/** Gmail app passwords are 16 chars; users often paste with spaces (e.g. "abcd efgh ijkl mnop"). */
function normalizeSmtpPassword(pass) {
  if (pass == null) return '';
  const raw = String(pass).trim();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, '');
  if (raw.includes(' ') && compact.length === 16) return compact;
  return raw;
}

function smtpDocIsConfigured(doc) {
  return Boolean(doc?.host && String(doc.host).trim() && doc?.username && String(doc.username).trim());
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
  const portFromDoc = smtpDocIsConfigured(doc) ? doc.port : null;
  const portRaw = o.port !== undefined && o.port !== '' ? o.port : portFromDoc;
  const port =
    Number(portRaw) || Number(process.env.EMAIL_PORT || process.env.NEWSLETTER_EMAIL_PORT) || 465;
  const user = pick('username', ['EMAIL_USER', 'NEWSLETTER_EMAIL_USER']);

  let pass = '';
  if (o.password !== undefined && o.password !== null && String(o.password).trim() !== '') {
    pass = normalizeSmtpPassword(o.password);
  } else {
    pass = normalizeSmtpPassword(
      (doc.password && String(doc.password).trim()) ||
        process.env.EMAIL_PASS ||
        process.env.NEWSLETTER_EMAIL_PASS ||
        ''
    );
  }

  const fromEmail = pick('fromEmail', ['EMAIL_FROM', 'NEWSLETTER_FROM_EMAIL']);
  const fromName = pick('fromName', ['EMAIL_FROM_NAME', 'NEWSLETTER_FROM_NAME']);

  let secure = doc.secure !== false;
  if (o.secure !== undefined) secure = Boolean(o.secure);
  /** 465 = implicit TLS (SMTPS). 587 = STARTTLS (plain socket then upgrade); secure:true on 587 breaks many hosts (often 535). */
  if (port === 465) secure = true;
  if (port === 587) secure = false;

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
  if (port === 587) {
    opts.secure = false;
    opts.requireTLS = true;
  }
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

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Where to send store "new order" alerts (not the customer confirmation address).
 * Priority: SMTP settings → ORDER_NOTIFY_EMAIL env → legacy default.
 */
async function getOrderNotifyRecipientEmail() {
  try {
    const doc = await SmtpSettings.getSettings();
    const fromDb = String(doc.orderNotifyEmail || '').trim();
    if (fromDb && SIMPLE_EMAIL_RE.test(fromDb)) return fromDb;
  } catch {
    /* ignore */
  }
  const fromEnv = String(process.env.ORDER_NOTIFY_EMAIL || '').trim();
  if (fromEnv && SIMPLE_EMAIL_RE.test(fromEnv)) return fromEnv;
  return '';
}

function parseCommaSeparatedEmails(raw) {
  if (raw == null || typeof raw !== 'string') return [];
  const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (SIMPLE_EMAIL_RE.test(p)) out.push(p);
  }
  return out;
}

function emailsToNodemailerField(list) {
  if (!list || list.length === 0) return undefined;
  return list.length === 1 ? list[0] : list;
}

/**
 * CC/BCC for the customer order-confirmation email only (checkout receipt).
 * BCC: DB list if non-empty; else TRUSTPILOT_BCC_EMAIL env; else Trustpilot AFS invite default.
 */
async function getOrderConfirmationCcAndBcc() {
  let ccList = [];
  let bccList = [];
  try {
    const doc = await SmtpSettings.getSettings();
    ccList = parseCommaSeparatedEmails(String(doc.orderConfirmationCc || ''));
    const bccStored = String(doc.orderConfirmationBcc || '').trim();
    if (bccStored) {
      bccList = parseCommaSeparatedEmails(bccStored);
    }
  } catch {
    /* ignore */
  }
  if (bccList.length === 0) {
    const fallback =
      (process.env.TRUSTPILOT_BCC_EMAIL && String(process.env.TRUSTPILOT_BCC_EMAIL).trim()) ||
      '9311f649e0@invite.trustpilot.com';
    bccList = parseCommaSeparatedEmails(fallback);
    if (bccList.length === 0 && SIMPLE_EMAIL_RE.test(fallback)) {
      bccList = [fallback];
    }
  }
  return {
    cc: emailsToNodemailerField(ccList),
    bcc: emailsToNodemailerField(bccList),
  };
}

module.exports = {
  sendMail,
  createTransporter,
  verifyTransporter,
  getDefaultFrom,
  getOrderNotifyRecipientEmail,
  getOrderConfirmationCcAndBcc,
  resolveEffectiveConfig,
  buildTransportOptions,
};
