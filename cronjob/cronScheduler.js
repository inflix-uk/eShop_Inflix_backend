// cronjob/cronScheduler.js
const cron = require('node-cron');
const { sendFailedOrderEmails } = require('./failedOrderEmailJob');
const Deal = require('../src/models/deal');

// Lazy-loaded so cyclic / model-init issues at cold start cannot break this file.
function safeAuditLog(action, message, error) {
    try {
        const auditLogService = require('../src/services/auditLogService');
        auditLogService.logError({
            action,
            category: 'cron',
            message,
            error,
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
 */
function safeCronHandler(name, fn) {
    return async () => {
        const start = Date.now();
        try {
            await fn();
            console.log(`✅ Cron "${name}" finished in ${Date.now() - start}ms`);
        } catch (error) {
            console.error(`❌ Cron "${name}" failed:`, error && error.message);
            safeAuditLog(`cron.${name}.failed`, `Cron job ${name} failed`, error);
        }
    };
}

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    console.log('⏰ Initializing cron jobs...');

    // Run failed order email job every day at 10:00 AM
    // Cron pattern: '0 10 * * *' (minute hour day month dayOfWeek)
    const failedOrderEmailJob = cron.schedule('0 10 * * *', safeCronHandler('failed_order_emails', async () => {
        console.log('\n🚀 Running failed order email job at:', new Date().toISOString());
        await sendFailedOrderEmails();
    }), {
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
    return await sendFailedOrderEmails();
};

module.exports = {
    initializeCronJobs,
    triggerFailedOrderEmailJob
};
