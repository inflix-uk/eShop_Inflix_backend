const mongoose = require('mongoose');

const healthCheck = async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    service: 'zexton-backend',
    version: process.env.API_VERSION || 'v1',
    checks: {},
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      healthStatus.checks.database = {
        status: 'connected',
        type: 'mongodb',
      };
    } else {
      healthStatus.checks.database = {
        status: 'disconnected',
        type: 'mongodb',
      };
      healthStatus.status = 'degraded';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthStatus.checks.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    };

    // Check if critical services are available
    healthStatus.checks.services = {
      express: 'running',
      cors: 'enabled',
    };

    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.error = error.message;
    res.status(503).json(healthStatus);
  }
};

const livenessCheck = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};

const readinessCheck = async (req, res) => {
  try {
    // Check if database is ready
    const dbReady = mongoose.connection.readyState === 1;
    
    if (dbReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        reason: 'Database connection not established',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  healthCheck,
  livenessCheck,
  readinessCheck,
};