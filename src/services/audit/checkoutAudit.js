const CheckoutAuditLog = require('../../models/checkoutAuditLog');

/**
 * Writer for the checkout audit trail.
 *
 * Absolute rule: logging must never break a checkout. Every function here
 * swallows its own errors and returns immediately — nothing is awaited by the
 * request path, and a broken/disconnected database cannot surface to a
 * customer trying to pay.
 */

const MAX_STRING = 2000;
const MAX_STACK = 4000;
const MAX_DATA_BYTES = 16000;

/**
 * Mongoose buffers writes while the connection is down and only gives up after
 * bufferTimeoutMS (10s). Checkout is the most latency-sensitive path in the
 * app, so a dead database must not leave a pending timer and a retained
 * document behind for every step of every journey. Connected or connecting is
 * worth writing to; anything else gets a console line instead.
 */
function canReachDatabase() {
  try {
    const state = CheckoutAuditLog?.db?.readyState;
    return state === 1 || state === 2;
  } catch {
    return false;
  }
}

/** Anything that looks like a credential or card never reaches the database. */
const REDACT_KEYS = /(secret|password|token|apikey|api_key|authorization|cookie|cvc|cvv|card_?number|pan|iban|sortcode|sort_code|account_?number)/i;
const REDACTED = '[REDACTED]';

function truncate(value, max = MAX_STRING) {
  if (value === undefined || value === null) return undefined;
  const s = typeof value === 'string' ? value : String(value);
  return s.length > max ? `${s.slice(0, max)}…[truncated]` : s;
}

/** Deep copy with secrets stripped, cycles broken and depth bounded. */
function sanitize(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[depth-limit]';

  const t = typeof value;
  if (t === 'string') return truncate(value);
  if (t === 'number' || t === 'boolean') return value;
  if (t === 'bigint') return String(value);
  if (t === 'function' || t === 'symbol') return undefined;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      code: value.code,
    };
  }

  if (t === 'object') {
    if (seen.has(value)) return '[circular]';
    seen.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, 50).map((v) => sanitize(v, depth + 1, seen));
    }

    // Mongoose docs / ObjectIds → plain values
    if (typeof value.toHexString === 'function') return value.toHexString();
    const source = typeof value.toObject === 'function' ? value.toObject() : value;

    const out = {};
    let count = 0;
    for (const [k, v] of Object.entries(source)) {
      if (count++ > 60) {
        out['…'] = '[key-limit]';
        break;
      }
      if (REDACT_KEYS.test(k)) {
        out[k] = REDACTED;
        continue;
      }
      const clean = sanitize(v, depth + 1, seen);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  }

  return undefined;
}

/** Keep a runaway `data` blob from bloating the collection. */
function capData(data) {
  const clean = sanitize(data);
  if (clean === undefined) return undefined;
  try {
    const json = JSON.stringify(clean);
    if (json.length <= MAX_DATA_BYTES) return clean;
    return { _truncated: true, _originalBytes: json.length, preview: json.slice(0, MAX_DATA_BYTES) };
  } catch {
    return { _unserializable: true };
  }
}

/** Pull the useful bits out of whatever error shape we were handed. */
function describeError(error) {
  if (!error) return {};

  // Stripe errors carry structured fields worth their own columns.
  const isStripe = typeof error.type === 'string' && error.type.startsWith('Stripe');

  return {
    errorName: truncate(error.name || (isStripe ? error.type : undefined), 200),
    errorMessage: truncate(error.message, MAX_STRING),
    errorStack: truncate(error.stack, MAX_STACK),
    httpStatus: Number.isFinite(error.statusCode) ? error.statusCode : undefined,
    stripeErrorType: isStripe ? truncate(error.type, 100) : undefined,
    stripeErrorCode: truncate(error.code, 100),
    stripeDeclineCode: truncate(error.decline_code, 100),
    stripeRequestId: truncate(error.requestId || error.request_id, 100),
  };
}

function pickObjectId(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value.toHexString === 'function') return value;
  if (value._id) return value._id;
  return undefined;
}

/** Request-derived context, when a req is available. */
function fromRequest(req) {
  if (!req) return {};
  const headers = req.headers || {};
  return {
    ip: truncate(
      (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        req.connection?.remoteAddress,
      100
    ),
    userAgent: truncate(headers['user-agent'], 500),
    checkoutSessionId: truncate(
      headers['x-checkout-session'] || req.body?.checkoutSessionId,
      120
    ),
    userId: pickObjectId(req.user?._id),
  };
}

/**
 * Write one audit row. Fire-and-forget: returns immediately, never throws,
 * never rejects. Callers must NOT await this.
 */
function logCheckout(entry = {}) {
  try {
    if (!entry || typeof entry !== 'object') return;
    const { error, req, ...rest } = entry;

    const doc = {
      ...fromRequest(req),
      ...rest,
      ...describeError(error),
      event: truncate(rest.event || 'checkout.unknown', 160),
      message: truncate(rest.message, MAX_STRING),
      failureReason: truncate(rest.failureReason, 500),
      data: capData(rest.data),
      createdAt: new Date(),
    };

    // An explicit field on the entry always beats one derived from the request.
    if (rest.checkoutSessionId) doc.checkoutSessionId = truncate(rest.checkoutSessionId, 120);

    // Failures should never be silently filed as info.
    if (doc.outcome === 'failure' && (!doc.severity || doc.severity === 'info')) {
      doc.severity = 'error';
    }

    if (!canReachDatabase()) {
      console.warn(`[checkoutAudit] database unavailable — dropped ${doc.event}`);
      return;
    }

    CheckoutAuditLog.create(doc).catch((e) => {
      console.error('[checkoutAudit] write failed:', e.message);
    });
  } catch (e) {
    console.error('[checkoutAudit] write threw:', e.message);
  }
}

/** Convenience wrappers so call sites stay short and consistent. */
const auditStarted = (entry = {}) => logCheckout({ ...entry, outcome: 'started', severity: 'info' });
const auditSuccess = (entry = {}) => logCheckout({ ...entry, outcome: 'success', severity: 'info' });
const auditFailure = (entry = {}) =>
  logCheckout({ ...entry, outcome: 'failure', severity: entry?.severity || 'error' });
const auditBlocked = (entry = {}) =>
  logCheckout({ ...entry, outcome: 'blocked', severity: entry?.severity || 'warn' });

/** Millisecond timer for durationMs. */
function startTimer() {
  const t0 = Date.now();
  return () => Date.now() - t0;
}

module.exports = {
  logCheckout,
  auditStarted,
  auditSuccess,
  auditFailure,
  auditBlocked,
  startTimer,
  // exported for tests
  sanitize,
  describeError,
  capData,
};
