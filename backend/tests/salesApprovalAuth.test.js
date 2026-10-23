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
const auditLogger = require('../utils/auditLogger');
const operationsRoutes = require('../routes/operations.routes');

async function runSafeTestSuite() {
  console.log('====================================================================');
  console.log('SALES APPROVAL SECURITY & AUDIT INTEGRITY REGRESSION TEST SUITE');
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
    const SO_MISSING_ID = await createTestOrder('NO_ID');
    const SO_DELETED_USER = await createTestOrder('DEL_USER');
    const SO_DOWNGRADED_ROLE = await createTestOrder('DOWN_ROLE');
    const SO_FORGED_ROLE = await createTestOrder('FORGE_ROLE');
    const SO_NULL_STATUS = await createTestOrder('NULL_STAT');
    const SO_EMPTY_STATUS = await createTestOrder('EMPTY_STAT');
    const SO_WHITESPACE_STATUS = await createTestOrder('WS_STAT');
    const SO_INACTIVE_STATUS = await createTestOrder('INACT_STAT');
    const SO_SUSPENDED_STATUS = await createTestOrder('SUSP_STAT');
    const SO_EMPTY_NAME = await createTestOrder('EMPTY_NAME');
    const SO_SUCCESS_ATOMIC = await createTestOrder('SUCC_ATOM');
    const SO_ROLLBACK_AUDIT = await createTestOrder('RB_AUDIT');
    const SO_SPOOF_ATTEMPT = await createTestOrder('SPOOF');
    const SO_LEGACY_TOKEN = await createTestOrder('LEGACY');
    const SO_ROUTE_2 = await createTestOrder('ROUTE2');

    // Standard valid CEO token (User ID 1 = Sana Ullah, Chairman & CEO in DB)
    const validCeoToken = jwt.sign(
      { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com', name: 'Sana Ullah' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ========================================================================
    // 1. ROUTE-LEVEL AUTHENTICATION ENFORCEMENT
    // ========================================================================
    await test('Unauthenticated POST /api/sales/approve returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: SO_UNAUTH_1 })
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');

      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [SO_UNAUTH_1]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    await test('Unauthenticated POST /api/sales/orders/:so_number/approve returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${SO_UNAUTH_2}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.error, 'Access denied. Token missing.');
    });

    await test('Request with invalid / expired / malformed token returns HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer malformed.token.value'
        },
        body: JSON.stringify({ so_number: SO_INVALID_TOKEN })
      });
      assert.strictEqual(res.status, 403);
    });

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
    });

    // ========================================================================
    // 2. F-01: DATABASE ROLE AUTHORIZATION (NEVER TRUST STALE/FORGED JWT ROLE)
    // ========================================================================
    await test('F-01: User deleted or not present in database fails closed with HTTP 403', async () => {
      const nonExistentToken = jwt.sign(
        { id: 9876543, role: 'Chairman & CEO', email: 'ghost@yaf.com', name: 'Ghost' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${nonExistentToken}`
        },
        body: JSON.stringify({ so_number: SO_DELETED_USER })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Authenticated user record does not exist'));

      const [rows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [SO_DELETED_USER]);
      assert.strictEqual(rows[0].status, 'Pending approval');
    });

    await test('F-01: User whose role was downgraded in DB fails closed with HTTP 403 despite stale authorized JWT', async () => {
      // Create user with authorized role initially
      const user = await createTestUser({
        name: 'Tariq Demoted',
        role: 'Sales Manager',
        status: 'active'
      });

      // User was issued a valid token when role was 'Sales Manager'
      const staleToken = jwt.sign(
        { id: user.id, role: 'Sales Manager', email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Admin downgrades user in MySQL to 'Sales Officer' (non-approver role)
      await db.query('UPDATE users SET role = "Sales Officer" WHERE id = ?', [user.id]);

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staleToken}`
        },
        body: JSON.stringify({ so_number: SO_DOWNGRADED_ROLE })
      });

      assert.strictEqual(res.status, 403, `Expected HTTP 403, got ${res.status}`);
      const body = await res.json();
      assert.ok(body.error.includes('Current user role "Sales Officer" is not authorized'));

      // Order must remain unapproved
      const [rows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_DOWNGRADED_ROLE]);
      assert.strictEqual(rows[0].status, 'Pending approval');
      assert.strictEqual(rows[0].approval_step, 'CEO Waiting');

      // No audit log written
      const [audits] = await db.query('SELECT * FROM audit_logs WHERE entity_id = ?', [SO_DOWNGRADED_ROLE]);
      assert.strictEqual(audits.length, 0);
    });

    await test('F-01: Unauthorized DB role with forged authorized JWT claim is rejected with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Gate Officer Khan',
        role: 'Gate Officer',
        status: 'active'
      });

      // Token claims role is 'Chairman & CEO'
      const forgedRoleToken = jwt.sign(
        { id: user.id, role: 'Chairman & CEO', email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${forgedRoleToken}`
        },
        body: JSON.stringify({ so_number: SO_FORGED_ROLE })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Current user role "Gate Officer" is not authorized'));
    });

    // ========================================================================
    // 3. F-02: ACCOUNT STATUS FAILS CLOSED (EXACTLY 'active' REQUIRED)
    // ========================================================================
    await test('F-02: Database user with NULL status fails closed with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Null Status User',
        role: 'Director Finance',
        status: 'active'
      });
      await db.query('UPDATE users SET status = NULL WHERE id = ?', [user.id]);

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_NULL_STATUS })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is not active'));
    });

    await test('F-02: Database user with empty status string fails closed with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Empty Status User',
        role: 'Director Finance',
        status: ''
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_EMPTY_STATUS })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is not active'));
    });

    await test('F-02: Database user with whitespace-only status fails closed with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Whitespace Status User',
        role: 'Director Finance',
        status: '   '
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_WHITESPACE_STATUS })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is not active'));
    });

    await test('F-02: Database user with inactive status fails closed with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Inactive Status User',
        role: 'Director Finance',
        status: 'inactive'
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_INACTIVE_STATUS })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is not active'));
    });

    await test('F-02: Database user with suspended/unexpected status fails closed with HTTP 403', async () => {
      const user = await createTestUser({
        name: 'Suspended Status User',
        role: 'Director Finance',
        status: 'suspended'
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_SUSPENDED_STATUS })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Approver account is not active'));
    });

    await test('User with empty name fails closed with HTTP 403 (No generic placeholder)', async () => {
      const user = await createTestUser({
        name: '   ',
        role: 'Director Finance',
        status: 'active'
      });

      const token = jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ so_number: SO_EMPTY_NAME })
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.toLowerCase().includes('no verified name on record'));
    });

    // ========================================================================
    // 4. F-03: ATOMIC SALES ORDER APPROVAL & AUDIT LOGGING
    // ========================================================================
    await test('F-03: Successful approval updates order and creates exactly one audit record atomically', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: SO_SUCCESS_ATOMIC })
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, 'Approved');
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');

      // Verify in sales_orders table
      const [orderRows] = await db.query('SELECT status, approval_step FROM sales_orders WHERE so_number = ?', [SO_SUCCESS_ATOMIC]);
      assert.strictEqual(orderRows.length, 1);
      assert.strictEqual(orderRows[0].status, 'Approved');
      assert.strictEqual(orderRows[0].approval_step, 'Approved by Sana Ullah (Chairman & CEO)');

      // Verify in audit_logs table: EXACTLY ONE record
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER"',
        [SO_SUCCESS_ATOMIC]
      );
      assert.strictEqual(auditRows.length, 1, 'Expected exactly one audit log entry for successful approval');
      assert.strictEqual(auditRows[0].user_id, 1);
      assert.strictEqual(auditRows[0].user_name, 'Sana Ullah');
      assert.strictEqual(auditRows[0].role, 'Chairman & CEO');
      assert.strictEqual(auditRows[0].details, `Chairman & CEO (Sana Ullah) approved sales order ${SO_SUCCESS_ATOMIC}`);
    });

    await test('F-03: Simulated audit insertion failure rolls back the sales order update completely', async () => {
      // Temporarily simulate audit write failure for SO_ROLLBACK_AUDIT
      const originalLogAudit = auditLogger.logAudit;
      auditLogger.logAudit = async (params) => {
        if (params.entityId === SO_ROLLBACK_AUDIT) {
          throw new Error('Simulated database audit write failure for rollback test');
        }
        return originalLogAudit(params);
      };

      try {
        const res = await fetch(`${BASE_URL}/sales/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${validCeoToken}`
          },
          body: JSON.stringify({ so_number: SO_ROLLBACK_AUDIT })
        });

        // Must fail with HTTP 500
        assert.strictEqual(res.status, 500, `Expected HTTP 500 on audit failure, got ${res.status}`);
        const body = await res.json();
        assert.ok(body.error.includes('Simulated database audit write failure'));

        // VERIFY COMPLETE ROLLBACK: Order in database must STILL be 'Pending approval' / 'CEO Waiting'
        const [orderRows] = await db.query(
          'SELECT status, approval_step FROM sales_orders WHERE so_number = ?',
          [SO_ROLLBACK_AUDIT]
        );
        assert.strictEqual(orderRows.length, 1);
        assert.strictEqual(
          orderRows[0].status,
          'Pending approval',
          'Order status must be rolled back to "Pending approval" upon audit failure!'
        );
        assert.strictEqual(
          orderRows[0].approval_step,
          'CEO Waiting',
          'approval_step must be rolled back to "CEO Waiting" upon audit failure!'
        );

        // Verify zero audit logs exist for this order
        const [auditRows] = await db.query(
          'SELECT * FROM audit_logs WHERE entity_id = ?',
          [SO_ROLLBACK_AUDIT]
        );
        assert.strictEqual(auditRows.length, 0, 'No partial or dangling audit log should exist after rollback');

      } finally {
        auditLogger.logAudit = originalLogAudit;
      }
    });

    // ========================================================================
    // 5. ANTI-SPOOFING & SECOND ROUTE VERIFICATION
    // ========================================================================
    await test('Anti-spoofing: Client-supplied body/query identity strictly ignored', async () => {
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
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
      assert.ok(!body.order.approval_step.includes('Spoofed'));
      assert.ok(!body.order.approval_step.includes('SuperAdmin'));
    });

    await test('Legacy token without name claim resolves authentic name from database users record', async () => {
      const legacyToken = jwt.sign(
        { id: 1, role: 'Chairman & CEO', email: 'ceo@yaf.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${legacyToken}`
        },
        body: JSON.stringify({ so_number: SO_LEGACY_TOKEN })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.order.approval_step, 'Approved by Sana Ullah (Chairman & CEO)');
    });

    await test('Route POST /api/sales/orders/:so_number/approve succeeds and attributes identity correctly', async () => {
      const salesManagerToken = jwt.sign(
        { id: 13, role: 'Sales Manager', email: 'sales@yaf.com', name: 'Imran Khattak' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      const res = await fetch(`${BASE_URL}/sales/orders/${SO_ROUTE_2}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${salesManagerToken}`
        }
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.order.approval_step, 'Approved by Imran Khattak (Sales Manager)');

      const [auditRows] = await db.query(
        'SELECT user_id, user_name, role FROM audit_logs WHERE entity_id = ? AND action = "APPROVE_SALES_ORDER"',
        [SO_ROUTE_2]
      );
      assert.strictEqual(auditRows[0].user_id, 13);
      assert.strictEqual(auditRows[0].user_name, 'Imran Khattak');
      assert.strictEqual(auditRows[0].role, 'Sales Manager');
    });

    // ========================================================================
    // 6. INVALID ORDER & STATE TRANSITION CONSTRAINTS
    // ========================================================================
    await test('Cannot re-approve an already approved sales order (HTTP 400)', async () => {
      const res = await fetch(`${BASE_URL}/sales/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validCeoToken}`
        },
        body: JSON.stringify({ so_number: SO_SUCCESS_ATOMIC })
      });
      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.ok(body.error.includes('Cannot approve order'));
      assert.ok(body.error.includes('already in "Approved" status'));
    });

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
