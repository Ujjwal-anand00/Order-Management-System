const cron = require('node-cron');
const schedulerService = require('../services/schedulerService');

/**
 * Initialize and start the automated cron scheduler job
 */
const startCronScheduler = () => {
  const isEnabled = process.env.SCHEDULER_ENABLED !== 'false';
  const cronExpression = process.env.SCHEDULER_CRON_EXPRESSION || '*/5 * * * *';

  if (!isEnabled) {
    console.log('[Cron Scheduler] Automated scheduler execution is disabled via environment variables.');
    return;
  }

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    console.error(`[Cron Scheduler] Invalid cron expression: '${cronExpression}'. Scheduler not registered.`);
    return;
  }

  // Register cron task
  cron.schedule(cronExpression, async () => {
    console.log('[Cron Scheduler] Automated scheduler run triggered.');
    
    const startTime = Date.now();
    try {
      const result = await schedulerService.runScheduler();
      
      if (result.skipped) {
        console.log(`[Cron Scheduler] Execution skipped: ${result.reason}`);
      } else {
        const duration = Date.now() - startTime;
        console.log(
          `[Cron Scheduler] Execution completed. Status: ${result.status}, Checked: ${result.totalOrdersChecked}, Updated: ${result.totalOrdersUpdated}, Duration: ${duration}ms`
        );
      }
    } catch (err) {
      // Prevent uncaught errors from crashing the Express server
      console.error(`[Cron Scheduler] Exception occurred during execution: ${err.message}`);
    }
  });

  console.log(`[Cron Scheduler] Periodically registered to execute with expression: '${cronExpression}'`);
};

module.exports = {
  startCronScheduler
};
