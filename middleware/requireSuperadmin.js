const requireAuth = require('./requireAuth');
const { auditAccessDenied } = require('../src/services/audit/authAudit');

function requireSuperadminRole(req, res, next) {
  if (!req.user || String(req.user.role).toLowerCase() !== 'superadmin') {
    // An authenticated account — often a plain admin — reaching for superadmin
    // territory. This is the privilege-escalation signal worth alerting on.
    auditAccessDenied({
      req,
      action: 'auth.access.denied',
      message: 'Superadmin-only route refused',
      user: req.user,
      metadata: {
        reason: 'insufficient_role',
        required: 'superadmin',
        actualRole: req.user?.role || null,
      },
    });
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Superadmin access required',
      status: 403,
    });
  }
  return next();
}

const requireSuperadmin = [requireAuth, requireSuperadminRole];

module.exports = requireSuperadmin;
