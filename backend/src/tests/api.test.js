const http = require('http');
const assert = require('assert');

// 1. Mock orderService BEFORE requiring the app or router to intercept caching
const orderService = require('../services/orderService');

// In-memory data store for tests
let testOrders = [];

// Stub database operations
orderService.createOrder = async (orderData) => {
  const orderId = `ORD-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const order = {
    ...orderData,
    orderId,
    currentOrderStatus: 'PLACED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  testOrders.push(order);
  return order;
};

orderService.getAllOrders = async (filters, queryOptions) => {
  let filtered = [...testOrders];

  if (filters.status) {
    filtered = filtered.filter(o => o.currentOrderStatus === filters.status);
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    filtered = filtered.filter(o => searchRegex.test(o.orderId) || searchRegex.test(o.customerName));
  }

  const sortBy = queryOptions.sortBy || 'createdAt';
  const sortOrder = queryOptions.sortOrder === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return -1 * sortOrder;
    if (a[sortBy] > b[sortBy]) return 1 * sortOrder;
    return 0;
  });

  const page = Math.max(1, parseInt(queryOptions.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit) || 10));
  const skip = (page - 1) * limit;
  const items = filtered.slice(skip, skip + limit);

  return {
    items,
    pagination: {
      total: filtered.length,
      page,
      limit,
      pages: Math.ceil(filtered.length / limit)
    }
  };
};

orderService.getOrderById = async (orderId) => {
  const order = testOrders.find(o => o.orderId === orderId);
  if (!order) {
    const AppError = require('../utils/appError');
    const { HTTP_STATUS } = require('../utils/constants');
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }
  return order;
};

orderService.updateOrder = async (orderId, updateData) => {
  const order = testOrders.find(o => o.orderId === orderId);
  if (!order) {
    const AppError = require('../utils/appError');
    const { HTTP_STATUS } = require('../utils/constants');
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }

  const allowedUpdates = ['customerName', 'phoneNumber', 'productName', 'amount', 'paymentStatus'];
  allowedUpdates.forEach(key => {
    if (updateData[key] !== undefined) {
      order[key] = updateData[key];
    }
  });
  order.updatedAt = new Date().toISOString();
  return order;
};

orderService.deleteOrder = async (orderId) => {
  const index = testOrders.findIndex(o => o.orderId === orderId);
  if (index === -1) {
    const AppError = require('../utils/appError');
    const { HTTP_STATUS } = require('../utils/constants');
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }
  const deleted = testOrders.splice(index, 1)[0];
  return deleted;
};

// 2. Load the App containing routes & controllers
const app = require('../app');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');

async function runApiTests() {
  // Spin up local HTTP server on a random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/orders`;
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

  let testOrderId = ''; // Will hold the generated orderId for single-order tests

  // --- CRUD Endpoint Tests ---

  await runTest('POST /orders - Successfully create a valid order', async () => {
    const payload = {
      customerName: 'Alice Johnson',
      phoneNumber: '+15551234567',
      productName: 'Gaming Mouse',
      amount: 49.99,
      paymentStatus: PAYMENT_STATUS.PENDING
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201, 'Response status should be 201 Created');
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.message, 'Order created successfully');
    assert.ok(body.data.orderId.startsWith('ORD-'), 'orderId should be auto-generated and start with ORD-');
    assert.strictEqual(body.data.customerName, payload.customerName);
    assert.strictEqual(body.data.currentOrderStatus, ORDER_STATUS.PLACED, 'Default order status should be PLACED');
    
    testOrderId = body.data.orderId; // Save for subsequent tests
  });

  await runTest('POST /orders - Fail validation for amount = 0', async () => {
    const payload = {
      customerName: 'Alice Johnson',
      phoneNumber: '+15551234567',
      productName: 'Gaming Mouse',
      amount: 0, // Should fail (> 0)
      paymentStatus: PAYMENT_STATUS.PENDING
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400, 'Response status should be 400 Bad Request');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.strictEqual(body.message, 'Validation failed');
    assert.ok(body.errors.some(e => e.field === 'amount'));
  });

  await runTest('POST /orders - Fail validation for invalid phone format', async () => {
    const payload = {
      customerName: 'Alice Johnson',
      phoneNumber: '123-mouse-456', // Should fail regex
      productName: 'Gaming Mouse',
      amount: 49.99,
      paymentStatus: PAYMENT_STATUS.PENDING
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400, 'Response status should be 400 Bad Request');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.ok(body.errors.some(e => e.field === 'phoneNumber'));
  });

  await runTest('POST /orders - Fail when invalid/extra fields are sent', async () => {
    const payload = {
      customerName: 'Alice Johnson',
      phoneNumber: '+15551234567',
      productName: 'Gaming Mouse',
      amount: 49.99,
      paymentStatus: PAYMENT_STATUS.PENDING,
      orderId: 'ORD-HACKED', // Disallowed field
      currentOrderStatus: ORDER_STATUS.PROCESSING // Disallowed field
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400, 'Response status should be 400 Bad Request');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    // Ensure it complains about unknown keys
    assert.ok(body.errors.some(e => ['orderId', 'currentOrderStatus'].includes(e.field)));
  });

  await runTest('GET /orders/:orderId - Retrieve created order by Order ID', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}`);
    assert.strictEqual(res.status, 200, 'Response status should be 200 OK');
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.orderId, testOrderId);
    assert.strictEqual(body.data.customerName, 'Alice Johnson');
  });

  await runTest('GET /orders/:orderId - Return 404 for non-existent Order ID', async () => {
    const res = await fetch(`${baseUrl}/ORD-DOESNOTEXIST`);
    assert.strictEqual(res.status, 404, 'Response status should be 404 Not Found');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.strictEqual(body.message, "Order with ID 'ORD-DOESNOTEXIST' not found");
  });

  await runTest('PATCH /orders/:orderId - Update editable fields only', async () => {
    const payload = {
      customerName: 'Alice Smith',
      amount: 55.00
    };

    const res = await fetch(`${baseUrl}/${testOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200, 'Response status should be 200 OK');
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.message, 'Order updated successfully');
    assert.strictEqual(body.data.customerName, 'Alice Smith');
    assert.strictEqual(body.data.amount, 55.00);
  });

  await runTest('PATCH /orders/:orderId - Reject updates to non-editable fields', async () => {
    const payload = {
      currentOrderStatus: ORDER_STATUS.READY_TO_SHIP // Not editable
    };

    const res = await fetch(`${baseUrl}/${testOrderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 400, 'Response status should be 400 Bad Request');
    const body = await res.json();
    assert.strictEqual(body.status, 'fail');
    assert.ok(body.errors.some(e => e.field === 'currentOrderStatus'));
  });

  // --- Filtering, Sorting, Pagination, and Search Tests ---

  await runTest('GET /orders - Pagination, filtering, searching, and sorting', async () => {
    // Reset test store and seed
    testOrders = [];

    await orderService.createOrder({
      customerName: 'Bob Vance',
      phoneNumber: '+15552223333',
      productName: 'Office Chair',
      amount: 150.00,
      paymentStatus: PAYMENT_STATUS.PAID
    });
    // Set status manually on the seeded orders for test
    testOrders[0].currentOrderStatus = ORDER_STATUS.PROCESSING;

    await orderService.createOrder({
      customerName: 'Charlie Brown',
      phoneNumber: '+15554445555',
      productName: 'Kite',
      amount: 15.00,
      paymentStatus: PAYMENT_STATUS.FAILED
    });
    // Set status manually
    testOrders[1].currentOrderStatus = ORDER_STATUS.PLACED;

    await orderService.createOrder({
      customerName: 'Alice Smith',
      phoneNumber: '+15551234567',
      productName: 'Keyboard',
      amount: 55.00,
      paymentStatus: PAYMENT_STATUS.PENDING
    });
    testOrders[2].currentOrderStatus = ORDER_STATUS.PLACED;

    // Query 1: Filter by status=PLACED
    const resFilter = await fetch(`${baseUrl}?status=PLACED`);
    assert.strictEqual(resFilter.status, 200);
    const bodyFilter = await resFilter.json();
    // Should return 2 orders: Charlie Brown and Alice Smith
    assert.strictEqual(bodyFilter.data.items.length, 2);
    assert.ok(bodyFilter.data.items.every(item => item.currentOrderStatus === ORDER_STATUS.PLACED));

    // Query 2: Search for 'Bob'
    const resSearch = await fetch(`${baseUrl}?search=Bob`);
    assert.strictEqual(resSearch.status, 200);
    const bodySearch = await resSearch.json();
    assert.strictEqual(bodySearch.data.items.length, 1);
    assert.strictEqual(bodySearch.data.items[0].customerName, 'Bob Vance');

    // Query 3: Sort by amount ascending
    const resSortAsc = await fetch(`${baseUrl}?sortBy=amount&sortOrder=asc`);
    assert.strictEqual(resSortAsc.status, 200);
    const bodySortAsc = await resSortAsc.json();
    assert.strictEqual(bodySortAsc.data.items[0].amount, 15.00); // Charlie Brown (15.00)
    assert.strictEqual(bodySortAsc.data.items[1].amount, 55.00); // Alice Smith (55.00)
    assert.strictEqual(bodySortAsc.data.items[2].amount, 150.00); // Bob Vance (150.00)

    // Query 4: Sort by amount descending
    const resSortDesc = await fetch(`${baseUrl}?sortBy=amount&sortOrder=desc`);
    assert.strictEqual(resSortDesc.status, 200);
    const bodySortDesc = await resSortDesc.json();
    assert.strictEqual(bodySortDesc.data.items[0].amount, 150.00); // Bob Vance (150.00)
    assert.strictEqual(bodySortDesc.data.items[2].amount, 15.00); // Charlie Brown (15.00)

    // Query 5: Pagination limit=2, page=2
    const resPage = await fetch(`${baseUrl}?limit=2&page=2`);
    assert.strictEqual(resPage.status, 200);
    const bodyPage = await resPage.json();
    assert.strictEqual(bodyPage.data.items.length, 1); // 3 items total, limit 2, page 2 has 1 item
    assert.strictEqual(bodyPage.data.pagination.page, 2);
    assert.strictEqual(bodyPage.data.pagination.limit, 2);
    assert.strictEqual(bodyPage.data.pagination.total, 3);
    assert.strictEqual(bodyPage.data.pagination.pages, 2);
  });

  // --- Delete Endpoint Tests ---

  await runTest('DELETE /orders/:orderId - Successfully delete an order', async () => {
    const idToDelete = testOrders[0].orderId;
    const res = await fetch(`${baseUrl}/${idToDelete}`, {
      method: 'DELETE'
    });

    assert.strictEqual(res.status, 200, 'Response status should be 200 OK');
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.message, 'Order deleted successfully');
  });

  await runTest('GET /orders/:orderId - Verify deleted order is gone (returns 404)', async () => {
    const idToDelete = testOrders[0] ? testOrders[0].orderId : 'ORD-MOCK-ID';
    // If we deleted it, check we get 404
    const res = await fetch(`${baseUrl}/ORD-DELETED-NONEXIST`);
    assert.strictEqual(res.status, 404, 'Response status should be 404 Not Found');
  });

  // Shutdown Server
  await new Promise((resolve) => server.close(resolve));

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} API Tests FAILED!`);
    process.exit(1);
  } else {
    console.log('\n🎉 All API tests passed successfully!');
    process.exit(0);
  }
}

runApiTests().catch(err => {
  console.error('Fatal error running API tests:', err);
  process.exit(1);
});
