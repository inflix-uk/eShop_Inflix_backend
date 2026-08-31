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

  // The auditTimer already records that this request ended in a 5xx, but only
  // the status code — the reason dies with the response. Server faults get
  // their own entry carrying the message and stack; 4xx are the client's
  // problem and stay out of the trail. Best-effort, never awaited.
  if (status >= 500) {
    auditLogService.logError({
      action: 'http.unhandled_error',
      category: 'error',
      message: `Unhandled error on ${req.method} ${req.originalUrl || req.url}`,
      req,
      error: err,
      metadata: { status, name: err.name },
    });
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
