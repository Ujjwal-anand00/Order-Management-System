const http = require('http');
const assert = require('assert');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// 1. Stub the Mongoose models BEFORE requiring the App
const SchedulerLog = require('../models/schedulerLog');

let mockLogs = [];

SchedulerLog.find = () => {
  return {
    sort: () => {
      return {
        skip: (skipVal) => {
          return {
            limit: (limitVal) => {
              return mockLogs.slice(skipVal, skipVal + limitVal);
            }
          };
        }
      };
    }
  };
};

SchedulerLog.countDocuments = async () => {
  return mockLogs.length;
};

// 2. Load the App
const app = require('../app');

async function runBonusTests() {
  console.log('Running Offline Scheduler Logs API Tests...');

  // Spin up local HTTP server on a random free port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1/scheduler/logs`;

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

  // Seed mock logs
  mockLogs = [
    {
      _id: 'L1',
      startTime: new Date(Date.now() - 10000),
      endTime: new Date(Date.now() - 5000),
      totalOrdersChecked: 10,
      totalOrdersUpdated: 2,
      status: 'SUCCESS',
      errorMessage: ''
    },
    {
      _id: 'L2',
      startTime: new Date(Date.now() - 20000),
      endTime: new Date(Date.now() - 15000),
      totalOrdersChecked: 5,
      totalOrdersUpdated: 0,
      status: 'SUCCESS',
      errorMessage: ''
    },
    {
      _id: 'L3',
      startTime: new Date(Date.now() - 30000),
      endTime: new Date(Date.now() - 25000),
      totalOrdersChecked: 8,
      totalOrdersUpdated: 1,
      status: 'FAILED',
      errorMessage: 'Database validation error'
    }
  ];

  await runTest('GET /scheduler/logs - Retrieve paginated logs list', async () => {
    const res = await fetch(`${baseUrl}?page=1&limit=2`);
    assert.strictEqual(res.status, 200, 'Status should be 200 OK');
    const body = await res.json();
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.message, 'Scheduler logs retrieved successfully');
    assert.strictEqual(body.data.items.length, 2, 'Should return 2 logs (limit=2)');
    assert.strictEqual(body.data.pagination.total, 3, 'Total count should be 3');
    assert.strictEqual(body.data.pagination.page, 1);
    assert.strictEqual(body.data.pagination.limit, 2);
    assert.strictEqual(body.data.pagination.pages, 2);
  });

  await runTest('GET /scheduler/logs - Navigate pagination index', async () => {
    const res = await fetch(`${baseUrl}?page=2&limit=2`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.items.length, 1, 'Should return remaining 1 log (page=2)');
    assert.strictEqual(body.data.pagination.page, 2);
  });

  // Shutdown Server
  await new Promise((resolve) => server.close(resolve));

  if (failures.length > 0) {
    console.error(`\n❌ ${failures.length} Bonus API Tests FAILED!`);
    process.exit(1);
  } else {
    console.log('\n🎉 All bonus logs API tests passed successfully!');
    process.exit(0);
  }
}

runBonusTests().catch(err => {
  console.error('Fatal error running bonus tests:', err);
  process.exit(1);
});
