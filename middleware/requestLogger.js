const requestLogger = (req, res, next) => {
  // Skip logging for health checks and static files
  if (req.path === '/health' || req.path.startsWith('/uploads')) {
    return next();
  }

  const start = Date.now();
  
  // Log request
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  };

  // Only log body in development and for non-GET requests
  if (process.env.NODE_ENV === 'development' && req.method !== 'GET') {
    requestLog.body = req.body;
  }

  // Log response after it's sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    };

    // Color code based on status
    if (res.statusCode >= 500) {
      console.error('[ERROR]', responseLog);
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', responseLog);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[INFO]', responseLog);
    }
  });

  next();
};

module.exports = {
  requestLogger,
};