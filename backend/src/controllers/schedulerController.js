const schedulerService = require('../services/schedulerService');
const { sendSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller to trigger the Scheduler run manually or via cron
 */
const runScheduler = asyncHandler(async (req, res) => {
  const result = await schedulerService.runScheduler();
  
  if (result.skipped) {
    return sendSuccess(
      res, 
      HTTP_STATUS.OK, 
      {
        totalOrdersChecked: 0,
        totalOrdersUpdated: 0,
        durationMs: 0,
        status: 'SKIPPED',
        reason: result.reason
      }, 
      'Scheduler execution skipped: another job is running'
    );
  }

  sendSuccess(
    res,
    HTTP_STATUS.OK,
    {
      totalOrdersChecked: result.totalOrdersChecked,
      totalOrdersUpdated: result.totalOrdersUpdated,
      durationMs: result.durationMs,
      status: result.status
    },
    'Scheduler execution completed successfully'
  );
});

module.exports = {
  runScheduler
};
