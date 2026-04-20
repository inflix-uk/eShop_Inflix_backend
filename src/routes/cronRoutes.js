// routes/cronRoutes.js
const express = require('express');
const router = express.Router();
const { triggerFailedOrderEmailJob } = require('../../cronjob/cronScheduler');

/**
 * Manually trigger the failed order email job
 * GET /api/cron/trigger-failed-order-emails
 *
 * For testing purposes only - should be protected in production
 */
router.get('/trigger-failed-order-emails', async (req, res) => {
    try {
        console.log('🔧 Manual trigger requested for failed order email job');

        const result = await triggerFailedOrderEmailJob();

        res.json({
            success: result.success,
            message: 'Failed order email job executed',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error triggering failed order email job:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger email job',
            error: error.message
        });
    }
});

/**
 * Get cron job status
 * GET /api/cron/status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        message: 'Cron jobs are running',
        jobs: [
            {
                name: 'Failed Order Email Job',
                schedule: 'Daily at 10:00 AM (Europe/London)',
                description: 'Sends recovery emails to users with failed orders after 2 days'
            }
        ],
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
