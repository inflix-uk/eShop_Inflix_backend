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