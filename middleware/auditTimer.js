const auditLogService = require('../src/services/auditLogService');

// By default EVERY route request is recorded, so per-route hit counts and
// average times are accurate. Set AUDIT_SLOW_ONLY=true to only persist slow
// (> AUDIT_SLOW_MS) or errored requests instead.
const SLOW_ONLY = String(process.env.AUDIT_SLOW_ONLY).toLowerCase() === 'true';
const SLOW_MS = Number(process.env.AUDIT_SLOW_MS) > 0 ? Number(process.env.AUDIT_SLOW_MS) : 800;

// Paths we never persist (noise / probes / static assets).
function isIgnored(path) {
  return (
    path === '/health' ||
    path === '/liveness' ||
    path === '/readiness' ||
    path.startsWith('/uploads')
  );
}

const auditTimer = (req, res, next) => {
  if (isIgnored(req.path)) return next();

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const isError = res.statusCode >= 400;
    const isSlow = durationMs >= SLOW_MS;

    // Default: record every request. Opt-in slow-only mode skips fast successes.
    if (SLOW_ONLY && !isSlow && !isError) return;

    auditLogService.logRequest({
      level: res.statusCode >= 500 ? 'error' : isError ? 'warn' : 'info',
      action: isError ? 'http.request.error' : isSlow ? 'http.request.slow' : 'http.request',
      req,
      statusCode: res.statusCode,
      durationMs,
      message: `${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`,
    }); // best-effort; never await, never throws
  });

  next();
};

module.exports = { auditTimer };
