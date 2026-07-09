/**
 * Server-side resource ownership checks for customer APIs.
 * Never trust userId/email from URL params or body for authorization decisions.
 */

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getRequesterId(req) {
  const id = req?.user?.id || req?.user?._id || req?.user?.userId;
  return id ? String(id) : '';
}

function getRequesterEmail(req) {
  return normalizeEmail(req?.user?.email);
}

function isAdminUser(req) {
  return ['admin', 'superadmin'].includes(String(req?.user?.role || '').toLowerCase());
}

function ownershipDenied(message = 'Forbidden') {
  return { ok: false, status: 403, message };
}

function unauthorized(message = 'Authentication required') {
  return { ok: false, status: 401, message };
}

function notFound(message = 'Not found') {
  return { ok: false, status: 404, message };
}

/**
 * Customer may only act as themselves; admins may act on behalf of others.
 */
function assertSelfOrAdmin(req, targetUserId) {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return unauthorized();
  }
  if (isAdminUser(req)) {
    return { ok: true, requesterId };
  }
  if (!targetUserId || String(targetUserId) !== requesterId) {
    return ownershipDenied();
  }
  return { ok: true, requesterId };
}

/**
 * Resolve the effective user id for a customer-scoped query.
 * Admins may pass an explicit targetUserId; customers always use JWT user.
 */
function resolveScopedUserId(req, targetUserIdFromClient) {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return unauthorized();
  }
  if (isAdminUser(req)) {
    const scoped = targetUserIdFromClient ? String(targetUserIdFromClient) : requesterId;
    return { ok: true, userId: scoped, requesterId };
  }
  if (targetUserIdFromClient && String(targetUserIdFromClient) !== requesterId) {
    return ownershipDenied();
  }
  return { ok: true, userId: requesterId, requesterId };
}

function orderOwnedByRequester(req, order) {
  if (!order) return false;
  const requesterId = getRequesterId(req);
  const requesterEmail = getRequesterEmail(req);
  const orderUserId = String(order.contactDetails?.userId || '').trim();
  const orderEmail = normalizeEmail(order.contactDetails?.email);

  if (requesterId && orderUserId && orderUserId === requesterId) {
    return true;
  }
  if (requesterEmail && orderEmail && requesterEmail === orderEmail) {
    return true;
  }
  return false;
}

function assertOrderAccess(req, order, { allowAdmin = false } = {}) {
  if (!order) {
    return notFound('Order not found');
  }
  if (allowAdmin && isAdminUser(req)) {
    return { ok: true };
  }
  if (!getRequesterId(req)) {
    return unauthorized();
  }
  if (orderOwnedByRequester(req, order)) {
    return { ok: true };
  }
  return ownershipDenied();
}

function returnOrderOwnedByRequester(req, returnOrder) {
  if (!returnOrder) return false;
  const requesterId = getRequesterId(req);
  const requesterEmail = getRequesterEmail(req);

  if (requesterId && returnOrder.userId && String(returnOrder.userId) === requesterId) {
    return true;
  }
  if (requesterEmail && normalizeEmail(returnOrder.email) === requesterEmail) {
    return true;
  }
  const nestedUserId = returnOrder.requestOrder?.userId;
  if (requesterId && nestedUserId && String(nestedUserId) === requesterId) {
    return true;
  }
  return false;
}

function assertReturnOrderAccess(req, returnOrder, { allowAdmin = false } = {}) {
  if (!returnOrder) {
    return notFound('Return order not found');
  }
  if (allowAdmin && isAdminUser(req)) {
    return { ok: true };
  }
  if (!getRequesterId(req)) {
    return unauthorized();
  }
  if (returnOrderOwnedByRequester(req, returnOrder)) {
    return { ok: true };
  }
  return ownershipDenied();
}

function requestOrderOwnedByRequester(req, requestOrder) {
  if (!requestOrder) return false;
  const requesterId = getRequesterId(req);
  return Boolean(requesterId && String(requestOrder.userId) === requesterId);
}

function assertRequestOrderAccess(req, requestOrder, { allowAdmin = false } = {}) {
  if (!requestOrder) {
    return notFound('Request order not found');
  }
  if (allowAdmin && isAdminUser(req)) {
    return { ok: true };
  }
  if (!getRequesterId(req)) {
    return unauthorized();
  }
  if (requestOrderOwnedByRequester(req, requestOrder)) {
    return { ok: true };
  }
  return ownershipDenied();
}

function sendOwnershipError(res, result) {
  return res.status(result.status || 403).json({
    success: false,
    message: result.message,
    status: result.status,
  });
}

module.exports = {
  normalizeEmail,
  getRequesterId,
  getRequesterEmail,
  isAdminUser,
  assertSelfOrAdmin,
  resolveScopedUserId,
  orderOwnedByRequester,
  assertOrderAccess,
  returnOrderOwnedByRequester,
  assertReturnOrderAccess,
  requestOrderOwnedByRequester,
  assertRequestOrderAccess,
  sendOwnershipError,
};
