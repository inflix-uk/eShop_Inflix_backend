const requireAuth = require('./requireAuth');

function isAdminRole(role) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin';
}

function requireAdminRole(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) {
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
