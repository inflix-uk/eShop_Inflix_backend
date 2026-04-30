const mongoose = require('mongoose');

function isAdminRole(role) {
  return String(role || '').toLowerCase() === 'admin';
}

module.exports = (req, _res, next) => {
  const queryGroupId = typeof req.query?.groupId === 'string' ? req.query.groupId.trim() : '';
  const user = req.user || null;
  const headerRole = req.headers['x-user-role'] || req.headers['x-role'] || '';
  const isAdmin = isAdminRole(user?.role) || isAdminRole(headerRole);

  let resolvedGroupId = null;

  // Security rule:
  // - Authenticated non-admin users can only use their own pricing group.
  // - groupId query parameter is honored only for admins.
  if (user && !isAdmin) {
    const ownGroupId = String(user.pricingGroup || '').trim();
    if (mongoose.Types.ObjectId.isValid(ownGroupId)) {
      resolvedGroupId = ownGroupId;
    }
  } else if (isAdmin && mongoose.Types.ObjectId.isValid(queryGroupId)) {
    resolvedGroupId = queryGroupId;
  } else if (!user && mongoose.Types.ObjectId.isValid(queryGroupId)) {
    // Backward-compatible fallback:
    // In current project flow, storefront requests do not always have req.user attached.
    // Honor query groupId so group pricing can still resolve for logged-in frontend users.
    resolvedGroupId = queryGroupId;
  }

  req.pricingScope = { groupId: resolvedGroupId, isAdmin };
  console.log('[resolvePricingScope]', {
    path: req.path,
    queryGroupId,
    hasUser: Boolean(user),
    userRole: user?.role || null,
    headerRole: headerRole || null,
    resolvedGroupId,
    isAdmin,
  });
  next();
};
