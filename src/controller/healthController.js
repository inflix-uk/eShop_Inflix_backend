const mongoose = require('mongoose');

/**
 * Optional DB signal for operators. Never changes HTTP status — /health is always 200
 * when this process is serving requests.
 */
function getDbStatus() {
  try {
    const state = mongoose.connection.readyState;
    // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    if (state === 1) return 'up';
    if (state === 2) return 'connecting';
    return 'down';
  } catch {
    return 'down';
  }
}

/**
 * GET /health — liveness only. No DB or external I/O required for the response.
 */
const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: getDbStatus(),
  });
};

module.exports = {
  getHealth,
};
