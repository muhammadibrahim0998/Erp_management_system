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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/workflowApprovalAuth.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

// Ensure JWT_SECRET and db pool load with the safe test database environment
const { db } = require('../config/db');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const auditLogger = require('../utils/auditLogger');
const operationsRoutes = require('../routes/operations.routes');

async function runWorkflowApprovalTestSuite() {
  console.log('====================================================================');
  console.log('SEC-03 WORKFLOW APPROVAL HARDENING & DELEGATION REGRESSION SUITE');
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
  assert.ok(
    !activeDbName.toLowerCase().includes('management'),
    'FATAL ABORT: Attempting to connect to operational database!'
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
  const RUN_SIGNATURE = 'SEC03_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const createdTaskIds = new Set();
  const createdPoNumbers = new Set();
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

  // Helper to create an isolated test user
  async function createTestUser({ name, role, email, status = 'active', token_version = 1, department = 'General' }) {
    const uniqueEmail = `sec03_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status, token_version)
       VALUES (?, ?, ?, 'TU', ?, 'hashed_pass_placeholder', ?, ?)`,
      [name, role, department, email || uniqueEmail, status, token_version]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    const token = jwt.sign(
      { id: userId, email: email || uniqueEmail, role, token_version },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    return { id: userId, name, role, email: email || uniqueEmail, status, token_version, token };
  }

  // Helper to create an isolated test workflow task
  async function createTestTask({
    doc_number = `DOC-${RUN_SIGNATURE}-${Date.now()}`,
    doc_type = 'Production order',
    title = 'Test Workflow Task',
    party = 'Test Supplier',
    amount = 150000.00,
    priority = 'normal',
    action_label = 'Approve task',
    waiting_since = '1 h ago',
    status = 'pending',
    assigned_role = 'Production Manager'
  }) {
    const [result] = await db.query(
      `INSERT INTO workflow_tasks
       (doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role]
    );
    const taskId = result.insertId;
    createdTaskIds.add(taskId);
    return { id: taskId, doc_number, doc_type, amount, status, assigned_role };
  }

  // Helper to create an isolated test purchase order
  async function createTestPo({
    po_number = `PO-${RUN_SIGNATURE}-${Date.now()}`,
    po_date = '24 Oct 2026',
    supplier = 'Test Feed Supplier',
    status = 'Draft',
    created_by = 'Test Creator',
    amount = 450000.00,
    items_count = 1
  }) {
    await db.query(
      `INSERT INTO purchase_orders
       (po_number, po_date, supplier, status, created_by, amount, items_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [po_number, po_date, supplier, status, created_by, amount, items_count]
    );
    createdPoNumbers.add(po_number);
    return { po_number, amount, created_by, status };
  }

  try {
    // ------------------------------------------------------------------------
    // SETUP TEST PERSONAS
    // ------------------------------------------------------------------------
    console.log('🔧 Provisioning test personas...');
    const userFarhan = await createTestUser({ name: 'Farhan Ali', role: 'Production Manager', department: 'Production' });
    const userDrAsma = await createTestUser({ name: 'Dr. Asma Noor', role: 'QC Cell', department: 'Quality' });
    const userCeo = await createTestUser({ name: 'Sana Ullah', role: 'Chairman & CEO', department: 'Executive' });
    const userGm = await createTestUser({ name: 'Khalid Mehmood', role: 'General Manager', department: 'Executive' });
    const userDirOps = await createTestUser({ name: 'Saeed ur Rehman', role: 'Director Operations', department: 'Operations' });
    const userDirFin = await createTestUser({ name: 'Mujeeb Ullah', role: 'Director Finance', department: 'Finance' });
    const userAdmin = await createTestUser({ name: 'Kamran Ali', role: 'ERP Admin', department: 'IT' });
    const userStaff = await createTestUser({ name: 'Gul Rehman', role: 'Staff', department: 'Security' });
    const userBuyer = await createTestUser({ name: 'Waqar Ahmad', role: 'Procurement', department: 'Purchasing' });

    const userSuspended = await createTestUser({ name: 'Suspended User', role: 'Production Manager', status: 'suspended' });
    const userRevoked = await createTestUser({ name: 'Revoked User', role: 'Production Manager', token_version: 1 });
    // Revoke token version in database
    await db.query('UPDATE users SET token_version = 2 WHERE id = ?', [userRevoked.id]);

    console.log('✅ Test personas provisioned.\n');

    // ========================================================================
    // 1. AUTHENTICATION & IDENTITY ENFORCEMENT
    // ========================================================================
    await test('T01: Unauthenticated request to GET /api/approvals returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/approvals`);
      assert.strictEqual(res.status, 401);
    });

    await test('T01b: Unauthenticated request to POST /api/approvals/:id/action returns HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/approvals/1/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('T02: Inactive or suspended user token is rejected with HTTP 403', async () => {
      const task = await createTestTask({ assigned_role: 'Production Manager' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSuspended.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
    });

    await test('T03: Revoked token (token_version mismatch) is rejected with HTTP 401', async () => {
      const task = await createTestTask({ assigned_role: 'Production Manager' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userRevoked.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 401);
    });

    // ========================================================================
    // 2. DEC-02: ERP ADMIN BARRED FROM WORKFLOW APPROVALS
    // ========================================================================
    await test('T04: DEC-02: ERP Admin is barred from operational & financial approvals (HTTP 403)', async () => {
      const task = await createTestTask({ assigned_role: 'ERP Admin' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAdmin.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('ERP Admin is barred'), `Expected barred message, got: ${data.error}`);
    });

    // ========================================================================
    // 3. DEC-03: EXACT NAMED AND ROLE ASSIGNEE MATCHING & PRECEDENCE
    // ========================================================================
    await test('T05: DEC-03: Authorized named assignee succeeds with HTTP 200', async () => {
      const task = await createTestTask({
        doc_type: 'Production order',
        assigned_role: 'Farhan Ali'
      });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.task.status, 'approved');

      // Verify DB state
      const [rows] = await db.query('SELECT status FROM workflow_tasks WHERE id = ?', [task.id]);
      assert.strictEqual(rows[0].status, 'approved');
    });

    await test('T06: DEC-03: Authorized role assignee succeeds with HTTP 200', async () => {
      const task = await createTestTask({
        doc_type: 'Gate pass — inward',
        assigned_role: 'QC Cell'
      });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userDrAsma.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.task.status, 'approved');
    });

    await test('T07: DEC-03: Similar, substring, or partial name match does NOT confer authority (HTTP 403)', async () => {
      const task = await createTestTask({
        doc_type: 'Production order',
        assigned_role: 'Farhan Ali'
      });
      // User with partial name 'Farhan' or 'Ali' must fail
      const userPartial = await createTestUser({ name: 'Farhan', role: 'Staff' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userPartial.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
    });

    await test('T08: Unauthorized operational user (e.g. Staff on Production order) is denied (HTTP 403)', async () => {
      const task = await createTestTask({ assigned_role: 'Production Manager' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userStaff.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
    });

    // ========================================================================
    // 4. DEC-06: LEAST-PRIVILEGE INBOX VISIBILITY
    // ========================================================================
    await test('T09: DEC-06: Least-privilege approval inbox scoping', async () => {
      const taskProd = await createTestTask({ title: `Prod Task ${RUN_SIGNATURE}`, assigned_role: 'Farhan Ali' });
      const taskQc = await createTestTask({ title: `QC Task ${RUN_SIGNATURE}`, assigned_role: 'Dr. Asma Noor' });

      // 1. CEO sees all tasks
      const resCeo = await fetch(`${BASE_URL}/approvals`, {
        headers: { 'Authorization': `Bearer ${userCeo.token}` }
      });
      const dataCeo = await resCeo.json();
      assert.ok(dataCeo.some(t => t.id === taskProd.id));
      assert.ok(dataCeo.some(t => t.id === taskQc.id));

      // 2. Farhan Ali sees only his task
      const resFarhan = await fetch(`${BASE_URL}/approvals`, {
        headers: { 'Authorization': `Bearer ${userFarhan.token}` }
      });
      const dataFarhan = await resFarhan.json();
      assert.ok(dataFarhan.some(t => t.id === taskProd.id));
      assert.ok(!dataFarhan.some(t => t.id === taskQc.id));

      // 3. Staff sees empty array
      const resStaff = await fetch(`${BASE_URL}/approvals`, {
        headers: { 'Authorization': `Bearer ${userStaff.token}` }
      });
      const dataStaff = await resStaff.json();
      assert.strictEqual(dataStaff.length, 0);

      // 4. ERP Admin sees empty array (DEC-02: A)
      const resAdmin = await fetch(`${BASE_URL}/approvals`, {
        headers: { 'Authorization': `Bearer ${userAdmin.token}` }
      });
      const dataAdmin = await resAdmin.json();
      assert.strictEqual(dataAdmin.length, 0);
    });

    // ========================================================================
    // 5. DEC-04 & DEC-01: THREE-TIER MONETARY DELEGATION & CEO-EXCLUSIVE BAND 3
    // ========================================================================
    await test('T10: DEC-04: Band 1 PO (PKR 350k) approved by Director Finance succeeds (HTTP 200)', async () => {
      const poNum = `PO-B1-${RUN_SIGNATURE}`;
      await createTestPo({ po_number: poNum, amount: 350000.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 350000.00,
        assigned_role: 'Director Finance'
      });

      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userDirFin.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 200);

      // Verify PO status synchronized
      const [poRows] = await db.query('SELECT status FROM purchase_orders WHERE po_number = ?', [poNum]);
      assert.strictEqual(poRows[0].status, 'Approved');
    });

    await test('T11: DEC-04: Band 2 PO (PKR 1.2M) requires Director Finance, GM, or CEO (unauthorized role receives HTTP 403)', async () => {
      const poNum = `PO-B2-${RUN_SIGNATURE}`;
      await createTestPo({ po_number: poNum, amount: 1200000.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 1200000.00,
        assigned_role: 'Director Finance'
      });

      // Production Manager attempts approval -> 403
      const resDenied = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(resDenied.status, 403);

      // General Manager attempts approval -> 200 (GM operational override in Band 2)
      const resAllowed = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userGm.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(resAllowed.status, 200);
    });

    await test('T12: DEC-01 & DEC-04: Band 3 PO (> PKR 2.5M) attempted GM override is DENIED with HTTP 403', async () => {
      const poNum = `PO-B3-${RUN_SIGNATURE}-1`;
      await createTestPo({ po_number: poNum, amount: 2900000.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 2900000.00,
        assigned_role: 'General Manager'
      });

      // GM attempts approval on Band 3 -> MUST BE DENIED EXCLUSIVELY FOR CEO
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userGm.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('Chairman & CEO authorization exclusively'), `Expected CEO exclusive message, got: ${data.error}`);
    });

    await test('T13: DEC-01 & DEC-04: Band 3 PO (> PKR 2.5M) approved by Chairman & CEO succeeds with HTTP 200', async () => {
      const poNum = `PO-B3-${RUN_SIGNATURE}-2`;
      await createTestPo({ po_number: poNum, amount: 2943392.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 2943392.00,
        assigned_role: 'Chairman & CEO'
      });

      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userCeo.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    await test('T14: Client-supplied amount or spoofed payload is ignored in favor of trusted database record', async () => {
      const poNum = `PO-SPOOF-${RUN_SIGNATURE}`;
      // In DB, PO is 3.5M (Band 3)
      await createTestPo({ po_number: poNum, amount: 3500000.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 3500000.00,
        assigned_role: 'General Manager'
      });

      // GM sends request body attempting to claim amount is 100k
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userGm.token}`
        },
        body: JSON.stringify({ action: 'approved', amount: 100000 })
      });
      // MUST FAIL because DB amount is 3.5M requiring CEO exclusively
      assert.strictEqual(res.status, 403);
    });

    // ========================================================================
    // 6. DEC-05: SEGREGATION OF DUTIES (SOD)
    // ========================================================================
    await test('T15: DEC-05: Segregation of Duties — Document creator attempting to approve their own PO is denied (HTTP 403)', async () => {
      const poNum = `PO-SOD-${RUN_SIGNATURE}`;
      // Creator is Waqar Ahmad
      await createTestPo({ po_number: poNum, amount: 250000.00, created_by: 'Waqar Ahmad' });
      const task = await createTestTask({
        doc_number: poNum,
        doc_type: 'Purchase order',
        amount: 250000.00,
        assigned_role: 'Waqar Ahmad'
      });

      // Waqar Ahmad attempts to approve his own PO
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userBuyer.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('Separation of duties violation'), `Expected SOD message, got: ${data.error}`);
    });

    await test('T16: Missing underlying PO record fails closed with HTTP 403', async () => {
      const task = await createTestTask({
        doc_number: `PO-NONEXISTENT-${RUN_SIGNATURE}`,
        doc_type: 'Purchase order',
        amount: 200000.00,
        assigned_role: 'Director Finance'
      });

      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userDirFin.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 403);
    });

    // ========================================================================
    // 7. DEC-07: ACTIONS, REASONS, AND STATE TRANSITIONS
    // ========================================================================
    await test('T17: Empty or missing reason for action "rejected" or "returned" is rejected with HTTP 400', async () => {
      const task1 = await createTestTask({ assigned_role: 'Farhan Ali' });
      const resReject = await fetch(`${BASE_URL}/approvals/${task1.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'rejected', reason: '' })
      });
      assert.strictEqual(resReject.status, 400);

      const task2 = await createTestTask({ assigned_role: 'Farhan Ali' });
      const resReturn = await fetch(`${BASE_URL}/approvals/${task2.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'returned' }) // missing reason
      });
      assert.strictEqual(resReturn.status, 400);
    });

    await test('T18: Valid "returned" and "rejected" actions with non-empty reason succeed (HTTP 200)', async () => {
      const taskReturn = await createTestTask({ assigned_role: 'Farhan Ali' });
      const resReturn = await fetch(`${BASE_URL}/approvals/${taskReturn.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'returned', reason: 'Need revised recipe specifications' })
      });
      assert.strictEqual(resReturn.status, 200);

      const [rowReturn] = await db.query('SELECT status FROM workflow_tasks WHERE id = ?', [taskReturn.id]);
      assert.strictEqual(rowReturn[0].status, 'returned');

      const taskReject = await createTestTask({ assigned_role: 'Farhan Ali' });
      const resReject = await fetch(`${BASE_URL}/approvals/${taskReject.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'rejected', reason: 'Unacceptable bacterial count' })
      });
      assert.strictEqual(resReject.status, 200);

      const [rowReject] = await db.query('SELECT status FROM workflow_tasks WHERE id = ?', [taskReject.id]);
      assert.strictEqual(rowReject[0].status, 'rejected');
    });

    await test('T19: Terminal state protection: Attempting to act on non-pending task returns HTTP 400', async () => {
      const task = await createTestTask({ assigned_role: 'Farhan Ali', status: 'approved' });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Only pending tasks can receive a decision'), `Expected pending guard, got: ${data.error}`);
    });

    await test('T20: Concurrent decisions race condition: Exactly one succeeds, second fails (HTTP 400)', async () => {
      const task = await createTestTask({ assigned_role: 'Farhan Ali' });

      // Send two simultaneous requests to approve the same task
      const [res1, res2] = await Promise.all([
        fetch(`${BASE_URL}/approvals/${task.id}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userFarhan.token}`
          },
          body: JSON.stringify({ action: 'approved' })
        }),
        fetch(`${BASE_URL}/approvals/${task.id}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userFarhan.token}`
          },
          body: JSON.stringify({ action: 'approved' })
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(
        statuses,
        [200, 400],
        `Expected exactly one 200 and one 400 in concurrent race, got: ${res1.status} and ${res2.status}`
      );
    });

    await test('T21: Action "completed" is accepted for authorized operational workflow (HTTP 200)', async () => {
      const task = await createTestTask({
        doc_type: 'Production order',
        assigned_role: 'Farhan Ali'
      });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userFarhan.token}`
        },
        body: JSON.stringify({ action: 'completed' })
      });
      assert.strictEqual(res.status, 200);

      const [rows] = await db.query('SELECT status FROM workflow_tasks WHERE id = ?', [task.id]);
      assert.strictEqual(rows[0].status, 'completed');
    });

    await test('T22: Transactional atomicity: Audit failure triggers complete rollback to pending', async () => {
      const task = await createTestTask({ assigned_role: 'Farhan Ali' });

      // Temporarily mock logAudit to simulate database deadlock / audit failure
      const originalLogAudit = auditLogger.logAudit;
      auditLogger.logAudit = async () => {
        throw new Error('Simulated atomic audit failure');
      };

      try {
        const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userFarhan.token}`
          },
          body: JSON.stringify({ action: 'approved' })
        });
        assert.strictEqual(res.status, 500);

        // Verify task status was NOT updated to 'approved' — must remain 'pending'
        const [rows] = await db.query('SELECT status FROM workflow_tasks WHERE id = ?', [task.id]);
        assert.strictEqual(
          rows[0].status,
          'pending',
          'Task status must remain "pending" when audit insertion fails!'
        );
      } finally {
        auditLogger.logAudit = originalLogAudit;
      }
    });

    // ========================================================================
    // 8. D2.18 RESIDUAL ACCESS CONTROL & AUDIT REMEDIATION (F2 & F3)
    // ========================================================================
    await test('T23: DEC-06 & F3: ERP Admin calling GET /api/dashboard/chairman receives empty waitingApprovals', async () => {
      const task = await createTestTask({ assigned_role: 'Farhan Ali', status: 'pending' });

      // 1. ERP Admin requests dashboard
      const resAdmin = await fetch(`${BASE_URL}/dashboard/chairman`, {
        headers: { 'Authorization': `Bearer ${userAdmin.token}` }
      });
      assert.strictEqual(resAdmin.status, 200);
      const dataAdmin = await resAdmin.json();
      assert.ok(Array.isArray(dataAdmin.waitingApprovals), 'waitingApprovals must be an array');
      assert.strictEqual(dataAdmin.waitingApprovals.length, 0, 'ERP Admin must receive 0 waitingApprovals');
      assert.ok(dataAdmin.kpis && dataAdmin.kpis.revenue, 'ERP Admin still receives executive KPI data');

      // 2. Chairman & CEO requests dashboard and receives pending tasks
      const resCeo = await fetch(`${BASE_URL}/dashboard/chairman`, {
        headers: { 'Authorization': `Bearer ${userCeo.token}` }
      });
      assert.strictEqual(resCeo.status, 200);
      const dataCeo = await resCeo.json();
      assert.ok(dataCeo.waitingApprovals.some(t => t.id === task.id), 'Chairman & CEO must see pending task');
    });

    await test('T24: F2: Operational workflow approval records sod_status "CREATOR_UNRECORDED"', async () => {
      const task = await createTestTask({
        doc_type: 'Gate pass — inward',
        assigned_role: 'QC Cell'
      });
      const res = await fetch(`${BASE_URL}/approvals/${task.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userDrAsma.token}`
        },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 200);

      // Verify audit log record
      const [auditRows] = await db.query(
        'SELECT details FROM audit_logs WHERE entity_type = "WORKFLOW" AND entity_id = ? ORDER BY id DESC LIMIT 1',
        [String(task.id)]
      );
      assert.ok(auditRows.length > 0, 'Audit record must be created');
      const details = JSON.parse(auditRows[0].details);
      assert.strictEqual(details.sod_status, 'CREATOR_UNRECORDED');
      assert.notStrictEqual(details.sod_status, 'OPERATIONAL_STEP_VERIFIED');
    });

    console.log('\n====================================================================');
    console.log(`TEST SUITE RESULTS: ${passed}/${total} PASSING`);
    console.log('====================================================================\n');
  } finally {
    // ------------------------------------------------------------------------
    // STRICT CLEANUP: REMOVE ALL ISOLATED SYNTHETIC TEST RECORDS
    // ------------------------------------------------------------------------
    console.log('🧹 Executing isolated test cleanup...');
    if (createdTaskIds.size > 0) {
      await db.query(`DELETE FROM workflow_tasks WHERE id IN (${Array.from(createdTaskIds).join(',')})`);
      await db.query(`DELETE FROM audit_logs WHERE entity_type = 'WORKFLOW' AND entity_id IN (${Array.from(createdTaskIds).map(id => `'${id}'`).join(',')})`);
    }
    if (createdPoNumbers.size > 0) {
      const poPlaceholders = Array.from(createdPoNumbers).map(() => '?').join(',');
      await db.query(`DELETE FROM purchase_orders WHERE po_number IN (${poPlaceholders})`, Array.from(createdPoNumbers));
    }
    if (createdUserIds.size > 0) {
      await db.query(`DELETE FROM users WHERE id IN (${Array.from(createdUserIds).join(',')})`);
    }

    server.close();
    console.log('✅ Cleanup complete. Ephemeral server closed.\n');
  }
}

runWorkflowApprovalTestSuite()
  .then(() => {
    process.exit(process.exitCode || 0);
  })
  .catch((err) => {
    console.error('Fatal test execution failure:', err);
    process.exit(1);
  });
