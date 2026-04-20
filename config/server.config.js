const serverConfig = {
  // Port configuration
  port: process.env.PORT || 4000,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Logging
  logLevel: process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  
  // Request limits
  payloadLimit: process.env.PAYLOAD_LIMIT || '100mb',
  
  // Timeouts (in milliseconds)
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 600000, // 10 minutes
  serverTimeout: parseInt(process.env.SERVER_TIMEOUT) || 600000,   // 10 minutes
  shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000, // 30 seconds
  
  // Security
  trustProxy: process.env.TRUST_PROXY === 'true' || false,
  
  // Static files
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  
  // API versioning
  apiVersion: process.env.API_VERSION || 'v1',
  
  // Rate limiting (if needed in future)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  },
};

// Validate required configurations
const validateConfig = () => {
  const errors = [];
  
  if (!serverConfig.port) {
    errors.push('PORT is not configured');
  }
  
  if (serverConfig.port < 1 || serverConfig.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  if (serverConfig.requestTimeout < 1000) {
    errors.push('REQUEST_TIMEOUT must be at least 1000ms');
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
};

// Run validation on module load
validateConfig();

module.exports = {
  serverConfig,
};