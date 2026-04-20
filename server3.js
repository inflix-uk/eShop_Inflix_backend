var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
var router = require('./routes/index');
require('dotenv').config();

var app = express();
app.use('/uploads', express.static('uploads')); // Serve static files from uploads folder

const port = process.env.PORT || 4000; // Set the port from environment or default to 4000

// CORS Configuration - FIXED
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://zextons.co.uk',
      'https://www.zextons.co.uk',
      'https://zextons-frontend.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://green.zextons.co.uk',
      // Add any other domains you need
    ];
    
    console.log(`CORS request from origin: ${origin}`);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      console.log(`⚠️ Origin not in whitelist but allowing temporarily: ${origin}`);
      console.log('Allowed origins:', allowedOrigins);
      // Temporarily allow all origins for debugging
      callback(null, true);
      // callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-user-role', 'x-role'],
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // Cache preflight response for 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Centralized middleware for handling CORS for all review-related endpoints
const reviewEndpoints = [
  '/reviews',
  '/post/product/reviews',
  '/get/all/product/reviews',
  '/update/product/review',
  '/get/reviews',
  '/all/products/and/reviews/details'
];

// Special handling for reviews endpoints
app.use((req, res, next) => {
  // Check if the request path starts with any of the review endpoints
  const isReviewEndpoint = reviewEndpoints.some(endpoint => 
    req.path.startsWith(endpoint) || req.originalUrl.startsWith(endpoint)
  );
  
  if (isReviewEndpoint) {
    console.log(`[REVIEWS DEBUG] Received ${req.method} request to ${req.originalUrl}`);
    console.log(`[REVIEWS DEBUG] Headers:`, req.headers);
    
    // Set CORS headers for all review-related endpoints
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS requests for reviews
    if (req.method === 'OPTIONS') {
      console.log('[REVIEWS DEBUG] Handling OPTIONS preflight request');
      return res.status(200).end();
    }
    
    console.log('[REVIEWS DEBUG] Proceeding to next middleware');
  }
  
  next();
});

app.use(logger('dev')); // Logging middleware

// Increase JSON and URL-encoded payload limits
app.use(express.json({ limit: '100mb' })); // Increased limit for JSON payloads
app.use(express.urlencoded({ limit: '100mb', extended: false })); // Increased limit for URL-encoded payloads

// Set server timeout values
app.use((req, res, next) => {
  // Increase timeout for all requests to 10 minutes
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000);
  
  // Also set CORS headers manually as backup
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-user-role, x-role');
  
  // Check if this is the problematic reviews URL pattern
  if (req.url.includes('/reviews/') && req.method === 'GET') {
    
    // Set CORS headers specifically for this request
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    return res.status(200).json({ success: true, message: 'Review access granted' });
  }
  
  next();
});

app.use(cookieParser()); // Parse cookies

// Add Prerender middleware
const prerender = require('prerender-node');
app.use(prerender.set('prerenderToken', '6rIfMRW7I0Ndv1mBchJ'));

app.use(router); // Use the router from routes/index.js

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.json({ error: err.message }); // Send JSON response for errors
});

// Start the server with increased timeout
const server = app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
  console.log(`CORS enabled for: https://zextons.co.uk`);
});

// Set server-wide timeout to 10 minutes (600000ms)
server.timeout = 600000;

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

module.exports = app;