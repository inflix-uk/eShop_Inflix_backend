// Audit log service.
// Best-effort by design: every write is wrapped so a logging failure can NEVER
// break the request/cron/DB flow that called it. All public methods return a
// Promise that always resolves (never rejects).
const AuditLog = require('../models/auditLog');

const MAX_STACK = 4000; // don't store giant stacks
const MAX_MSG = 2000;

function truncate(str, max) {
  if (typeof str !== 'string') return undefined;
  return str.length > max ? str.slice(0, max) : str;
}

function serializeError(error) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncate(error.message, MAX_MSG),
      stack: truncate(error.stack, MAX_STACK),
    };
  }
  // Non-Error throwable (string, object, etc.)
  return { name: 'NonError', message: truncate(String(error), MAX_MSG) };
}

// Pull the "who/where" out of an Express request, tolerating the project's
// header-based auth (req.user may be absent; role often comes via headers).
function extractRequestContext(req) {
  if (!req) return {};
  const headers = req.headers || {};
  const user = req.user || null;
  const userId = user?._id || user?.id || headers['x-user-id'] || undefined;
  const userRole =
    user?.role || headers['x-user-role'] || headers['x-role'] || undefined;
  return {
    method: req.method,
    route: req.originalUrl || req.url,
    userId,
    userRole: userRole ? String(userRole) : undefined,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: typeof req.get === 'function' ? req.get('user-agent') : headers['user-agent'],
  };
}

// Core writer. Accepts a flat object; `req` (if given) is expanded into context.
async function write({
  level = 'info',
  action,
  category,
  message,
  req,
  error,
  metadata,
  // direct fields (used by request-timing middleware)
  method,
  route,
  statusCode,
  durationMs,
  userId,
  userRole,
  ip,
  userAgent,
} = {}) {
  try {
    const ctx = req ? extractRequestContext(req) : {};
    const resolvedRoute = route ?? ctx.route;

    // Only route-based entries are stored. Anything without a route
    // (e.g. database.reconnect_failed, cron errors) is intentionally dropped.
    if (!resolvedRoute) return;

    const doc = {
      level,
      action,
      category,
      message: truncate(message, MAX_MSG),
      method: method ?? ctx.method,
      route: resolvedRoute,
      statusCode,
      durationMs,
      userId: userId ?? ctx.userId,
      userRole: userRole ?? ctx.userRole,
      ip: ip ?? ctx.ip,
      userAgent: userAgent ?? ctx.userAgent,
      metadata,
      error: serializeError(error),
    };
    await AuditLog.create(doc);
  } catch (err) {
    // Never throw out of the audit path. A single console line is enough.
    console.error('[auditLogService] failed to write audit log:', err.message);
  }
}

module.exports = {
  // Generic
  log: (opts) => write(opts),
  logInfo: (opts) => write({ ...opts, level: 'info' }),
  logWarn: (opts) => write({ ...opts, level: 'warn' }),
  logError: (opts) => write({ ...opts, level: 'error' }),
  logCritical: (opts) => write({ ...opts, level: 'critical' }),

  // Per-request performance entry (used by the auditTimer middleware).
  logRequest: (opts) =>
    write({ level: opts?.level || 'info', category: 'request', action: 'http.request', ...opts }),

  // Building block for a future per-entity CRUD trail.
  // e.g. logEvent({ action: 'order.update', category: 'order', req, metadata: { id, before, after } })
  logEvent: (opts) => write({ level: 'info', ...opts }),

  // Exposed for callers that want to attach request context manually.
  extractRequestContext,
};
