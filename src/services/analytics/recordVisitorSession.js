const MarketingVisitorSession = require('../../models/marketingVisitorSession');

function sanitizeId(value, maxLen = 128) {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function parseDate(value) {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Upsert a marketing visitor session (storefront, consent-gated). Never throws.
 * @param {{ sessionId?: string, visitorId?: string, startedAt?: string|Date, landingPage?: string }} payload
 */
async function recordVisitorSession(payload = {}) {
  const sessionId = sanitizeId(payload.sessionId);
  if (!sessionId) return { ok: false, reason: 'missing_session_id' };

  const visitorId = sanitizeId(payload.visitorId);
  const startedAt = parseDate(payload.startedAt) || new Date();
  const landingPage = payload.landingPage
    ? String(payload.landingPage).trim().slice(0, 2048)
    : undefined;
  const now = new Date();

  await MarketingVisitorSession.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        lastSeenAt: now,
        ...(visitorId ? { visitorId } : {}),
        ...(landingPage ? { landingPage } : {}),
      },
      $setOnInsert: {
        sessionId,
        startedAt,
      },
    },
    { upsert: true, new: true }
  );

  return { ok: true };
}

/**
 * Count visitor sessions whose startedAt falls in [startDate, endDate].
 */
async function countVisitorSessionsInRange(startDate, endDate) {
  return MarketingVisitorSession.countDocuments({
    startedAt: { $gte: startDate, $lte: endDate },
  });
}

/**
 * Distinct non-empty visitorId values with startedAt in [startDate, endDate].
 */
async function countUniqueVisitorsInRange(startDate, endDate) {
  const ids = await MarketingVisitorSession.distinct('visitorId', {
    startedAt: { $gte: startDate, $lte: endDate },
    visitorId: { $exists: true, $nin: [null, ''] },
  });
  return ids.length;
}

/**
 * Distinct sessionId + visitorId sets for sessions with startedAt in range.
 */
async function getSessionPopulationInRange(startDate, endDate) {
  const rows = await MarketingVisitorSession.find({
    startedAt: { $gte: startDate, $lte: endDate },
  })
    .select('sessionId visitorId')
    .lean();

  const visitorIds = new Set();
  const sessionIds = new Set();

  for (const row of rows) {
    if (row.sessionId) sessionIds.add(String(row.sessionId));
    if (row.visitorId) visitorIds.add(String(row.visitorId));
  }

  return { visitorIds, sessionIds };
}

module.exports = {
  recordVisitorSession,
  countVisitorSessionsInRange,
  countUniqueVisitorsInRange,
  getSessionPopulationInRange,
};
