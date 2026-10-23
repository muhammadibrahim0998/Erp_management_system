const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7001/api';

async function runTests() {
  console.log('====================================================');
  console.log('Running Sales Approval Auth & Attribution Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS: [${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: [${total}] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // Pre-test setup: Ensure test records do not exist
  const TEST_SO_1 = 'SO-TEST-AUTH-001';
  const TEST_SO_2 = 'SO-TEST-AUTH-002';
  await db.query('DELETE FROM audit_logs WHERE entity_id IN (?, ?)', [TEST_SO_1, TEST_SO_2]);
  await db.query('DELETE FROM sales_orders WHERE so_number IN (?, ?)', [TEST_SO_1, TEST_SO_2]);

  // Insert fresh test sales orders in 'Pending approval'
  await db.query(
    `INSERT INTO sales_orders 
     (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
     VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Test Customer Ltd', 'Mardan store', 50000.00, 1000000.00, 0.00, 0.00, 'Pending approval', 'CEO Waiting', 'Tester')`,
    [TEST_SO_1]
  );
  await db.query(
    `INSERT INTO sales_orders 
     (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
     VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Test Customer 2 Ltd', 'Mardan store', 75000.00, 1000000.00, 0.00, 0.00, 'Pending approval', 'CEO Waiting', 'Tester')`,
    [TEST_SO_2]
  );

  // Generate tokens for testing
  const validCeoToken = jwt.sign(
    { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Legacy/minimal token without name field (verifies database lookup fallback)
  const legacyCeoTokenWithoutName = jwt.sign(
    { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const validSalesManagerToken = jwt.sign(
    { id: 13, role: 'Sales Manager', email: 'sales@yaf.com', name: 'Imran Khattak' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const nonApproverToken = jwt.sign(
    { id: 14, role: 'Sales Officer', email: 'bilal.yousafzai@yaf.com', name: 'Bilal Yousafzai' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const expiredToken = jwt.sign(
    { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
    JWT_SECRET,
    { expiresIn: -10 }
  );

  const invalidSecretToken = jwt.sign(
    { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
    'wrong_secret_key_12345',
    { expiresIn: '1h' }
  );

  try {
    // 1. Unauthenticated request to POST /api/sales/approve
    await test('Unauthenticated request to POST /api/sales/approve returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 401, `Expected HTTP 401, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');

      // Verify order status unchanged in database
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [TEST_SO_1]);
      assert.strictEqual(rows[0].status, 'Pending approval');
      assert.strictEqual(rows[0].approval_step, 'CEO Waiting');
    });

    // 2. Unauthenticated request to POST /api/sales/orders/:so_number/approve
    await test('Unauthenticated request to POST /api/sales/orders/:so_number/approve returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${TEST_SO_1}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.strictEqual(res.status, 401, `Expected HTTP 401, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');
    });

    // 3. Request with malformed token returns HTTP 403
    await test('Request with malformed token returns HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer not-a-valid-jwt-token'
        },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Invalid or expired token.');
    });

    // 4. Request with token signed by invalid secret returns HTTP 403
    await test('Request with token signed by invalid secret returns HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invalidSecretToken}`
        },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Invalid or expired token.');
    });

    // 5. Request with expired token returns HTTP 403
    await test('Request with expired token returns HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`
        },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Invalid or expired token.');
    });

    // 6. Authenticated request with non-approver role returns HTTP 403
    await test('Authenticated request with non-approver role (Sales Officer) returns HTTP 403 Forbidden', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nonApproverToken}`
        },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied: Role "Sales Officer" is not authorized to approve sales orders'));

      // Verify order status unchanged
      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [TEST_SO_1]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    // 7. Authenticated approval with valid approver credentials + spoofing attempt in body
    await test('Authenticated approval ignores client spoofing and attributes real approver identity', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({
          so_number: TEST_SO_1,
          name: 'Malicious Spoofed Name',
          user: 'Hacker',
          approver: 'Evil Actor',
          role: 'SuperAdmin'
        })
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, 'Approved');
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
      assert.ok(!body.order.approval_step.includes('undefined'), 'approval_step must not contain undefined');
      assert.ok(!body.order.approval_step.includes('Malicious'), 'approval_step must ignore spoofed name');
    });

    // 8. Database verification for approved order record
    await test('Database sales_orders row reflects real approver identity without undefined or null', async () => {
      const [rows] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [TEST_SO_1]);
      assert.strictEqual(rows.length, 1);
      const row = rows[0];
      assert.strictEqual(row.status, 'Approved');
      assert.strictEqual(row.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
      assert.ok(!row.approval_step.includes('undefined'));
    });

    // 9. Database verification for audit log record
    await test('Database audit_logs row accurately records user_id, user_name, role, and details', async () => {
      const [rows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER" ORDER BY id DESC LIMIT 1',
        [TEST_SO_1]
      );
      assert.strictEqual(rows.length, 1, 'Audit log entry must exist for TEST_SO_1');
      const log = rows[0];
      assert.strictEqual(log.user_id, 1, 'user_id must match authenticated user ID (1)');
      assert.strictEqual(log.user_name, 'Sana Ullah', 'user_name must match authenticated user name (Sana Ullah)');
      assert.strictEqual(log.role, 'Chairman & CEO', 'role must match authenticated role');
      assert.strictEqual(log.details, `Chairman & CEO (Sana Ullah) approved sales order ${TEST_SO_1}`);
      assert.ok(!log.details.includes('undefined'), 'details must not contain undefined');
      assert.ok(!log.user_name.includes('User'), 'user_name must not fall back to generic User');
      assert.ok(!log.details.includes('Malicious'), 'details must not contain spoofed fields');
    });

    // 10. Database fallback test: legacy token without name in payload resolves approver name from MySQL
    await test('Legacy token without name field in JWT correctly resolves user name from users table', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${TEST_SO_2}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${legacyCeoTokenWithoutName}`
        }
      });

      assert.strictEqual(res.status, 200, `Expected HTTP 200, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, 'Approved');
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');

      // Verify audit log for SO-TEST-AUTH-002
      const [logs] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER" ORDER BY id DESC LIMIT 1',
        [TEST_SO_2]
      );
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].user_name, 'Sana Ullah');
      assert.strictEqual(logs[0].details, `Chairman & CEO (Sana Ullah) approved sales order ${TEST_SO_2}`);
    });

    // 11. State transition check: Re-approving an already approved order returns HTTP 400
    await test('Cannot re-approve an already approved sales order (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: TEST_SO_1 })
      });
      assert.strictEqual(res.status, 400, `Expected HTTP 400, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('Cannot approve order'));
      assert.ok(body.error.includes('order is already in "Approved" status'));
    });

    // 12. Non-existent sales order returns HTTP 404
    await test('Approving non-existent sales order returns HTTP 404', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: 'SO-DOES-NOT-EXIST-9999' })
      });
      assert.strictEqual(res.status, 404, `Expected HTTP 404, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('not found'));
    });

  } finally {
    // Post-test cleanup: delete temporary test orders and audit entries
    await db.query('DELETE FROM audit_logs WHERE entity_id IN (?, ?)', [TEST_SO_1, TEST_SO_2]);
    await db.query('DELETE FROM sales_orders WHERE so_number IN (?, ?)', [TEST_SO_1, TEST_SO_2]);
  }

  console.log(`\nTest Results: ${passed} / ${total} tests passed.\n`);
  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
