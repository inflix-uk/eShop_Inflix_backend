const mongoose = require('mongoose');

function isAdminRole(role) {
  return ['admin', 'superadmin'].includes(String(role || '').toLowerCase());
}

module.exports = (req, _res, next) => {
  const queryGroupId = typeof req.query?.groupId === 'string' ? req.query.groupId.trim() : '';
  const queryUserId = typeof req.query?.userId === 'string' ? req.query.userId.trim() : '';
  const user = req.user || null;
  const isAdmin = user && isAdminRole(user.role);

  let resolvedGroupId = null;
  let resolvedUserId = null;

  if (user && !isAdmin) {
    const ownGroupId = String(user.pricingGroup || '').trim();
    const ownUserId = String(user._id || user.id || '').trim();
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
  } else if (user && isAdmin && mongoose.Types.ObjectId.isValid(queryUserId)) {
    resolvedUserId = queryUserId;
  }

  req.pricingScope = { groupId: resolvedGroupId, userId: resolvedUserId, isAdmin: !!isAdmin };
  next();
};
