const mongoose = require('mongoose');
const assert = require('assert');
const Order = require('../models/order');
const OrderStatusHistory = require('../models/orderStatusHistory');
const SchedulerLog = require('../models/schedulerLog');
const { ORDER_STATUS, PAYMENT_STATUS, SCHEDULER_STATUS } = require('../utils/constants');

function runTests() {
  console.log('Running Offline Mongoose Schema Verification Tests...');

  const failures = [];
  const runTest = (name, fn) => {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failures.push({ name, error: err });
    }
  };

  // --- Order Model Tests ---

  runTest('Order: Valid document validation passes', () => {
    const order = new Order({
      orderId: 'ORD-12345',
      customerName: 'John Doe',
      phoneNumber: '+15551234567',
      productName: 'Wireless Headphones',
      amount: 99.99,
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    const err = order.validateSync();
    assert.strictEqual(err, undefined, 'Valid order should not produce validation errors');
  });

  runTest('Order: amount must be greater than zero validation', () => {
    const orderZero = new Order({
      orderId: 'ORD-123',
      customerName: 'John Doe',
      phoneNumber: '+15551234567',
      productName: 'Speaker',
      amount: 0, // Should fail
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    const errZero = orderZero.validateSync();
    assert.ok(errZero, 'Validation error should be thrown for amount = 0');
    assert.ok(errZero.errors.amount, 'Amount field should have a validation error');

    const orderNeg = new Order({
      orderId: 'ORD-123',
      customerName: 'John Doe',
      phoneNumber: '+15551234567',
      productName: 'Speaker',
      amount: -5.00, // Should fail
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    const errNeg = orderNeg.validateSync();
    assert.ok(errNeg, 'Validation error should be thrown for negative amount');
    assert.ok(errNeg.errors.amount, 'Amount field should have a validation error');
  });

  runTest('Order: invalid phone number format validation', () => {
    const invalidPhone = new Order({
      orderId: 'ORD-123',
      customerName: 'John Doe',
      phoneNumber: '123-abc-456', // Invalid format
      productName: 'Speaker',
      amount: 50.00,
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    const err = invalidPhone.validateSync();
    assert.ok(err, 'Validation error should be thrown for invalid phone');
    assert.ok(err.errors.phoneNumber, 'Phone field should have a validation error');
  });

  runTest('Order: string trimming works', () => {
    const trimmedOrder = new Order({
      orderId: '  ORD-TRIMMED  ',
      customerName: '   Trimmed Name   ',
      phoneNumber: '   +15559876543   ',
      productName: '   Cable  ',
      amount: 10.00,
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    // Mongoose runs setters during instantiation
    assert.strictEqual(trimmedOrder.orderId, 'ORD-TRIMMED');
    assert.strictEqual(trimmedOrder.customerName, 'Trimmed Name');
    assert.strictEqual(trimmedOrder.phoneNumber, '+15559876543');
    assert.strictEqual(trimmedOrder.productName, 'Cable');
  });

  runTest('Order: unique orderId constraint definition', () => {
    const orderIdPath = Order.schema.path('orderId');
    assert.strictEqual(orderIdPath.options.unique, true, 'orderId must have unique: true option');
  });

  runTest('Order: invalid paymentStatus enum validation', () => {
    const order = new Order({
      orderId: 'ORD-123',
      customerName: 'John Doe',
      phoneNumber: '+15551234567',
      productName: 'Speaker',
      amount: 50.00,
      paymentStatus: 'UNKNOWN_STATUS', // Invalid
      currentOrderStatus: ORDER_STATUS.PLACED
    });

    const err = order.validateSync();
    assert.ok(err, 'Validation error should be thrown for invalid paymentStatus');
    assert.ok(err.errors.paymentStatus, 'paymentStatus field should have a validation error');
  });

  runTest('Order: invalid currentOrderStatus enum validation', () => {
    const order = new Order({
      orderId: 'ORD-123',
      customerName: 'John Doe',
      phoneNumber: '+15551234567',
      productName: 'Speaker',
      amount: 50.00,
      paymentStatus: PAYMENT_STATUS.PENDING,
      currentOrderStatus: 'UNKNOWN_STATUS' // Invalid
    });

    const err = order.validateSync();
    assert.ok(err, 'Validation error should be thrown for invalid currentOrderStatus');
    assert.ok(err.errors.currentOrderStatus, 'currentOrderStatus field should have a validation error');
  });

  runTest('Order: required fields validation', () => {
    const order = new Order({});
    const err = order.validateSync();

    assert.ok(err, 'Validation error should be thrown for missing required fields');
    assert.ok(err.errors.orderId, 'orderId is required');
    assert.ok(err.errors.customerName, 'customerName is required');
    assert.ok(err.errors.phoneNumber, 'phoneNumber is required');
    assert.ok(err.errors.productName, 'productName is required');
    assert.ok(err.errors.amount, 'amount is required');
  });

  runTest('Order: expected indexes defined', () => {
    const orderIdPath = Order.schema.path('orderId');
    const customerNamePath = Order.schema.path('customerName');
    const phoneNumberPath = Order.schema.path('phoneNumber');
    const currentOrderStatusPath = Order.schema.path('currentOrderStatus');

    assert.ok(orderIdPath.options.index || orderIdPath.options.unique, 'orderId must be indexed/unique');
    assert.strictEqual(customerNamePath.options.index, true, 'customerName must be indexed');
    assert.strictEqual(phoneNumberPath.options.index, true, 'phoneNumber must be indexed');
    assert.strictEqual(currentOrderStatusPath.options.index, true, 'currentOrderStatus must be indexed');

    // Check custom indexes on the schema (like createdAt index)
    const indexes = Order.schema.indexes();
    const hasCreatedAt = indexes.some(idx => idx[0] && idx[0].createdAt === 1);
    assert.ok(hasCreatedAt, 'createdAt index should be defined');
  });

  // --- OrderStatusHistory Model Tests ---

  runTest('OrderStatusHistory: Valid document validation passes', () => {
    const history = new OrderStatusHistory({
      orderRef: new mongoose.Types.ObjectId(),
      previousStatus: null,
      newStatus: ORDER_STATUS.PLACED,
      changedBy: 'SYSTEM',
      changeReason: 'Order created',
      changedAt: new Date()
    });

    const err = history.validateSync();
    assert.strictEqual(err, undefined, 'Valid history should not produce validation errors');
  });

  runTest('OrderStatusHistory: required fields validation', () => {
    const history = new OrderStatusHistory({});
    const err = history.validateSync();

    assert.ok(err, 'Validation error should be thrown for missing fields');
    assert.ok(err.errors.orderRef, 'orderRef is required');
    assert.ok(err.errors.newStatus, 'newStatus is required');
    assert.strictEqual(history.changedBy, 'SYSTEM', 'changedBy should default to SYSTEM');
  });

  runTest('OrderStatusHistory: invalid status enums', () => {
    const history = new OrderStatusHistory({
      orderRef: new mongoose.Types.ObjectId(),
      previousStatus: 'INVALID_STATUS',
      newStatus: 'ANOTHER_INVALID',
      changedBy: 'SYSTEM'
    });

    const err = history.validateSync();
    assert.ok(err, 'Validation error should be thrown for invalid enums');
    assert.ok(err.errors.previousStatus, 'previousStatus enum should validate');
    assert.ok(err.errors.newStatus, 'newStatus enum should validate');
  });

  runTest('OrderStatusHistory: orderRef is indexed', () => {
    const orderRefPath = OrderStatusHistory.schema.path('orderRef');
    assert.strictEqual(orderRefPath.options.index, true, 'orderRef must be indexed');
  });

  // --- SchedulerLog Model Tests ---

  runTest('SchedulerLog: Valid document validation passes', () => {
    const log = new SchedulerLog({
      startTime: new Date(),
      endTime: new Date(),
      totalOrdersChecked: 10,
      totalOrdersUpdated: 2,
      status: SCHEDULER_STATUS.SUCCESS,
      errorMessage: ''
    });

    const err = log.validateSync();
    assert.strictEqual(err, undefined, 'Valid log should not produce validation errors');
  });

  runTest('SchedulerLog: required fields validation', () => {
    const log = new SchedulerLog({});
    const err = log.validateSync();

    assert.ok(err, 'Validation error should be thrown for missing fields');
    assert.ok(err.errors.startTime, 'startTime is required');
    assert.ok(err.errors.endTime, 'endTime is required');
    assert.ok(err.errors.status, 'status is required');
  });

  runTest('SchedulerLog: invalid status enum validation', () => {
    const log = new SchedulerLog({
      startTime: new Date(),
      endTime: new Date(),
      status: 'INVALID_STATUS'
    });

    const err = log.validateSync();
    assert.ok(err, 'Validation error should be thrown for invalid status');
    assert.ok(err.errors.status, 'status enum should validate');
  });

  runTest('SchedulerLog: index on startTime exists', () => {
    const startTimePath = SchedulerLog.schema.path('startTime');
    assert.strictEqual(startTimePath.options.index, true, 'startTime must be indexed');
  });

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} Tests FAILED!`);
    process.exit(1);
  } else {
    console.log('\n🎉 All offline schema tests passed successfully!');
    process.exit(0);
  }
}

runTests();
