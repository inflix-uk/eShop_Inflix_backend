const AuditLog = require('../models/auditLog');

// GET /audit-logs
// Filterable, paginated list. Query params:
//   level, category, action, route (regex), minDuration, statusCode
//   page (default 1), limit (default 50, max 200)
const getAuditLogs = async (req, res) => {
  try {
    const { level, category, action, route, minDuration, statusCode } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const filter = {};
    if (level) filter.level = level;
    if (category) filter.category = category;
    if (action) filter.action = action;
    if (statusCode) filter.statusCode = Number(statusCode);
    if (route) filter.route = { $regex: String(route), $options: 'i' };
    if (minDuration) filter.durationMs = { $gte: Number(minDuration) };

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: items,
    });
  } catch (error) {
    console.error('[auditLogController.getAuditLogs]', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
};

// GET /audit-logs/slowest
// Aggregated view: routes grouped with hit count, average and worst-case time.
// Query params:
//   hours  - lookback window (default 24)
//   limit  - max rows (default 20)
//   sort   - 'avg' (default) | 'count' | 'max'  -> which column to order by, desc
const getSlowestRoutes = async (req, res) => {
  try {
    const hours = Math.min(720, Math.max(1, parseInt(req.query.hours, 10) || 24));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sortKey = ['count', 'max', 'avg'].includes(req.query.sort) ? req.query.sort : 'avg';
    const sortStage =
      sortKey === 'count' ? { count: -1 } : sortKey === 'max' ? { maxMs: -1 } : { avgMs: -1 };
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const rows = await AuditLog.aggregate([
      { $match: { category: 'request', durationMs: { $ne: null }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { route: '$route', method: '$method' },
          count: { $sum: 1 },
          avgMs: { $avg: '$durationMs' },
          maxMs: { $max: '$durationMs' },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
        },
      },
      { $sort: sortStage },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          route: '$_id.route',
          method: '$_id.method',
          count: 1,
          avgMs: { $round: ['$avgMs', 0] },
          maxMs: 1,
          errors: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, windowHours: hours, data: rows });
  } catch (error) {
    console.error('[auditLogController.getSlowestRoutes]', error);
    return res.status(500).json({ success: false, error: 'Failed to aggregate audit logs' });
  }
};

module.exports = { getAuditLogs, getSlowestRoutes };
