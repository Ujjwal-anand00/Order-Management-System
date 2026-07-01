const Order = require('../models/order');
const OrderStatusHistory = require('../models/orderStatusHistory');
const SchedulerLog = require('../models/schedulerLog');
const { ORDER_STATUS, SCHEDULER_STATUS } = require('../utils/constants');
const AppError = require('../utils/appError');

/**
 * Execute the scheduler job to progress orders automatically based on time thresholds
 * @returns {Promise<Object>} Execution summary results
 */
const runScheduler = async () => {
  const startTime = new Date();
  
  // 1. Race Condition Prevention - Active Run Lock
  // Look for any job started in the last 5 minutes that has not completed (endTime set to epoch 1970)
  const activeJob = await SchedulerLog.findOne({
    endTime: new Date(0),
    startTime: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
  });

  if (activeJob) {
    return {
      skipped: true,
      reason: 'Another scheduler job is currently running',
      totalOrdersChecked: 0,
      totalOrdersUpdated: 0,
      durationMs: 0
    };
  }

  // 2. Register/Create log with "RUNNING" state (endTime = epoch, status = FAILED as fallback)
  const log = new SchedulerLog({
    startTime,
    endTime: new Date(0),
    status: SCHEDULER_STATUS.FAILED,
    totalOrdersChecked: 0,
    totalOrdersUpdated: 0
  });
  await log.save();

  let totalChecked = 0;
  let totalUpdated = 0;
  let isSuccess = true;
  let overallErrorMsg = '';

  try {
    // 3. Fetch eligible orders (only PLACED and PROCESSING statuses)
    const eligibleOrders = await Order.find({
      currentOrderStatus: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.PROCESSING] }
    });

    const now = Date.now();

    // 4. Evaluate and update each order
    for (const order of eligibleOrders) {
      totalChecked++;
      try {
        let targetStatus = null;
        let changeReason = '';
        
        // Calculate age relative to last status change (updatedAt)
        const ageMs = now - new Date(order.updatedAt).getTime();

        if (order.currentOrderStatus === ORDER_STATUS.PLACED) {
          // PLACED -> PROCESSING after 10 minutes (10 * 60 * 1000 ms)
          if (ageMs >= 10 * 60 * 1000) {
            targetStatus = ORDER_STATUS.PROCESSING;
            changeReason = 'Automatic status progression: PLACED to PROCESSING after 10 minutes';
          }
        } else if (order.currentOrderStatus === ORDER_STATUS.PROCESSING) {
          // PROCESSING -> READY_TO_SHIP after 20 minutes (20 * 60 * 1000 ms)
          if (ageMs >= 20 * 60 * 1000) {
            targetStatus = ORDER_STATUS.READY_TO_SHIP;
            changeReason = 'Automatic status progression: PROCESSING to READY_TO_SHIP after 20 minutes';
          }
        }

        if (targetStatus) {
          const previousStatus = order.currentOrderStatus;

          // 5. Race Condition Prevention - Optimistic Concurrency Update
          // Query with current status and updatedAt to ensure it hasn't modified concurrently
          const updatedOrder = await Order.findOneAndUpdate(
            {
              _id: order._id,
              currentOrderStatus: previousStatus,
              updatedAt: order.updatedAt
            },
            {
              $set: { currentOrderStatus: targetStatus }
            },
            { new: true }
          );

          if (updatedOrder) {
            totalUpdated++;

            // Create status history record
            const history = new OrderStatusHistory({
              orderRef: order._id,
              previousStatus,
              newStatus: targetStatus,
              changedBy: 'SCHEDULER',
              changeReason,
              changedAt: new Date()
            });
            await history.save();
          }
        }
      } catch (orderError) {
        // Handle individual order failure gracefully; let the scheduler continue
        console.error(`Scheduler failed to update Order ID ${order.orderId}:`, orderError.message);
      }
    }
  } catch (err) {
    isSuccess = false;
    overallErrorMsg = err.message;
    console.error('Scheduler main loop failed:', err);
  } finally {
    // 6. Complete and save execution log
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    log.endTime = endTime;
    log.status = isSuccess && !overallErrorMsg ? SCHEDULER_STATUS.SUCCESS : SCHEDULER_STATUS.FAILED;
    log.totalOrdersChecked = totalChecked;
    log.totalOrdersUpdated = totalUpdated;
    if (overallErrorMsg) {
      log.errorMessage = overallErrorMsg;
    }
    await log.save();

    return {
      skipped: false,
      totalOrdersChecked: totalChecked,
      totalOrdersUpdated: totalUpdated,
      status: log.status,
      durationMs,
      ...(overallErrorMsg && { error: overallErrorMsg })
    };
  }
};

module.exports = {
  runScheduler
};
