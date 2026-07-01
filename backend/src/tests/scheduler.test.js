const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');

// Load environment variables for the secret key
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const secretKey = process.env.SCHEDULER_SECRET_KEY || 'dev_scheduler_secret_key';

// 1. Stub the Mongoose models BEFORE requiring the App to intercept imports
const Order = require('../models/order');
const OrderStatusHistory = require('../models/orderStatusHistory');
const SchedulerLog = require('../models/schedulerLog');

let mockOrders = [];
let mockHistory = [];
let mockLogs = [];
let simulateOrderFailureId = null;

// Stub Order.find
Order.find = async (query) => {
  const statuses = query.currentOrderStatus.$in;
  return mockOrders.filter(o => statuses.includes(o.currentOrderStatus));
};

// Stub Order.findOneAndUpdate
Order.findOneAndUpdate = async (query, update, options) => {
  if (simulateOrderFailureId && query._id.toString() === simulateOrderFailureId.toString()) {
    throw new Error('Simulated database write error for order');
  }

  const order = mockOrders.find(
    o => o._id.toString() === query._id.toString() && o.currentOrderStatus === query.currentOrderStatus
  );

  if (!order) return null;

  const targetStatus = update.$set.currentOrderStatus;
  order.currentOrderStatus = targetStatus;
  order.updatedAt = new Date(); // update timestamp
  return order;
};

// Stub OrderStatusHistory save
OrderStatusHistory.prototype.save = async function () {
  const data = {
    orderRef: this.orderRef,
    previousStatus: this.previousStatus,
    newStatus: this.newStatus,
    changedBy: this.changedBy,
    changeReason: this.changeReason,
    changedAt: this.changedAt || new Date()
  };
  mockHistory.push(data);
  return this;
};

// Stub SchedulerLog findOne
SchedulerLog.findOne = async (query) => {
  const checkTime = query.startTime.$gt;
  const running = mockLogs.find(l => l.endTime.getTime() === 0 && l.startTime > checkTime);
  return running || null;
};

// Stub SchedulerLog save
SchedulerLog.prototype.save = async function () {
  const existingIndex = mockLogs.findIndex(l => l._id === this._id);
  const logData = {
    _id: this._id || `LOG-${Math.random()}`,
    startTime: this.startTime,
    endTime: this.endTime,
    status: this.status,
    totalOrdersChecked: this.totalOrdersChecked,
    totalOrdersUpdated: this.totalOrdersUpdated,
    errorMessage: this.errorMessage
  };

  if (existingIndex > -1) {
    mockLogs[existingIndex] = logData;
  } else {
    this._id = logData._id;
    mockLogs.push(logData);
  }
  return this;
};

// 2. Load the App
const app = require('../app');
const { ORDER_STATUS, PAYMENT_STATUS, SCHEDULER_STATUS } = require('../utils/constants');

async function runSchedulerTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/scheduler/run`;
  console.log(`Live test server running at: ${baseUrl}`);

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

  // Helper to reset mocks
  const resetMocks = () => {
    mockOrders = [];
    mockHistory = [];
    mockLogs = [];
    simulateOrderFailureId = null;
  };

  // --- Security Tests ---

  await runTest('Scheduler Security: Reject requests with missing secret header', async () => {
    resetMocks();
    const res = await fetch(baseUrl, { method: 'POST' });
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.ok(body.message.includes('Missing scheduler secret key'));
  });

  await runTest('Scheduler Security: Reject requests with invalid secret header', async () => {
    resetMocks();
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'x-scheduler-key': 'wrong_secret_key' }
    });
    assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.ok(body.message.includes('Invalid scheduler secret key'));
  });

  // --- Scheduler Logic Tests ---

  await runTest('Scheduler Logic: No eligible orders', async () => {
    resetMocks();
    
    // Seed 1 order that is already READY_TO_SHIP
    mockOrders.push({
      _id: new mongoose.Types.ObjectId(),
      orderId: 'ORD-READY',
      currentOrderStatus: ORDER_STATUS.READY_TO_SHIP,
      updatedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 mins ago
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'x-scheduler-key': secretKey }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.totalOrdersChecked, 0, 'No active orders should be checked');
    assert.strictEqual(body.data.totalOrdersUpdated, 0);

    // Verify a successful log was saved
    assert.strictEqual(mockLogs.length, 1);
    assert.strictEqual(mockLogs[0].status, SCHEDULER_STATUS.SUCCESS);
    assert.strictEqual(mockLogs[0].totalOrdersChecked, 0);
    assert.strictEqual(mockLogs[0].totalOrdersUpdated, 0);
  });

  await runTest('Scheduler Logic: Multiple eligible orders & time boundaries', async () => {
    resetMocks();

    const now = Date.now();
    const o1Id = new mongoose.Types.ObjectId();
    const o2Id = new mongoose.Types.ObjectId();
    const o3Id = new mongoose.Types.ObjectId();
    const o4Id = new mongoose.Types.ObjectId();
    const o5Id = new mongoose.Types.ObjectId();

    // 1. PLACED and older than 10 mins -> Should transition to PROCESSING
    const order1 = {
      _id: o1Id,
      orderId: 'ORD-001',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: new Date(now - 11 * 60 * 1000) // 11 mins old
    };

    // 2. PLACED and younger than 10 mins -> Should NOT transition
    const order2 = {
      _id: o2Id,
      orderId: 'ORD-002',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: new Date(now - 9 * 60 * 1000) // 9 mins old
    };

    // 3. PROCESSING and older than 20 mins -> Should transition to READY_TO_SHIP
    const order3 = {
      _id: o3Id,
      orderId: 'ORD-003',
      currentOrderStatus: ORDER_STATUS.PROCESSING,
      updatedAt: new Date(now - 21 * 60 * 1000) // 21 mins old
    };

    // 4. PROCESSING and younger than 20 mins -> Should NOT transition
    const order4 = {
      _id: o4Id,
      orderId: 'ORD-004',
      currentOrderStatus: ORDER_STATUS.PROCESSING,
      updatedAt: new Date(now - 19 * 60 * 1000) // 19 mins old
    };

    // 5. PLACED and exactly at the 10 min boundary -> Should transition to PROCESSING
    const order5 = {
      _id: o5Id,
      orderId: 'ORD-005',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: new Date(now - 10 * 60 * 1000) // exactly 10 mins
    };

    mockOrders.push(order1, order2, order3, order4, order5);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'x-scheduler-key': secretKey }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    
    // Checked should be 5 (all except READY_TO_SHIP)
    assert.strictEqual(body.data.totalOrdersChecked, 5);
    // Updated should be 3 (order1, order3, order5)
    assert.strictEqual(body.data.totalOrdersUpdated, 3);

    // Verify order states transitioned correctly
    assert.strictEqual(order1.currentOrderStatus, ORDER_STATUS.PROCESSING);
    assert.strictEqual(order2.currentOrderStatus, ORDER_STATUS.PLACED);
    assert.strictEqual(order3.currentOrderStatus, ORDER_STATUS.READY_TO_SHIP);
    assert.strictEqual(order4.currentOrderStatus, ORDER_STATUS.PROCESSING);
    assert.strictEqual(order5.currentOrderStatus, ORDER_STATUS.PROCESSING);

    // Verify audit logs were written
    assert.strictEqual(mockHistory.length, 3, '3 history records should be written');
    
    const h1 = mockHistory.find(h => h.orderRef.toString() === o1Id.toString());
    assert.ok(h1, 'History entry for Order 1 should exist');
    assert.strictEqual(h1.previousStatus, ORDER_STATUS.PLACED);
    assert.strictEqual(h1.newStatus, ORDER_STATUS.PROCESSING);
    assert.strictEqual(h1.changedBy, 'SCHEDULER');

    const h3 = mockHistory.find(h => h.orderRef.toString() === o3Id.toString());
    assert.ok(h3, 'History entry for Order 3 should exist');
    assert.strictEqual(h3.previousStatus, ORDER_STATUS.PROCESSING);
    assert.strictEqual(h3.newStatus, ORDER_STATUS.READY_TO_SHIP);

    // Verify execution logs saved
    assert.strictEqual(mockLogs.length, 1);
    assert.strictEqual(mockLogs[0].status, SCHEDULER_STATUS.SUCCESS);
    assert.strictEqual(mockLogs[0].totalOrdersChecked, 5);
    assert.strictEqual(mockLogs[0].totalOrdersUpdated, 3);
  });

  // --- Concurrent Locking Test ---

  await runTest('Scheduler Logic: Prevent concurrent race executions (Active Lock)', async () => {
    resetMocks();

    // Insert an active running log (endTime is epoch time)
    mockLogs.push({
      _id: 'RUNNING-JOB-ID',
      startTime: new Date(Date.now() - 1 * 60 * 1000), // started 1 min ago
      endTime: new Date(0), // epoch
      status: SCHEDULER_STATUS.FAILED
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'x-scheduler-key': secretKey }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.status, 'SKIPPED');
    assert.strictEqual(body.data.reason, 'Another scheduler job is currently running');
    assert.strictEqual(body.data.totalOrdersUpdated, 0);
  });

  // --- Graceful Failure Recovery Test ---

  await runTest('Scheduler Logic: Graceful recovery on single order database failure', async () => {
    resetMocks();

    const now = Date.now();
    const o1Id = new mongoose.Types.ObjectId();
    const o2Id = new mongoose.Types.ObjectId();

    // Order 1: Should update but will trigger database write failure
    const order1 = {
      _id: o1Id,
      orderId: 'ORD-FAIL',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: new Date(now - 12 * 60 * 1000)
    };

    // Order 2: Should update and succeed
    const order2 = {
      _id: o2Id,
      orderId: 'ORD-SUCCESS',
      currentOrderStatus: ORDER_STATUS.PLACED,
      updatedAt: new Date(now - 12 * 60 * 1000)
    };

    mockOrders.push(order1, order2);

    // Trigger failure simulation for Order 1
    simulateOrderFailureId = o1Id;

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'x-scheduler-key': secretKey }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.totalOrdersChecked, 2);
    // Should successfully update 1 order (order2) while skipping order1 gracefully
    assert.strictEqual(body.data.totalOrdersUpdated, 1);

    // Assert status states
    assert.strictEqual(order1.currentOrderStatus, ORDER_STATUS.PLACED, 'Failing order should remain PLACED');
    assert.strictEqual(order2.currentOrderStatus, ORDER_STATUS.PROCESSING, 'Successful order should become PROCESSING');

    // Assert audit history contains only 1 entry
    assert.strictEqual(mockHistory.length, 1);
    assert.strictEqual(mockHistory[0].orderRef.toString(), o2Id.toString());

    // Execution log status should be SUCCESS (completed execution despite individual order error)
    assert.strictEqual(mockLogs.length, 1);
    assert.strictEqual(mockLogs[0].status, SCHEDULER_STATUS.SUCCESS);
    assert.strictEqual(mockLogs[0].totalOrdersChecked, 2);
    assert.strictEqual(mockLogs[0].totalOrdersUpdated, 1);
  });

  // Cleanup
  await new Promise((resolve) => server.close(resolve));

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} Scheduler Tests FAILED!`);
    process.exit(1);
  } else {
    console.log('\n🎉 All Scheduler tests passed successfully!');
    process.exit(0);
  }
}

runSchedulerTests().catch(err => {
  console.error('Fatal error running Scheduler tests:', err);
  process.exit(1);
});
