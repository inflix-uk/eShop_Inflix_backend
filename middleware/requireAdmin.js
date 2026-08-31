const requireAuth = require('./requireAuth');
const { auditAccessDenied } = require('../src/services/audit/authAudit');

function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

function requireAdminRole(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) {
    // requireAuth has already passed, so this is an authenticated account
    // reaching for something above its level — always worth recording.
    auditAccessDenied({
      req,
      action: 'auth.access.denied',
      message: 'Admin-only route refused',
      user: req.user,
      metadata: {
        reason: 'insufficient_role',
        required: 'admin',
        actualRole: req.user?.role || null,
      },
    });
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required',
      status: 403,
    });
  }
  return next();
}

const requireAdmin = [requireAuth, requireAdminRole];

module.exports = requireAdmin;
