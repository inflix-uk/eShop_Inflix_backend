// cronjob/cronScheduler.js
const cron = require('node-cron');
const { sendFailedOrderEmails } = require('./failedOrderEmailJob');
const Deal = require('../src/models/deal');

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    console.log('⏰ Initializing cron jobs...');

    // Run failed order email job every day at 10:00 AM
    // Cron pattern: '0 10 * * *' (minute hour day month dayOfWeek)
    const failedOrderEmailJob = cron.schedule('0 10 * * *', async () => {
        console.log('\n🚀 Running failed order email job at:', new Date().toISOString());
        try {
            await sendFailedOrderEmails();
        } catch (error) {
            console.error('❌ Cron job execution error:', error);
        }
    }, {
        scheduled: true,
        timezone: "Europe/London" // Adjust to your timezone
    });

    // Auto-expire past deals every day at 12:05 AM
    const expireDealsJob = cron.schedule('5 0 * * *', async () => {
        try {
            const result = await Deal.updateMany({ isExpired: false, expiryDate: { $ne: null, $lt: new Date() } }, { $set: { isExpired: true } });
            if (result && result.modifiedCount) {
                console.log('✅ Auto-expired deals:', result.modifiedCount);
            }
        } catch (error) {
            console.error('❌ Error auto-expiring deals:', error);
        }
    }, {
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
