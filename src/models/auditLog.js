const mongoose = require('mongoose');

// Audit logs are kept PERMANENTLY by default — nothing auto-deletes them.
// Auto-expiry is strictly opt-in: set AUDIT_LOG_TTL_DAYS to a positive number
// only if you ever want MongoDB to purge entries older than that many days.
const TTL_DAYS = Number(process.env.AUDIT_LOG_TTL_DAYS);
const TTL_ENABLED = Number.isFinite(TTL_DAYS) && TTL_DAYS > 0;
const TTL_SECONDS = TTL_ENABLED ? TTL_DAYS * 24 * 60 * 60 : null;

const auditLogSchema = new mongoose.Schema(
  {
    // Severity — also drives how the entry is treated by alerting later.
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'critical'],
      default: 'info',
      index: true,
    },
    // Dot-namespaced action, e.g. 'stripe.webhook.payment_intent_succeeded_failed'
    action: { type: String, index: true },
    // Coarse bucket: 'request' | 'database' | 'cron' | 'payment' | ...
    category: { type: String, index: true },
    message: { type: String },

    // ---- Performance / "what is taking how much time" ----
    method: { type: String },
    route: { type: String, index: true }, // originalUrl or matched route
    statusCode: { type: Number, index: true },
    durationMs: { type: Number, index: true },

    // ---- Who / where ----
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String },
    ip: { type: String },
    userAgent: { type: String },

    // Arbitrary structured context (paymentIntentId, orderNumber, ids, etc.)
    metadata: { type: mongoose.Schema.Types.Mixed },

    // Captured error details (best-effort, stack truncated by the service)
    error: {
      name: { type: String },
      message: { type: String },
      stack: { type: String },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Index createdAt for time-range queries. Logs are retained permanently;
// a TTL is only attached if AUDIT_LOG_TTL_DAYS was explicitly set.
if (TTL_ENABLED) {
  auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS });
} else {
  auditLogSchema.index({ createdAt: -1 });
}

// Common dashboard query: slowest endpoints in a window.
auditLogSchema.index({ category: 1, durationMs: -1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
