const BookingSlotHold = require('../../models/bookingSlotHold');

/**
 * Verify holds are still active, unexpired, and owned by sessionId (when provided).
 */
async function verifyActiveHolds({ holdIds, sessionId }) {
  if (!Array.isArray(holdIds) || holdIds.length === 0) {
    return { valid: false, error: 'holdIds array is required' };
  }

  const holds = await BookingSlotHold.find({ _id: { $in: holdIds } }).lean();

  if (holds.length !== holdIds.length) {
    return { valid: false, error: 'One or more holds not found', expired: true };
  }

  const now = new Date();
  let earliestExpiry = null;

  for (const hold of holds) {
    if (hold.status !== 'active' && hold.status !== 'converting') {
      return {
        valid: false,
        error: 'Your slot reservation is no longer active',
        expired: true,
      };
    }

    const expiresAt = new Date(hold.expiresAt);
    if (expiresAt <= now) {
      return { valid: false, error: 'Your slot reservation has expired', expired: true };
    }

    if (sessionId && hold.sessionId && hold.sessionId !== sessionId) {
      return { valid: false, error: 'Hold session mismatch', expired: true };
    }

    if (!earliestExpiry || expiresAt < earliestExpiry) {
      earliestExpiry = expiresAt;
    }
  }

  return {
    valid: true,
    expiresAt: earliestExpiry ? earliestExpiry.toISOString() : null,
    holdCount: holds.length,
  };
}

module.exports = {
  verifyActiveHolds,
};
