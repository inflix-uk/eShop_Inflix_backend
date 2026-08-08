const express = require('express');
const createError = require('http-errors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const prerender = require('prerender-node');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
require('dotenv').config();

// Validate environment variables
const environmentValidator = require('./config/environment');
environmentValidator.init();

// Register the global Mongoose audit plugin BEFORE any model is compiled
// (the routes require below pulls in every model). This gives every schema
// automatic before/after change tracking into the AuditLog collection.
const mongoose = require('mongoose');
const auditPlugin = require('./src/audit/mongooseAuditPlugin');
mongoose.plugin(auditPlugin);

// Verify Stripe keys match on startup (env keys only — runtime may use DB unless STRIPE_USE_ENV_KEYS)
const verifyStripeKeys = () => {
  const useEnv = ['true', '1', 'yes'].includes(
    String(process.env.STRIPE_USE_ENV_KEYS || '').trim().toLowerCase()
  );
  const pk = process.env.STRIPE_PUBLISHABLE_KEY;
  const sk = process.env.STRIPE_SECRET_KEY;

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║              Stripe Configuration Check            ║');
  console.log('╠════════════════════════════════════════════════════╣');
  console.log(
    `║  STRIPE_USE_ENV_KEYS: ${useEnv ? 'ON (force .env)' : 'OFF (DB preferred)'}`.padEnd(54) + '║'
  );

  if (!pk || !sk) {
    console.log('║  ⚠️ .env Stripe keys not fully configured'.padEnd(54) + '║');
    console.log('╚════════════════════════════════════════════════════╝');
    return;
  }

  const mode = pk.startsWith('pk_test_') ? 'TEST' : pk.startsWith('pk_live_') ? 'LIVE' : 'UNKNOWN';
  const pkAccountId = pk.substring(8, 25);
  const skAccountId = sk.substring(8, 25);

  console.log(`║  .env Mode: ${mode}`.padEnd(54) + '║');
  console.log(`║  Publishable Key: ${pk.substring(0, 20)}...`.padEnd(54) + '║');
  console.log(`║  Secret Key: ${sk.substring(0, 20)}...`.padEnd(54) + '║');
  console.log(`║  PK Account ID: ${pkAccountId}`.padEnd(54) + '║');
  console.log(`║  SK Account ID: ${skAccountId}`.padEnd(54) + '║');

  if (pkAccountId === skAccountId) {
    console.log('║  Status: ✅ Keys are from the same Stripe account  ║');
  } else {
    console.log('║  Status: ❌ KEYS FROM DIFFERENT ACCOUNTS!          ║');
  }
  console.log('╚════════════════════════════════════════════════════╝');
};

verifyStripeKeys();

const router = require('./src/routes/index');
const { corsConfig, allowedOrigins } = require('./config/cors.config');
const { serverConfig } = require('./config/server.config');
const { errorHandler } = require('./middleware/errorHandler');
const { reviewsMiddleware } = require('./middleware/reviewsMiddleware');
const { requestLogger } = require('./middleware/requestLogger');
const { auditTimer } = require('./middleware/auditTimer');
const { auditContext } = require('./middleware/auditContext');
const { securityHeaders } = require('./middleware/securityHeaders');
const { healthCheck, livenessCheck, readinessCheck } = require('./middleware/healthCheck');
const { initializeCronJobs } = require('./cronjob/cronScheduler');
const { initVisitorSocketHandler } = require('./socket/visitorSocketHandler');

// Process-level safety net — log crashes/unhandled rejections so the backend
// stays observable even when something blows up outside of any try/catch.
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  console.error('💥 Unhandled promise rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err);
});

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || serverConfig.port; // Use PORT from environment for Vercel
    this.httpServer = http.createServer(this.app);
    this.io = null;

    this.initializeMiddleware();
    this.initializeSocketIO();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeSocketIO() {
    // Skip Socket.IO initialization on Vercel (serverless doesn't support persistent connections)
    if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
      console.log('⚠️ Socket.IO disabled on Vercel (serverless environment)');
      return;
    }

    // Socket.IO must allow the same browser origins as the REST API (ADMINPANEL_URL / FRONTEND_URL)
    // plus legacy hosts. A hardcoded list alone breaks real-time admin chat on new domains
    // (e.g. admin.aromadesire.com) while axios requests still work via Express cors.
    const legacySocketOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      ...String(process.env.SOCKET_LEGACY_ORIGINS || process.env.CORS_EXTRA_ORIGINS || '')
        .split(',')
        .map((s) => s.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ];
    const socketCorsOrigins = [
      ...new Set([...(allowedOrigins || []), ...legacySocketOrigins]),
    ].filter(Boolean);

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: socketCorsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Make io instance globally accessible
    global.io = this.io;

    // Also attach to Express app for access via req.app.get('io')
    this.app.set('io', this.io);

    // Socket event handlers
    this.io.on('connection', (socket) => {
      console.log(`✅ Socket connected: ${socket.id}`);

      // Join user to their personal room
      socket.on('join', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined room: user:${userId}`);
      });

      // Join conversation room
      socket.on('join-conversation', ({ userId, orderId }) => {
        const room = orderId && orderId !== 'general'
          ? `conversation:${userId}:${orderId}`
          : `conversation:${userId}:general`;
        socket.join(room);
        console.log(`💬 User joined conversation room: ${room}`);
      });

      // Leave conversation room
      socket.on('leave-conversation', ({ userId, orderId }) => {
        const room = orderId && orderId !== 'general'
          ? `conversation:${userId}:${orderId}`
          : `conversation:${userId}:general`;
        socket.leave(room);
        console.log(`👋 User left conversation room: ${room}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
      });
    });

    console.log('🔌 Socket.IO initialized');

    // Initialize visitor chat socket handler
    initVisitorSocketHandler(this.io);
  }

  initializeMiddleware() {
    if (serverConfig.trustProxy) {
      this.app.set('trust proxy', serverConfig.trustProxy);
    }

    // Security headers
    this.app.use(securityHeaders);

    // CORS configuration
    this.app.use(cors(corsConfig));
    this.app.options('*', cors(corsConfig));

    // Audit context — makes "who is doing this" (userId/role/ip/route) available
    // to the Mongoose audit plugin for every DB write during this request.
    // Must run before any route handler that writes to the database.
    this.app.use(auditContext);

    // Request logging
    this.app.use(requestLogger);

    // Audit timing — persists slow / errored requests to the AuditLog collection
    this.app.use(auditTimer);

    // Morgan logging
    this.app.use(logger(serverConfig.logLevel));

    // Stripe Webhook - MUST be before express.json() to get raw body
    // This route needs raw body for signature verification
    const paymentsController = require('./src/controller/paymentsController');
    this.app.post('/webhook/stripe',
      express.raw({ type: 'application/json' }),
      paymentsController.stripeWebhook
    );
    // Alias route for /webhooks/stripe (with 's') - for backward compatibility
    this.app.post('/webhooks/stripe',
      express.raw({ type: 'application/json' }),
      paymentsController.stripeWebhook
    );

    // Body parsing with increased limits
    this.app.use(express.json({ limit: serverConfig.payloadLimit }));
    this.app.use(express.urlencoded({
      limit: serverConfig.payloadLimit,
      extended: false
    }));
    
    // Cookie parser
    this.app.use(cookieParser());
    
    // Garage/S3 media (before local static — streams from bucket when not on disk)
    const { garageMediaProxy } = require('./src/middleware/garageMediaProxy');
    this.app.use('/uploads', garageMediaProxy);
    this.app.use('/uploads', express.static('uploads'));
    
    // Request timeout configuration
    this.app.use(this.configureRequestTimeout);
    
    // Reviews-specific middleware
    this.app.use(reviewsMiddleware);
    
    // Prerender for SEO
    if (process.env.PRERENDER_TOKEN) {
      this.app.use(
        prerender.set('prerenderToken', process.env.PRERENDER_TOKEN)
      );
    }
  }

  configureRequestTimeout(req, res, next) {
    // Set timeout for all requests
    req.setTimeout(serverConfig.requestTimeout);
    res.setTimeout(serverConfig.requestTimeout);
    next();
  }

  initializeRoutes() {
    // Welcome message for root route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        status: 'success',
        message: '🚀 Welcome to Backend API!',
        documentation: 'Please refer to the API documentation for available endpoints',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Health check endpoints
    this.app.get('/health', healthCheck);
    this.app.get('/liveness', livenessCheck);
    this.app.get('/readiness', readinessCheck);
    
    // API routes - prefix with /api
    this.app.use('/', router);
    
    // 404 handler
    this.app.use((req, res, next) => {
      next(createError(404, 'Resource not found'));
    });
  }

  initializeErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    // Don't start HTTP server on Vercel (serverless)
    if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
      console.log('🚀 Running on Vercel (serverless mode)');
      return;
    }

    const { preloadGarageServerIp } = require('./src/utils/s3Config');
    await preloadGarageServerIp();

    this.httpServer.listen(this.port, () => {
      console.log('╔════════════════════════════════════════════════════╗');
      console.log('║           Server Started Successfully              ║');
      console.log('╠════════════════════════════════════════════════════╣');
      console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}`.padEnd(54) + '║');
      console.log(`║  Port: ${this.port}`.padEnd(54) + '║');
      console.log(`║  URL: http://localhost:${this.port}`.padEnd(54) + '║');
      console.log('║  CORS: Enabled                                     ║');
      console.log('║  Socket.IO: Enabled                                ║');
      console.log('╚════════════════════════════════════════════════════╝');

      // Initialize cron jobs
      // console.log('\n');
      // initializeCronJobs();
      // console.log('\n');
    });

    // Server configuration
    this.httpServer.timeout = serverConfig.serverTimeout;

    // Error handling
    this.httpServer.on('error', this.handleServerError.bind(this));

    // Graceful shutdown
    this.setupGracefulShutdown();
  }

  handleServerError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof this.port === 'string'
      ? `Pipe ${this.port}`
      : `Port ${this.port}`;

    switch (error.code) {
      case 'EACCES':
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Close Socket.IO connections
      if (this.io) {
        this.io.close(() => {
          console.log('Socket.IO server closed.');
        });
      }

      // Close HTTP server
      this.httpServer.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });

      // Force close after timeout
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, serverConfig.shutdownTimeout);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Create server instance
const server = new Server();

// Start the server if this file is run directly (not required)
if (require.main === module) {
  server.start();
}

// Export the Express app for Vercel
module.exports = server.app;