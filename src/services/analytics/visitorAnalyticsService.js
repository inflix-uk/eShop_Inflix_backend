const MarketingVisitorSession = require('../../models/marketingVisitorSession');

function normalizeLandingPath(landingPage) {
  if (!landingPage || typeof landingPage !== 'string') return null;
  const trimmed = landingPage.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const path = url.pathname || '/';
    return path.length > 120 ? `${path.slice(0, 117)}…` : path;
  } catch {
    if (trimmed.startsWith('/')) {
      return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
    }
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
  }
}

/**
 * Top landing pages by session count in the selected UK date window.
 */
async function getTopLandingPages(startDate, endDate, limit = 10) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
        landingPage: { $exists: true, $nin: [null, ''] },
      },
    },
    {
      $group: {
        _id: '$landingPage',
        sessions: { $sum: 1 },
      },
    },
    { $sort: { sessions: -1 } },
    { $limit: Math.max(limit * 5, 50) },
  ]);

  const merged = new Map();
  for (const row of rows) {
    const path = normalizeLandingPath(row._id);
    if (!path) continue;
    merged.set(path, (merged.get(path) || 0) + row.sessions);
  }

  const pages = [...merged.entries()]
    .map(([landingPage, sessions]) => ({ landingPage, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, Math.max(1, Math.min(limit, 50)));

  return {
    pages,
    availability: pages.length > 0 ? 'available' : 'unavailable',
  };
}

const DEVICE_LABELS = {
  mobile: 'Mobile',
  desktop: 'Desktop',
  tablet: 'Tablet',
  unknown: 'Unknown',
};

/**
 * Visitor sessions grouped by device type in the selected UK date window.
 */
async function getVisitorsByDevice(startDate, endDate) {
  const rows = await MarketingVisitorSession.aggregate([
    {
      $match: {
        startedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $ifNull: ['$deviceType', 'unknown'] },
        sessions: { $sum: 1 },
        visitorIds: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: ['$visitorId', null] },
                  { $ne: ['$visitorId', ''] },
                ],
              },
              '$visitorId',
              '$$REMOVE',
            ],
          },
        },
      },
    },
    {
      $project: {
        device: '$_id',
        sessions: 1,
        visitors: { $size: '$visitorIds' },
      },
    },
    { $sort: { sessions: -1 } },
  ]);

  const devices = rows.map((row) => ({
    device: row.device || 'unknown',
    label: DEVICE_LABELS[row.device] || DEVICE_LABELS.unknown,
    sessions: row.sessions,
    visitors: row.visitors,
  }));

  return {
    devices,
    availability: devices.length > 0 ? 'available' : 'unavailable',
  };
}

module.exports = {
  getTopLandingPages,
  getVisitorsByDevice,
  normalizeLandingPath,
  DEVICE_LABELS,
};
