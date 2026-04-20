const reviewEndpoints = [
  '/reviews',
  '/post/product/reviews',
  '/get/all/product/reviews',
  '/update/product/review',
  '/get/reviews',
  '/all/products/and/reviews/details',
];

const reviewsMiddleware = (req, res, next) => {
  // Check if this is a review-related endpoint
  const isReviewEndpoint = reviewEndpoints.some(endpoint => 
    req.path.startsWith(endpoint) || 
    req.originalUrl.startsWith(endpoint)
  );
  
  if (!isReviewEndpoint) {
    return next();
  }

  // Log review requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[REVIEWS] ${req.method} ${req.originalUrl}`);
  }
  
  // Special CORS headers for review endpoints
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Special handling for GET reviews with ID pattern
  if (req.url.includes('/reviews/') && req.method === 'GET') {
    // This appears to be a legacy endpoint that needs special handling
    // You may want to redirect this to the proper endpoint or handle it differently
    console.warn(`[REVIEWS] Legacy endpoint accessed: ${req.url}`);
  }
  
  next();
};

module.exports = {
  reviewsMiddleware,
  reviewEndpoints,
};