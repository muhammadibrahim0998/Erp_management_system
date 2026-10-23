const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

// ============================================================================
// ENVIRONMENT & SAFETY GUARDS
// ============================================================================
const nodeEnv = process.env.NODE_ENV || 'test';
if (nodeEnv === 'production') {
  console.error('FATAL SAFETY VIOLATION: Tests must never execute in a production environment.');
  process.exit(1);
}

const currentDb = process.env.DB_NAME || '';
const isTestDb = currentDb.toLowerCase().endsWith('_test') || currentDb === 'yaf_erp_test';
if (!isTestDb) {
  console.error(`\n====================================================================`);
  console.error(`FATAL SAFETY REFUSAL: Unverified or non-test database configuration.`);
  console.error(`Active DB_NAME: "${currentDb || '(empty - defaults to dev/prod)'}"`);
  console.error(`Tests are blocked from running against development or production databases.`);
  console.error(`To run tests safely, provide an isolated test database:`);
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/salesApprovalAuth.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

// Ensure JWT_SECRET and db pool load with the safe test database environment
const { db } = require('../config/db');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const operationsRoutes = require('../routes/operations.routes');

async function runSafeTestSuite() {
  console.log('====================================================================');
  console.log('SALES APPROVAL AUTHENTICATION & ATTRIBUTION REGRESSION TEST SUITE');
  console.log('====================================================================');
  console.log(`[Safety Guard] Node Environment: ${nodeEnv}`);
  console.log(`[Safety Guard] Database Target:   ${currentDb} (ISOLATED TEST DATABASE)`);

  // Verify database connection and active database name
  const [dbNameRows] = await db.query('SELECT DATABASE() as active_db');
  const activeDbName = dbNameRows[0]?.active_db;
  assert.strictEqual(
    activeDbName,
    currentDb,
    `Active database mismatch: Expected ${currentDb}, got ${activeDbName}`
  );
  console.log(`[Safety Guard] Verified Connection: Connected to "${activeDbName}"`);

  // Spin up an isolated Express HTTP server on an ephemeral port
  const app = express();
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', operationsRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://localhost:${ephemeralPort}/api`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

  // Unique run identifier ensures zero collisions and ownership-based tracking
  const RUN_SIGNATURE = 'RUN_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const createdOrderNumbers = new Set();
  const createdUserIds = new Set();
  const createdAuditIds = new Set();

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS: [${total.toString().padStart(2, '0')}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL: [${total.toString().padStart(2, '0')}] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // Helper to create an isolated sales order with ownership tracking
  async function createTestOrder(index, initialStatus = 'Pending approval', initialStep = 'CEO Waiting') {
    const soNumber = `SO-TEST-${RUN_SIGNATURE}-${index}`;
    // Verify no collision before inserting
    const [existing] = await db.query('SELECT id FROM sales_orders WHERE so_number = ?', [soNumber]);
    if (existing.length > 0) {
      throw new Error(`Safety collision: Order ${soNumber} already exists in test database.`);
    }

    await db.query(
      `INSERT INTO sales_orders
       (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
       VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Isolated Test Customer', 'Mardan Store', 85000.00, 2000000.00, 0.00, 0.00, ?, ?, 'Safe Test Runner')`,
      [soNumber, initialStatus, initialStep]
    );

    createdOrderNumbers.add(soNumber);
    return soNumber;
  }

  // Helper to create a temporary test user with ownership tracking
  async function createTestUser({ name, role, email, status = 'active' }) {
    const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status)
       VALUES (?, ?, 'Testing', 'TU', ?, 'hashed_pass_placeholder', ?)`,
      [name, role, email || uniqueEmail, status]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    return { id: userId, name, role, email: email || uniqueEmail, status };
  }

  try {
    // ------------------------------------------------------------------------
    // Pre-create isolated test orders
    // ------------------------------------------------------------------------
    const SO_UNAUTH_1 = await createTestOrder('UNAUTH1');
    const SO_UNAUTH_2 = await createTestOrder('UNAUTH2');
    const SO_INVALID_TOKEN = await createTestOrder('INV_TOK');
    const SO_NON_APPROVER = await createTestOrder('NON_APP');
    const SO_LEGACY_TOKEN = await createTestOrder('LEGACY');
    const SO_SPOOF_ATTEMPT = await createTestOrder('SPOOF');
    const SO_SECOND_ROUTE = await createTestOrder('ROUTE2');
    const SO_UNRESOLVABLE = await createTestOrder('NO_USER');
    const SO_INACTIVE_USER = await createTestOrder('INACT');
    const SO_EMPTY_NAME_USER = await createTestOrder('NONAME');
    const SO_MISSING_ID = await createTestOrder('NO_ID');

    // Tokens
    const validCeoToken = jwt.sign(
      { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const legacyCeoTokenNoName = jwt.sign(
      { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const salesManagerToken = jwt.sign(
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

    const wrongSecretToken = jwt.sign(
      { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
      'wrong_untrusted_secret_key_99999',
      { expiresIn: '1h' }
    );

    // ========================================================================
    // TEST 1: Unauthenticated request to POST /api/sales/approve
    // ========================================================================
    await test('Unauthenticated request to POST /api/sales/approve receives HTTP 401 and does not execute approval', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: SO_UNAUTH_1 })
      });

      assert.strictEqual(res.status, 401, `Expected HTTP 401, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');

      // Order must remain unapproved
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_UNAUTH_1]);
      assert.strictEqual(rows[0].status, 'Pending approval');
      assert.strictEqual(rows[0].approval_step, 'CEO Waiting');
    });

    // ========================================================================
    // TEST 2: Unauthenticated request to POST /api/sales/orders/:so/approve
    // ========================================================================
    await test('Unauthenticated request to POST /api/sales/orders/:so_number/approve receives HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${SO_UNAUTH_2}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      assert.strictEqual(res.status, 401, `Expected HTTP 401, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');

      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_UNAUTH_2]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    // ========================================================================
    // TEST 3: Invalid / malformed / expired token rejection
    // ========================================================================
    await test('Request with malformed or invalid token receives HTTP 403', async () => {
      const resMalformed = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer definitely-not-a-valid-token'
        },
        body: JSON.stringify({ so_number: SO_INVALID_TOKEN })
      });
      assert.strictEqual(resMalformed.status, 403);
      const bodyMalformed = await resMalformed.json();
      assert.strictEqual(bodyMalformed.error, 'Invalid or expired token.');

      const resExpired = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`
        },
        body: JSON.stringify({ so_number: SO_INVALID_TOKEN })
      });
      assert.strictEqual(resExpired.status, 403);

      const resWrongSecret = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${wrongSecretToken}`
        },
        body: JSON.stringify({ so_number: SO_INVALID_TOKEN })
      });
      assert.strictEqual(resWrongSecret.status, 403);
    });

    // ========================================================================
    // TEST 4: Token missing user ID (Identity failure)
    // ========================================================================
    await test('Authenticated token missing user ID is rejected with HTTP 401', async () => {
      const tokenWithoutId = jwt.sign(
        { role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenWithoutId}`
        },
        body: JSON.stringify({ so_number: SO_MISSING_ID })
      });

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.ok(body.error.includes('Missing or invalid user identity'));

      // Verify order not modified
      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [SO_MISSING_ID]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    // ========================================================================
    // TEST 5: Unresolvable Approver Identity (User not in database)
    // ========================================================================
    await test('Authenticated token with unresolvable user ID (not in DB) fails closed with HTTP 403', async () => {
      const ghostUserToken = jwt.sign(
        { id: 9876543, role: 'Chairman & CEO', email: 'ghost@yaf.com', name: 'Ghost Approver' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ghostUserToken}`
        },
        body: JSON.stringify({ so_number: SO_UNRESOLVABLE })
      });

      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('Unable to establish trusted approver identity'));
      assert.ok(body.error.includes('User record not found') || body.error.includes('does not exist'));

      // Ensure order remains untouched
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_UNRESOLVABLE]);
      assert.strictEqual(rows[0].status, 'Pending approval');
      assert.strictEqual(rows[0].approval_step, 'CEO Waiting');

      // Ensure no success audit log was written
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER"',
        [SO_UNRESOLVABLE]
      );
      assert.strictEqual(auditRows.length, 0, 'No success audit log should be written for rejected approval');
    });

    // ========================================================================
    // TEST 6: Inactive approver account rejected
    // ========================================================================
    await test('Authenticated user with inactive account status fails closed with HTTP 403', async () => {
      const inactiveUser = await createTestUser({
        name: 'Disabled Director',
        role: 'Director Finance',
        status: 'inactive'
      });

      const inactiveToken = jwt.sign(
        { id: inactiveUser.id, role: inactiveUser.role, email: inactiveUser.email, name: inactiveUser.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inactiveToken}`
        },
        body: JSON.stringify({ so_number: SO_INACTIVE_USER })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is inactive or disabled'));

      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [SO_INACTIVE_USER]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    // ========================================================================
    // TEST 7: Approver with empty name on record fails closed (No fabrication)
    // ========================================================================
    await test('Approver with empty name in database fails closed with HTTP 403 (No generic fallback)', async () => {
      const emptyNameUser = await createTestUser({
        name: '   ',
        role: 'Director Finance',
        status: 'active'
      });

      const emptyNameToken = jwt.sign(
        { id: emptyNameUser.id, role: emptyNameUser.role, email: emptyNameUser.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${emptyNameToken}`
        },
        body: JSON.stringify({ so_number: SO_EMPTY_NAME_USER })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('no verified name on record'));

      // Verify order NOT updated and no generic string used
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_EMPTY_NAME_USER]);
      assert.strictEqual(rows[0].status, 'Pending approval');
      assert.ok(!rows[0].approval_step.includes('Authorized Approver'));
      assert.ok(!rows[0].approval_step.includes('undefined'));
    });

    // ========================================================================
    // TEST 8: Non-approver role receives HTTP 403 Forbidden
    // ========================================================================
    await test('Authenticated request with non-approver role (Sales Officer) receives HTTP 403 Forbidden', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nonApproverToken}`
        },
        body: JSON.stringify({ so_number: SO_NON_APPROVER })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied: Role "Sales Officer" is not authorized to approve sales orders'));

      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [SO_NON_APPROVER]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    // ========================================================================
    // TEST 9: Legacy JWT without name claim correctly resolves trusted user name
    // ========================================================================
    await test('Legacy token without name claim resolves authentic name from database and approves order', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${legacyCeoTokenNoName}`
        },
        body: JSON.stringify({ so_number: SO_LEGACY_TOKEN })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, 'Approved');
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');

      // Verify in database
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_LEGACY_TOKEN]);
      assert.strictEqual(rows[0].status, 'Approved');
      assert.strictEqual(rows[0].approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
      assert.ok(!rows[0].approval_step.includes('undefined'));

      // Verify audit log
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER" ORDER BY id DESC LIMIT 1',
        [SO_LEGACY_TOKEN]
      );
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].user_id, 1);
      assert.strictEqual(auditRows[0].user_name, 'Sana Ullah');
      assert.strictEqual(auditRows[0].role, 'Chairman & CEO');
      assert.strictEqual(auditRows[0].details, `Chairman & CEO (Sana Ullah) approved sales order ${SO_LEGACY_TOKEN}`);
      assert.ok(!auditRows[0].details.includes('undefined'));
      assert.ok(!auditRows[0].user_name.includes('User'));
    });

    // ========================================================================
    // TEST 10: Anti-spoofing — Client-supplied body/query identity strictly ignored
    // ========================================================================
    await test('Client-supplied body/query identity parameters cannot spoof approver identity', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve?name=AttackerQuery&user=EvilQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({
          so_number: SO_SPOOF_ATTEMPT,
          name: 'Spoofed Body Name',
          approver: 'Evil Approver',
          user: 'Hacker',
          userId: 9999,
          role: 'SuperAdmin'
        })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
      assert.ok(!body.order.approval_step.includes('Spoofed'));
      assert.ok(!body.order.approval_step.includes('Evil'));
      assert.ok(!body.order.approval_step.includes('SuperAdmin'));

      // Check database sales order row
      const [rows] = await db.query('SELECT approval_step FROM sales_orders WHERE so_number = ?', [SO_SPOOF_ATTEMPT]);
      assert.strictEqual(rows[0].approval_step, 'Approved by Sana Ullah (Chairman & CEO)');

      // Check audit log
      const [auditRows] = await db.query(
        'SELECT user_id, user_name, role, details FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER" ORDER BY id DESC LIMIT 1',
        [SO_SPOOF_ATTEMPT]
      );
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].user_id, 1);
      assert.strictEqual(auditRows[0].user_name, 'Sana Ullah');
      assert.strictEqual(auditRows[0].role, 'Chairman & CEO');
      assert.ok(!auditRows[0].details.includes('Spoofed'));
      assert.ok(!auditRows[0].details.includes('Evil'));
    });

    // ========================================================================
    // TEST 11: Route 2 — POST /api/sales/orders/:so_number/approve
    // ========================================================================
    await test('Route POST /api/sales/orders/:so_number/approve succeeds and attributes identity correctly', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${SO_SECOND_ROUTE}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${salesManagerToken}`
        }
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, 'Approved');
      assert.strictEqual(body.order.approval_step, 'Approved by Imran Khattak (Sales Manager)');

      const [rows] = await db.query('SELECT approval_step FROM sales_orders WHERE so_number = ?', [SO_SECOND_ROUTE]);
      assert.strictEqual(rows[0].approval_step, 'Approved by Imran Khattak (Sales Manager)');

      const [auditRows] = await db.query(
        'SELECT user_id, user_name, role, details FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER" ORDER BY id DESC LIMIT 1',
        [SO_SECOND_ROUTE]
      );
      assert.strictEqual(auditRows[0].user_id, 13);
      assert.strictEqual(auditRows[0].user_name, 'Imran Khattak');
      assert.strictEqual(auditRows[0].role, 'Sales Manager');
    });

    // ========================================================================
    // TEST 12: Cannot re-approve already approved order (HTTP 400)
    // ========================================================================
    await test('Cannot approve an order already in Approved status (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: SO_LEGACY_TOKEN })
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Cannot approve order'));
      assert.ok(body.error.includes('already in "Approved" status'));
    });

    // ========================================================================
    // TEST 13: Approving non-existent order returns HTTP 404
    // ========================================================================
    await test('Approving non-existent sales order returns HTTP 404', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: `SO-NON-EXISTENT-${RUN_SIGNATURE}` })
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.ok(body.error.includes('not found'));
    });

  } finally {
    // ========================================================================
    // SAFE CLEANUP: Only delete rows explicitly created during this run
    // ========================================================================
    console.log('\n[Safe Cleanup] Executing targeted cleanup of run-created records...');

    if (createdOrderNumbers.size > 0) {
      const orderList = Array.from(createdOrderNumbers);
      await db.query('DELETE FROM audit_logs WHERE entity_id IN (?)', [orderList]);
      await db.query('DELETE FROM sales_orders WHERE so_number IN (?)', [orderList]);
      console.log(`[Safe Cleanup] Removed ${orderList.length} test sales order(s) and associated audit log(s).`);
    }

    if (createdUserIds.size > 0) {
      const userList = Array.from(createdUserIds);
      await db.query('DELETE FROM users WHERE id IN (?)', [userList]);
      console.log(`[Safe Cleanup] Removed ${userList.length} temporary test user(s).`);
    }

    // Close ephemeral test server
    await new Promise((resolve) => server.close(resolve));
    console.log('[Safe Cleanup] Ephemeral test server closed cleanly.');
  }

  console.log(`\n====================================================================`);
  console.log(`Final Result: ${passed} / ${total} tests passed.`);
  console.log(`====================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
  process.exit(0);
}

runSafeTestSuite().catch((err) => {
  console.error('Fatal unhandled error during test suite execution:', err);
  process.exit(1);
});
