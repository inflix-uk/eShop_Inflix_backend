// cronjob/cronScheduler.js
const cron = require('node-cron');
const { sendFailedOrderEmails } = require('./failedOrderEmailJob');
const Deal = require('../src/models/deal');

// Lazy-loaded so cyclic / model-init issues at cold start cannot break this file.
function safeAuditLog(level, action, message, extra = {}) {
    try {
        const auditLogService = require('../src/services/auditLogService');
        const fn = level === 'error' ? 'logError' : 'logInfo';
        auditLogService[fn]({
            action,
            category: 'cron',
            message,
            // Cron runs outside any request, so there is no route to key on.
            // Info-level entries have to say so explicitly; failures already do.
            allowNoRoute: true,
            ...extra,
        }).catch(() => {});
    } catch (_) {
        // Audit logging is best-effort; never let it interfere with the cron loop.
    }
}
/**
 * Wrap a cron callback so any failure (sync or async) is caught, logged, and
 * never escapes to become an uncaughtException. Each scheduled job MUST go
 * through this — otherwise a thrown Error inside an async cron handler is an
 * unhandledRejection that can take the process down.
 *
 * Both outcomes are recorded. A job that silently stops running looks exactly
 * like a job that never had anything to do unless successful runs are logged
 * too, so "did the nightly job actually fire?" stays answerable.
 */
function safeCronHandler(name, fn) {
    // node-cron calls the handler with its own execution context object, so a
    // plain default parameter would be shadowed by it. Only an explicit string
    // (passed by the manual trigger) counts as a trigger label.
    return async (triggerArg) => {
        const trigger = typeof triggerArg === 'string' ? triggerArg : 'schedule';
        const start = Date.now();
        try {
            const result = await fn();
            const durationMs = Date.now() - start;
            console.log(`✅ Cron "${name}" finished in ${durationMs}ms`);
            safeAuditLog('info', `cron.${name}.succeeded`, `Cron job ${name} finished`, {
                durationMs,
                metadata: { job: name, trigger, result: summarizeResult(result) },
            });
            return result;
        } catch (error) {
            const durationMs = Date.now() - start;
            console.error(`❌ Cron "${name}" failed:`, error && error.message);
            safeAuditLog('error', `cron.${name}.failed`, `Cron job ${name} failed`, {
                error,
                durationMs,
                metadata: { job: name, trigger },
            });
            // Deliberately swallowed: a throw here becomes an unhandled
            // rejection inside node-cron and can take the process down.
        }
    };
}

/** Keep whatever a job returns small enough to store next to the entry. */
function summarizeResult(result) {
    if (result == null || typeof result !== 'object') return result ?? null;
    const out = {};
    for (const [k, v] of Object.entries(result)) {
        if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
        else if (Array.isArray(v)) out[`${k}Count`] = v.length;
    }
    return out;
}

/**
 * The failed-order email run, wrapped once so the scheduled run and the manual
 * trigger share the same error handling and land in the same audit trail.
 */
const runFailedOrderEmails = safeCronHandler('failed_order_emails', async () => {
    console.log('\n🚀 Running failed order email job at:', new Date().toISOString());
    return await sendFailedOrderEmails();
});

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    console.log('⏰ Initializing cron jobs...');

    // Run failed order email job every day at 10:00 AM
    // Cron pattern: '0 10 * * *' (minute hour day month dayOfWeek)
    const failedOrderEmailJob = cron.schedule('0 10 * * *', runFailedOrderEmails, {
        scheduled: true,
        timezone: "Europe/London"
    });

    // Auto-expire past deals every day at 12:05 AM
    const expireDealsJob = cron.schedule('5 0 * * *', safeCronHandler('expire_deals', async () => {
        const result = await Deal.updateMany(
            { isExpired: false, expiryDate: { $ne: null, $lt: new Date() } },
            { $set: { isExpired: true } }
        );
        if (result && result.modifiedCount) {
            console.log('✅ Auto-expired deals:', result.modifiedCount);
        }
        // Returned so the audit entry records how many deals actually expired.
        return { expired: result?.modifiedCount || 0 };
    }), {
        scheduled: true,
        timezone: "Europe/London"
    });

    console.log('✅ Cron jobs initialized successfully');
    console.log('   📧 Failed Order Email Job: Daily at 10:00 AM (Europe/London)');

    // Optional: Run immediately on server start (for testing)
    // Uncomment the line below to run the job when server starts
    // sendFailedOrderEmails();

    return {
        failedOrderEmailJob,
        expireDealsJob
    };
};

/**
 * Manually trigger failed order email job (for testing)
 */
const triggerFailedOrderEmailJob = async () => {
    console.log('🔧 Manually triggering failed order email job...');
    // 'manual' distinguishes an admin-pressed run from the nightly schedule.
    return await runFailedOrderEmails('manual');
};

module.exports = {
    initializeCronJobs,
    triggerFailedOrderEmailJob
};
