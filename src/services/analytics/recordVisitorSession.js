const MarketingVisitorSession = require('../../models/marketingVisitorSession');
const { normalizeMarketingAttribution } = require('../../utils/marketingAttribution');

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
 * Accepts optional attribution (same raw shape as order marketingAttribution).
 * @param {{
 *   sessionId?: string,
 *   visitorId?: string,
 *   startedAt?: string|Date,
 *   landingPage?: string,
 *   deviceType?: string,
 *   attribution?: object,
 *   marketingAttribution?: object,
 * }} payload
 */
async function recordVisitorSession(payload = {}) {
  const sessionId = sanitizeId(payload.sessionId);
  if (!sessionId) return { ok: false, reason: 'missing_session_id' };

  const visitorId = sanitizeId(payload.visitorId);
  const startedAt = parseDate(payload.startedAt) || new Date();
  const landingPage = payload.landingPage
    ? String(payload.landingPage).trim().slice(0, 2048)
    : undefined;
  const deviceRaw = String(payload.deviceType || '')
    .trim()
    .toLowerCase();
  const deviceType = ['mobile', 'desktop', 'tablet', 'unknown'].includes(deviceRaw)
    ? deviceRaw
    : undefined;
  const now = new Date();

  const rawAttribution = payload.attribution || payload.marketingAttribution;
  const normalizedAttribution =
    rawAttribution && typeof rawAttribution === 'object' && !Array.isArray(rawAttribution)
      ? normalizeMarketingAttribution(rawAttribution)
      : undefined;

  const $set = {
    lastSeenAt: now,
    ...(visitorId ? { visitorId } : {}),
    ...(landingPage ? { landingPage } : {}),
    ...(deviceType ? { deviceType } : {}),
  };

  if (normalizedAttribution) {
    $set.attribution = normalizedAttribution;
  }

  await MarketingVisitorSession.findOneAndUpdate(
    { sessionId },
    {
      $set,
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
