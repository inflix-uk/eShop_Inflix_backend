const requireAuth = require('./requireAuth');

function requireSuperadminRole(req, res, next) {
  if (!req.user || String(req.user.role).toLowerCase() !== 'superadmin') {
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
