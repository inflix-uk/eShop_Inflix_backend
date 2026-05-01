const AuditLog = require('../models/auditLog');

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'secret',
  'apiKey',
  'api_key',
  'stripeSecretKey',
  'cardNumber',
  'cvv',
  'cvc',
]);

const MAX_FIELD_LEN = 4000;

function redact(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return '[truncated:depth]';
  if (typeof value === 'string') {
    return value.length > MAX_FIELD_LEN ? value.slice(0, MAX_FIELD_LEN) + '…' : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redact(v, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redact(value[k], depth + 1);
      }
    }
    return out;
  }
  return value;
}

function extractRequestContext(req) {
  if (!req) return {};
  const user = req.user || req.admin || {};
  return {
    method: req.method,
    route: req.originalUrl || req.url,
    ip: req.ip || (req.connection && req.connection.remoteAddress),
    userAgent: req.get && req.get('user-agent'),
    userId: user._id ? String(user._id) : user.id ? String(user.id) : undefined,
    userEmail: user.email,
    requestBody: req.method && req.method !== 'GET' ? redact(req.body) : undefined,
  };
}

async function persist(entry) {
  try {
    await AuditLog.create(entry);
  } catch (err) {
    // Never let audit logging break the request — fall back to console.
    console.error('[auditLogService] failed to persist audit log:', err.message);
    console.error('[auditLogService] entry was:', JSON.stringify(entry).slice(0, 1000));
  }
}

function buildBase({ level, category, action, message, req, metadata }) {
  return {
    level,
    category: category || 'system',
    action,
    message,
    metadata: metadata ? redact(metadata) : undefined,
    ...extractRequestContext(req),
  };
}

const auditLogService = {
  async logInfo({ action, category, message, req, metadata }) {
    return persist(buildBase({ level: 'INFO', category, action, message, req, metadata }));
  },

  async logWarn({ action, category, message, req, metadata }) {
    return persist(buildBase({ level: 'WARN', category, action, message, req, metadata }));
  },

  async logError({ action, category, message, req, error, metadata, statusCode }) {
    const entry = buildBase({ level: 'ERROR', category, action, message, req, metadata });
    if (error) {
      entry.errorMessage = error.message;
      entry.errorName = error.name;
      entry.errorCode = error.code;
      entry.stack = error.stack;
    }
    if (statusCode) entry.statusCode = statusCode;
    return persist(entry);
  },

  async logCritical({ action, category, message, error, metadata }) {
    const entry = {
      level: 'CRITICAL',
      category: category || 'process_crash',
      action,
      message,
      metadata: metadata ? redact(metadata) : undefined,
    };
    if (error) {
      entry.errorMessage = error.message;
      entry.errorName = error.name;
      entry.errorCode = error.code;
      entry.stack = error.stack;
    }
    return persist(entry);
  },

  async logExternalApi({ provider, action, success, req, error, metadata, durationMs }) {
    const entry = buildBase({
      level: success ? 'INFO' : 'ERROR',
      category: provider === 'google' ? 'google_api' : 'external_api',
      action,
      message: success ? `${provider} ${action} succeeded` : `${provider} ${action} failed`,
      req,
      metadata: { provider, ...(metadata || {}) },
    });
    entry.durationMs = durationMs;
    if (error) {
      entry.errorMessage = error.message;
      entry.errorName = error.name;
      entry.errorCode = error.code || (error.response && error.response.status);
      entry.stack = error.stack;
    }
    return persist(entry);
  },

  redact,
};

module.exports = auditLogService;
