const requireAuth = require('./requireAuth');
const requireAdmin = require('./requireAdmin');
const requireSuperadmin = require('./requireSuperadmin');

module.exports = {
  auth: [requireAuth],
  admin: [requireAuth, requireAdmin],
  superadmin: [requireAuth, requireSuperadmin],
};
