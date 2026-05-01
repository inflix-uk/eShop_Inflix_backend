const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
      default: 'INFO',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'google_api',
        'external_api',
        'payment',
        'auth',
        'admin_action',
        'http_error',
        'process_crash',
        'database',
        'cron',
        'email',
        'system',
      ],
      default: 'system',
      index: true,
    },
    action: { type: String, required: true, index: true },
    message: { type: String },
    method: { type: String },
    route: { type: String, index: true },
    statusCode: { type: Number, index: true },
    userId: { type: String, index: true },
    userEmail: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    durationMs: { type: Number },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    errorMessage: { type: String },
    errorName: { type: String },
    errorCode: { type: String },
    stack: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true, expires: 60 * 60 * 24 * 90 },
  },
  { versionKey: false }
);

auditLogSchema.index({ category: 1, level: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
