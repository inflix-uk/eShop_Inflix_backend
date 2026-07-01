const mongoose = require('mongoose');

function isAdminRole(role) {
  return String(role || '').toLowerCase() === 'admin';
}

module.exports = (req, _res, next) => {
  const queryGroupId = typeof req.query?.groupId === 'string' ? req.query.groupId.trim() : '';
  const queryUserId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : '';
  const user = req.user || null;
  const headerRole = req.headers['x-user-role'] || req.headers['x-role'] || '';
  const isAdmin = isAdminRole(user?.role) || isAdminRole(headerRole);

  let resolvedGroupId = null;
  let resolvedUserId = null;

  // Security rule:
  // - Authenticated non-admin users can only use their own pricing group.
  // - groupId query parameter is honored only for admins.
  if (user && !isAdmin) {
    const ownGroupId = String(user.pricingGroup || '').trim();
    const ownUserId = String(user._id || '').trim();
    if (mongoose.Types.ObjectId.isValid(ownGroupId)) {
      resolvedGroupId = ownGroupId;
    }
    if (mongoose.Types.ObjectId.isValid(ownUserId)) {
      resolvedUserId = ownUserId;
    }
  } else if (isAdmin && mongoose.Types.ObjectId.isValid(queryGroupId)) {
    resolvedGroupId = queryGroupId;
    if (mongoose.Types.ObjectId.isValid(queryUserId)) {
      resolvedUserId = queryUserId;
    }
  } else if (!user && mongoose.Types.ObjectId.isValid(queryGroupId)) {
    // Backward-compatible fallback:
    // In current project flow, storefront requests do not always have req.user attached.
    // Honor query groupId so group pricing can still resolve for logged-in frontend users.
    resolvedGroupId = queryGroupId;
    if (mongoose.Types.ObjectId.isValid(queryUserId)) {
      resolvedUserId = queryUserId;
    }
  } else if (!user && mongoose.Types.ObjectId.isValid(queryUserId)) {
    resolvedUserId = queryUserId;
  }

  req.pricingScope = { groupId: resolvedGroupId, userId: resolvedUserId, isAdmin };
  next();
};
