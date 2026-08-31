// Audit log service.
// Best-effort by design: every write is wrapped so a logging failure can NEVER
// break the request/cron/DB flow that called it. All public methods return a
// Promise that always resolves (never rejects).
const AuditLog = require('../models/auditLog');

const MAX_STACK = 4000; // don't store giant stacks
const MAX_MSG = 2000;

// Mongoose buffers writes while the connection is down and only gives up after
// bufferTimeoutMS (10s by default). For a fire-and-forget logger that is the
// wrong trade: during an outage every request would leave a pending timer and a
// retained document behind, piling up at exactly the worst moment.
//
//   readyState 1 (connected)  -> write normally
//   readyState 2 (connecting) -> let it buffer; a short blip still lands
//   readyState 0/3 (down)     -> skip the write, leave a console line instead
//
// Losing entries while the database is unreachable is unavoidable — the audit
// sink IS that database — so the goal is simply not to make the outage worse.
function canReachDatabase() {
  try {
    const state = AuditLog?.db?.readyState;
    return state === 1 || state === 2;
  } catch {
    return false;
  }
}

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
  // When true, the entry is stored even without a route. Data-change auditing
  // and every warn/error/critical entry opt in, because those are exactly the
  // events that happen outside a request (cron, startup, DB connection loss).
  allowNoRoute = false,
} = {}) {
  try {
    const ctx = req ? extractRequestContext(req) : {};
    const resolvedRoute = route ?? ctx.route;

    // Informational, route-less entries are dropped as noise. Failures never
    // are — a cron crash or a dropped DB connection must leave a trace even
    // though no HTTP route was involved.
    if (!resolvedRoute && !allowNoRoute) return;

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
    if (!canReachDatabase()) {
      console.warn(
        `[auditLogService] database unavailable — dropped audit entry: ${doc.action || doc.category || 'unknown'}`
      );
      return;
    }

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

  // Failure levels persist with or without a route: cron jobs, startup and the
  // database connection itself have no `req`, and those are precisely the
  // events nobody can afford to lose. Callers may still pass allowNoRoute:false
  // explicitly to opt back out.
  logWarn: (opts) => write({ allowNoRoute: true, ...opts, level: 'warn' }),
  logError: (opts) => write({ allowNoRoute: true, ...opts, level: 'error' }),
  logCritical: (opts) => write({ allowNoRoute: true, ...opts, level: 'critical' }),

  // Per-request performance entry (used by the auditTimer middleware).
  logRequest: (opts) =>
    write({ level: opts?.level || 'info', category: 'request', action: 'http.request', ...opts }),

  // Building block for a future per-entity CRUD trail.
  // e.g. logEvent({ action: 'order.update', category: 'order', req, metadata: { id, before, after } })
  logEvent: (opts) => write({ level: 'info', ...opts }),

  // Per-entity data change (create/update/delete) written by the Mongoose audit
  // plugin. Stored even without a route so cron/startup writes are captured.
  logDataChange: (opts) => write({ level: 'info', category: 'data', allowNoRoute: true, ...opts }),

  // Exposed for callers that want to attach request context manually.
  extractRequestContext,
};
