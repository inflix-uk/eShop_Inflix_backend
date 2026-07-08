const mongoose = require('mongoose');

function isAdminRole(role) {
  return ['admin', 'superadmin'].includes(String(role || '').toLowerCase());
}

/**
 * Build pricing scope from an Express request (uses optionalAuth-populated req.user).
 * Checkout/payment: scope from JWT user only — not from client body.
 * @param {import('express').Request} req
 * @returns {{ userId: string|null, groupId: string|null, isAdmin: boolean }}
 */
function buildPricingScope(req) {
  const user = req?.user || null;
  const isAdmin = Boolean(user && isAdminRole(user.role));

  if (user && !isAdmin) {
    const ownGroupId = String(user.pricingGroup || '').trim();
    const ownUserId = String(user._id || user.id || user.userId || '').trim();
    return {
      userId: mongoose.Types.ObjectId.isValid(ownUserId) ? ownUserId : null,
      groupId: mongoose.Types.ObjectId.isValid(ownGroupId) ? ownGroupId : null,
      isAdmin: false,
    };
  }

  return {
    userId: null,
    groupId: null,
    isAdmin,
  };
}

/**
 * Build scope from listing middleware shape (resolvePricingScope on req.pricingScope).
 * @param {{ groupId?: string|null, userId?: string|null, isAdmin?: boolean }|null} pricingScope
 */
function buildPricingScopeFromPricingScope(pricingScope) {
  if (!pricingScope) {
    return { userId: null, groupId: null, isAdmin: false };
  }
  return {
    userId: pricingScope.userId || null,
    groupId: pricingScope.groupId || null,
    isAdmin: Boolean(pricingScope.isAdmin),
  };
}

module.exports = {
  buildPricingScope,
  buildPricingScopeFromPricingScope,
};
