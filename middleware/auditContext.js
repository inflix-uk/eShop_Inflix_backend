const { runWithAuditContext } = require('../src/utils/auditContext');
const auditLogService = require('../src/services/auditLogService');

// Establishes the per-request audit context so the Mongoose audit plugin can
// attach "who / where" (userId, role, ip, route) to every data change made
// while handling this request. Must run EARLY — before any route handler that
// writes to the database — so the whole async chain sees the store.
//
// Header-based auth (x-user-id / x-user-role) is already available on the
// incoming request, so we can capture identity even for routes whose auth
// guard runs later.
const auditContext = (req, res, next) => {
  const ctx = auditLogService.extractRequestContext(req);
  runWithAuditContext(ctx, () => next());
};

module.exports = { auditContext };
