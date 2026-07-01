const assert = require('assert');
const mongoose = require('mongoose');

// Mock Mongoose models BEFORE requiring other modules
const Order = require('../models/order');
const SchedulerLog = require('../models/schedulerLog');
const OrderStatusHistory = require('../models/orderStatusHistory');

let mockOrders = [];
let mockLogs = [];
let mockHistory = [];

Order.find = async (query) => {
  const statuses = query.currentOrderStatus.$in;
  return mockOrders.filter(o => statuses.includes(o.currentOrderStatus));
};

Order.findOneAndUpdate = async (query, update, options) => {
  const order = mockOrders.find(
    o => o._id.toString() === query._id.toString() && o.currentOrderStatus === query.currentOrderStatus
  );
  if (!order) return null;
  const targetStatus = update.$set.currentOrderStatus;
  order.currentOrderStatus = targetStatus;
  order.updatedAt = new Date();
  return order;
};

OrderStatusHistory.prototype.save = async function () {
  mockHistory.push(this);
  return this;
};

SchedulerLog.findOne = async () => null; // No locked runs
SchedulerLog.prototype.save = async function () {
  mockLogs.push(this);
  return this;
};

// Mock node-cron BEFORE requiring the cron scheduler script
const cron = require('node-cron');
let cronSchedules = [];

cron.validate = () => true;
cron.schedule = (expression, task) => {
  cronSchedules.push({ expression, task });
  return { stop: () => {} };
};

const { startCronScheduler } = require('../cron/scheduler');
const schedulerService = require('../services/schedulerService');
const { ORDER_STATUS } = require('../utils/constants');

async function runCronTests() {
  console.log('Running Offline Cron and Dynamic Timeouts Tests...');

  const failures = [];
  const runTest = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failures.push({ name, error: err });
    }
  };

  const resetState = () => {
    mockOrders = [];
    mockLogs = [];
    mockHistory = [];
    cronSchedules = [];
    delete process.env.SCHEDULER_ENABLED;
    delete process.env.SCHEDULER_CRON_EXPRESSION;
    delete process.env.ORDER_STATUS_PLACED_TIMEOUT_MINS;
    delete process.env.ORDER_STATUS_PROCESSING_TIMEOUT_MINS;
  };

  // --- Cron Registration Tests ---

  await runTest('Cron: Register schedule if enabled', async () => {
    resetState();
    process.env.SCHEDULER_ENABLED = 'true';
    process.env.SCHEDULER_CRON_EXPRESSION = '*/2 * * * *';

    startCronScheduler();

    assert.strictEqual(cronSchedules.length, 1);
    assert.strictEqual(cronSchedules[0].expression, '*/2 * * * *');
  });

  await runTest('Cron: Do not register schedule if disabled', async () => {
    resetState();
    process.env.SCHEDULER_ENABLED = 'false';

    startCronScheduler();

    assert.strictEqual(cronSchedules.length, 0);
  });

  // --- Dynamic Timeouts Configuration Tests ---

  await runTest('Timeouts: Order status transitions respect ORDER_STATUS_PLACED_TIMEOUT_MINS threshold', async () => {
    resetState();
    
    // Seed an order placed 5 minutes ago
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const orderId = new mongoose.Types.ObjectId();
    const order = {
      _id: orderId,
      orderId: 'ORD-TIMEOUT-PLACED',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: fiveMinsAgo
    };
    mockOrders.push(order);

    // Case A: PLACED timeout set to 10 minutes (default). 5 mins < 10 mins -> Should NOT transition.
    process.env.ORDER_STATUS_PLACED_TIMEOUT_MINS = '10';
    let res = await schedulerService.runScheduler();
    assert.strictEqual(res.totalOrdersUpdated, 0, 'Order should not transition (age 5 < threshold 10)');
    assert.strictEqual(order.currentOrderStatus, ORDER_STATUS.PLACED);

    // Case B: PLACED timeout set to 3 minutes. 5 mins > 3 mins -> Should transition to PROCESSING.
    process.env.ORDER_STATUS_PLACED_TIMEOUT_MINS = '3';
    res = await schedulerService.runScheduler();
    assert.strictEqual(res.totalOrdersUpdated, 1, 'Order should transition (age 5 >= threshold 3)');
    assert.strictEqual(order.currentOrderStatus, ORDER_STATUS.PROCESSING);
  });

  await runTest('Timeouts: Order status transitions respect ORDER_STATUS_PROCESSING_TIMEOUT_MINS threshold', async () => {
    resetState();
    
    // Seed an order in PROCESSING status 15 minutes ago
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const orderId = new mongoose.Types.ObjectId();
    const order = {
      _id: orderId,
      orderId: 'ORD-TIMEOUT-PROC',
      currentOrderStatus: ORDER_STATUS.PROCESSING,
      updatedAt: fifteenMinsAgo
    };
    mockOrders.push(order);

    // Case A: PROCESSING timeout set to 20 minutes (default). 15 mins < 20 mins -> Should NOT transition.
    process.env.ORDER_STATUS_PROCESSING_TIMEOUT_MINS = '20';
    let res = await schedulerService.runScheduler();
    assert.strictEqual(res.totalOrdersUpdated, 0, 'Order should not transition (age 15 < threshold 20)');
    assert.strictEqual(order.currentOrderStatus, ORDER_STATUS.PROCESSING);

    // Case B: PROCESSING timeout set to 12 minutes. 15 mins > 12 mins -> Should transition to READY_TO_SHIP.
    process.env.ORDER_STATUS_PROCESSING_TIMEOUT_MINS = '12';
    res = await schedulerService.runScheduler();
    assert.strictEqual(res.totalOrdersUpdated, 1, 'Order should transition (age 15 >= threshold 12)');
    assert.strictEqual(order.currentOrderStatus, ORDER_STATUS.READY_TO_SHIP);
  });

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} Cron Tests FAILED!`);
    process.exit(1);
  } else {
    console.log('\n🎉 All Cron scheduler automation tests passed successfully!');
    process.exit(0);
  }
}

runCronTests().catch(err => {
  console.error('Fatal error running cron tests:', err);
  process.exit(1);
});
