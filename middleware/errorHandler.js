const auditLogService = require('../src/services/auditLogService');

const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      status: err.status || 500,
      path: req.path,
      method: req.method,
    });
  }

  // Set default error status if not already set
  const status = err.status || err.statusCode || 500;

  // Persist 5xx errors (and selected 4xx) to audit log so we can investigate later.
  // Fire-and-forget — do not block the response on the audit write.
  if (status >= 500) {
    auditLogService
      .logError({
        action: 'http_request_failed',
        category: 'http_error',
        message: err.message || 'Unhandled request error',
        req,
        error: err,
        statusCode: status,
      })
      .catch(() => {});
  } else if (status === 401 || status === 403) {
    auditLogService
      .logWarn({
        action: 'http_request_unauthorized',
        category: 'auth',
        message: err.message,
        req,
        metadata: { statusCode: status },
      })
      .catch(() => {});
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status,
    },
  };

  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error.message = 'Validation Error';
    errorResponse.error.fields = Object.keys(err.errors || {}).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    errorResponse.error.message = 'Duplicate key error';
    errorResponse.error.fields = err.keyPattern;
  }

  if (err.name === 'JsonWebTokenError') {
    errorResponse.error.message = 'Invalid token';
    errorResponse.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error.message = 'Token expired';
    errorResponse.status = 401;
  }

  // Send error response
  res.status(status).json(errorResponse);
};

module.exports = {
  errorHandler,
};
