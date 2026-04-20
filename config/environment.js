const path = require('path');
const fs = require('fs');

class EnvironmentValidator {
  constructor() {
    this.requiredVars = [
      'NODE_ENV',
      'PORT',
    ];
    
    this.optionalVars = [
      'PRERENDER_TOKEN',
      'DATABASE_URL',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'EMAIL_HOST',
      'EMAIL_PORT',
      'EMAIL_USER',
      'EMAIL_PASS',
      'PAYLOAD_LIMIT',
      'REQUEST_TIMEOUT',
      'SERVER_TIMEOUT',
      'SHUTDOWN_TIMEOUT',
      'RATE_LIMIT_WINDOW',
      'RATE_LIMIT_MAX',
      'UPLOADS_DIR',
      'API_VERSION',
      'TRUST_PROXY',
    ];
  }

  validate() {
    const missing = [];
    const warnings = [];
    
    // Check required variables
    this.requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });
    
    // Check optional variables
    this.optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        warnings.push(varName);
      }
    });
    
    // Report missing required variables
    if (missing.length > 0) {
      console.error('╔════════════════════════════════════════════════════╗');
      console.error('║          Missing Required Environment Variables    ║');
      console.error('╠════════════════════════════════════════════════════╣');
      missing.forEach(varName => {
        console.error(`║  ❌ ${varName}`.padEnd(54) + '║');
      });
      console.error('╚════════════════════════════════════════════════════╝');
      
      // In production, exit. In development, continue with defaults
      // Don't exit on Vercel (serverless) - use defaults instead
      if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
        process.exit(1);
      }
    }
    
    // Report warnings for optional variables (only in development)
    if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║         Optional Environment Variables Not Set     ║');
      console.log('╠════════════════════════════════════════════════════╣');
      warnings.forEach(varName => {
        console.log(`║  ⚠️  ${varName}`.padEnd(54) + '║');
      });
      console.log('╚════════════════════════════════════════════════════╝');
    }
    
    return {
      isValid: missing.length === 0,
      missing,
      warnings,
    };
  }
  
  loadEnvFile() {
    const envPath = path.resolve(process.cwd(), '.env');
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    
    // Check if .env exists
    if (!fs.existsSync(envPath)) {
      console.warn('⚠️  No .env file found');
      
      // Check if .env.example exists
      if (fs.existsSync(envExamplePath)) {
        console.log('ℹ️  .env.example file found. Copy it to .env and update values.');
      }
    }
  }
  
  setDefaults() {
    // Set default values for development and Vercel
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = process.env.VERCEL ? 'production' : 'development';
    }
    
    if (!process.env.PORT) {
      process.env.PORT = process.env.VERCEL ? '3000' : '4000';
    }
  }
  
  init() {
    this.loadEnvFile();
    this.setDefaults();
    const validation = this.validate();
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Environment configuration loaded');
    }
    
    return validation;
  }
}

module.exports = new EnvironmentValidator();