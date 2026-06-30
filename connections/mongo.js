const mongoose = require('mongoose');

const resolveMongoUri = () => {
    const candidates = [process.env.MONGO_URI, process.env.DATABASE_URL]
        .filter((value) => typeof value === 'string' && value.trim().length > 0);

    for (const rawValue of candidates) {
        let value = rawValue.trim();
        value = value.replace(/^['"]|['"]$/g, '');
        value = value.replace(/^MONGO_URI=/i, '').trim();
        value = value.replace(/^DATABASE_URL=/i, '').trim();

        if (value.startsWith('mongodb://') || value.startsWith('mongodb+srv://')) {
            return value;
        }
    }

    return null;
};

/** Single-host remote Mongo (custom port / Docker publish) needs directConnection. */
function normalizeMongoUri(uri) {
    if (!uri || uri.startsWith('mongodb+srv://')) return uri;

    try {
        const parsed = new URL(uri.replace(/^mongodb:\/\//, 'http://'));
        const isSingleHost = !parsed.hostname.includes(',');
        if (!isSingleHost) return uri;

        const params = parsed.searchParams;
        if (!params.has('directConnection')) {
            params.set('directConnection', 'true');
        }
        const auth =
            parsed.username && parsed.password
                ? `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}@`
                : parsed.username
                  ? `${decodeURIComponent(parsed.username)}@`
                  : '';
        const dbPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
        const query = params.toString();
        return `mongodb://${auth}${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${dbPath}${query ? `?${query}` : ''}`;
    } catch {
        return uri.includes('directConnection=')
            ? uri
            : `${uri}${uri.includes('?') ? '&' : '?'}directConnection=true`;
    }
}

const MONGO_URI = normalizeMongoUri(resolveMongoUri());

if (!MONGO_URI) {
    console.error(
        '❌ MongoDB Connection Error: Missing or invalid MONGO_URI/DATABASE_URL. ' +
        'Connection string must start with "mongodb://" or "mongodb+srv://".'
    );
    process.exit(1);
}

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;
let reconnectAttempts = 0;
let reconnectTimer = null;
let initialConnectPending = true;

const connectOptions = {
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    directConnection: true,
    family: 4,
};

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

function logConnectionTarget() {
    try {
        const parsed = new URL(MONGO_URI.replace(/^mongodb:\/\//, 'http://'));
        const dbName = (parsed.pathname || '').replace(/^\//, '') || '(default)';
        console.log(
            `🔌 MongoDB target: ${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}/${dbName}`
        );
    } catch {
        console.log('🔌 MongoDB connection starting…');
    }
}

function scheduleReconnect(reason) {
    if (reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
    reconnectAttempts += 1;
    const label = reason === 'initial' ? 'initial connection' : 'reconnect';
    console.log(`🔄 Scheduling MongoDB ${label} attempt #${reconnectAttempts} in ${delay}ms`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        attemptConnect(reason).catch(() => {
            scheduleReconnect(reason);
        });
    }, delay);
}

function attemptConnect(reason = 'reconnect') {
    return mongoose.connect(MONGO_URI, connectOptions).catch((err) => {
        const prefix =
            reason === 'initial'
                ? '❌ MongoDB initial connection failed'
                : `❌ MongoDB reconnect attempt #${reconnectAttempts} failed`;
        console.error(`${prefix}:`, err.message);
        if (reason === 'initial') {
            console.warn(
                '⚠️  API will return errors until MongoDB is reachable. ' +
                'Check MONGO_URI, server status, and IP allowlist — server stays up and will keep retrying.'
            );
            safeAuditLog(
                'critical',
                'database.initial_connection_failed',
                'Initial MongoDB connection failed',
                err
            );
        } else {
            safeAuditLog(
                'error',
                'database.reconnect_failed',
                `Reconnect attempt #${reconnectAttempts} failed`,
                err
            );
        }
        throw err;
    });
}

logConnectionTarget();
attemptConnect('initial').catch(() => {
    scheduleReconnect('initial');
});

mongoose.connection.on('connected', () => {
    initialConnectPending = false;
    if (reconnectAttempts > 0) {
        console.log(`✅ MongoDB reconnected after ${reconnectAttempts} attempt(s)`);
        safeAuditLog('error', 'database.reconnected', `Reconnected after ${reconnectAttempts} attempt(s)`);
    } else {
        console.log(`✅ Connected to MongoDB Database: ${mongoose.connection.name}`);
    }
    reconnectAttempts = 0;
});

mongoose.connection.on('disconnected', () => {
    if (initialConnectPending) return;
    console.warn('⚠️ MongoDB disconnected — attempting recovery');
    safeAuditLog('error', 'database.disconnected', 'MongoDB connection dropped');
    scheduleReconnect('reconnect');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Connection Error (Runtime):', err.message);
    safeAuditLog('error', 'database.runtime_error', err.message, err);
});

module.exports = mongoose;
