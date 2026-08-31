// Writer for the authentication / authorisation trail.
//
// Login, logout, password changes and privilege denials leave no document
// behind, so the Mongoose audit plugin cannot see them — they have to be
// recorded explicitly. Everything lands in the same AuditLog collection the
// rest of the system uses, under category 'auth', so one query covers the
// whole trail.
//
// Absolute rule, same as every other audit path here: logging must never break
// a sign-in. Every function swallows its own errors and returns immediately;
// nothing is awaited by the request path.
const auditLogService = require('../auditLogService');

const CATEGORY = 'auth';
const MAX_EMAIL = 320;

/** Emails identify the actor on failed attempts, where there is no user id. */
function normalizeEmail(email) {
  if (typeof email !== 'string') return undefined;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_EMAIL ? trimmed.slice(0, MAX_EMAIL) : trimmed;
}

function idOf(user) {
  if (!user) return undefined;
  const id = user._id || user.id || user.userId;
  return id ? String(id) : undefined;
}

/**
 * Core writer. `level` drives severity; 'warn' and above persist even when the
 * caller has no route (see auditLogService.write).
 */
function write({ req, action, level = 'info', message, user, email, metadata }) {
  try {
    auditLogService.log({
      level,
      action,
      category: CATEGORY,
      message,
      req,
      // Auth events are security evidence, never background noise: keep them
      // even in the (unexpected) case that no route could be resolved.
      allowNoRoute: true,
      // The acting user is rarely on `req` for auth routes (the guard has not
      // run, or there is no session yet), so pass it explicitly when known.
      userId: idOf(user),
      userRole: user?.role ? String(user.role) : undefined,
      metadata: {
        ...(metadata || {}),
        email: normalizeEmail(email ?? user?.email),
      },
    });
  } catch (err) {
    console.error('[authAudit] write threw:', err.message);
  }
}

/** A credential check that passed. */
const auditAuthSuccess = ({ req, action, message, user, email, metadata } = {}) =>
  write({ req, action, level: 'info', message, user, email, metadata });

/**
 * A credential check that failed, or an account action that was refused.
 * Recorded at 'warn' — these are what a brute-force or takeover attempt looks
 * like, and they must survive even outside a request.
 */
const auditAuthFailure = ({ req, action, message, user, email, metadata } = {}) =>
  write({ req, action, level: 'warn', message, user, email, metadata });

/**
 * A caller was refused access to a protected route: no/invalid session, or a
 * valid session without the required role.
 */
const auditAccessDenied = ({ req, action, message, user, metadata } = {}) =>
  write({ req, action, level: 'warn', message, user, metadata });

module.exports = {
  auditAuthSuccess,
  auditAuthFailure,
  auditAccessDenied,
  // exported for tests
  normalizeEmail,
};
