const mongoose = require('mongoose');

const resolveMongoUri = () => {
    const candidates = [process.env.MONGO_URI, process.env.DATABASE_URL]
        .filter((value) => typeof value === 'string' && value.trim().length > 0);

    for (const rawValue of candidates) {
        let value = rawValue.trim();
        // Handle accidental wrapping quotes in env values.
        value = value.replace(/^['"]|['"]$/g, '');
        // Handle accidental "MONGO_URI=..." paste into env value.
        value = value.replace(/^MONGO_URI=/i, '').trim();
        // Handle accidental "DATABASE_URL=..." paste into env value.
        value = value.replace(/^DATABASE_URL=/i, '').trim();

        if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) {
            return value;
        }
    }

    return null;
};

const MONGO_URI = resolveMongoUri();

if (!MONGO_URI) {
    console.error(
        '❌ MongoDB Connection Error: Missing or invalid MONGO_URI/DATABASE_URL. ' +
        'Connection string must start with "mongodb://" or "mongodb+srv://".'
    );
    process.exit(1);
}

// Reconnect tuning — capped exponential backoff between attempts when the
// connection drops mid-runtime (network blip, Atlas maintenance, IP allowlist
// change). Mongoose's driver has its own retry layer for in-flight ops, but on
// a sustained outage we want to keep trying and surface state to the audit log
// so operators can see what happened.
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
let reconnectAttempts = 0;
let reconnectTimer = null;

const connectOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
};

// Lazy require so a circular reference can't break startup. The audit log
// service depends on a Mongoose model — by the time we'd actually call this,
// the connection has either succeeded once (so the model is registered) or
// failed and we don't need it.
function safeAuditLog(level, action, message, error) {
    try {
        const auditLogService = require('../src/services/auditLogService');
        const fn = level === 'critical' ? 'logCritical' : 'logError';
        if (auditLogService && typeof auditLogService[fn] === 'function') {
            auditLogService[fn]({ action, category: 'database', message, error }).catch(() => {});
        }
    } catch (_) {
        // Audit logging is best-effort — never let it break DB recovery.
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
    reconnectAttempts += 1;
    console.log(`🔄 Scheduling MongoDB reconnect attempt #${reconnectAttempts} in ${delay}ms`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        mongoose.connect(MONGO_URI, connectOptions).catch((err) => {
            console.error(`❌ MongoDB reconnect attempt #${reconnectAttempts} failed:`, err.message);
            safeAuditLog('error', 'database.reconnect_failed', `Reconnect attempt #${reconnectAttempts} failed`, err);
            scheduleReconnect();
        });
    }, delay);
}

mongoose.connect(MONGO_URI, connectOptions)
    .then(() => {
        console.log(`✅ Connected to MongoDB Database: ${mongoose.connection.name}`);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        safeAuditLog('critical', 'database.initial_connection_failed', 'Initial MongoDB connection failed', err);
        // Initial connection failure is fatal — the app cannot serve traffic without DB.
        process.exit(1);
    });

mongoose.connection.on('connected', () => {
    if (reconnectAttempts > 0) {
        console.log(`✅ MongoDB reconnected after ${reconnectAttempts} attempt(s)`);
        safeAuditLog('error', 'database.reconnected', `Reconnected after ${reconnectAttempts} attempt(s)`);
    }
    reconnectAttempts = 0;
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected — attempting recovery');
    safeAuditLog('error', 'database.disconnected', 'MongoDB connection dropped');
    scheduleReconnect();
});

mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Connection Error (Runtime):', err.message);
    safeAuditLog('error', 'database.runtime_error', err.message, err);
});

module.exports = mongoose;
