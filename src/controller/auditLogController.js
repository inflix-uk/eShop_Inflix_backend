const AuditLog = require('../models/auditLog');

const ALLOWED_LEVELS = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];

const auditLogController = {
  /**
   * GET /api/audit-logs
   * Query: level, category, action, route, userId, statusCode, from, to, q, page, limit
   */
  list: async (req, res) => {
    try {
      const {
        level,
        category,
        action,
        route,
        userId,
        statusCode,
        from,
        to,
        q,
        page = 1,
        limit = 50,
      } = req.query;

      const filter = {};
      if (level && ALLOWED_LEVELS.includes(String(level).toUpperCase())) {
        filter.level = String(level).toUpperCase();
      }
      if (category) filter.category = category;
      if (action) filter.action = action;
      if (route) filter.route = { $regex: String(route), $options: 'i' };
      if (userId) filter.userId = userId;
      if (statusCode) filter.statusCode = Number(statusCode);
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }
      if (q) {
        filter.$or = [
          { message: { $regex: String(q), $options: 'i' } },
          { errorMessage: { $regex: String(q), $options: 'i' } },
          { action: { $regex: String(q), $options: 'i' } },
        ];
      }

      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
      const safePage = Math.max(Number(page) || 1, 1);

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: logs,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (error) {
      console.error('Error listing audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/audit-logs/:id
   */
  get: async (req, res) => {
    try {
      const log = await AuditLog.findById(req.params.id).lean();
      if (!log) {
        return res.status(404).json({ success: false, message: 'Audit log not found' });
      }
      res.status(200).json({ success: true, data: log });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit log',
        error: error.message,
      });
    }
  },

  /**
   * GET /api/audit-logs/stats/summary
   * Returns counts grouped by level/category for the last N hours.
   */
  summary: async (req, res) => {
    try {
      const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 24 * 30);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const [byLevel, byCategory, topActions] = await Promise.all([
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$level', count: { $sum: 1 } } },
        ]),
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        AuditLog.aggregate([
          { $match: { createdAt: { $gte: since }, level: { $in: ['ERROR', 'CRITICAL'] } } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),
      ]);

      res.status(200).json({
        success: true,
        windowHours: hours,
        since,
        byLevel,
        byCategory,
        topErrorActions: topActions,
      });
    } catch (error) {
      console.error('Error building audit log summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to build audit log summary',
        error: error.message,
      });
    }
  },
};

module.exports = auditLogController;
