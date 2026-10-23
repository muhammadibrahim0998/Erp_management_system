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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/erpSecurityHardening.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const apiRoutes = require('../routes');

async function runSecurityTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — SECURITY HARDENING REGRESSION TEST SUITE');
  console.log('====================================================================');
  console.log(`[Safety Guard] Node Environment: ${nodeEnv}`);
  console.log(`[Safety Guard] Database Target:   ${currentDb} (ISOLATED TEST DATABASE)`);

  const [dbNameRows] = await db.query('SELECT DATABASE() as active_db');
  const activeDbName = dbNameRows[0]?.active_db;
  assert.strictEqual(
    activeDbName,
    currentDb,
    `Active database mismatch: Expected ${currentDb}, got ${activeDbName}`
  );
  console.log(`[Safety Guard] Verified Connection: Connected to "${activeDbName}"`);

  // Mount entire actual API router under /api
  const app = express();
  app.use(express.json());
  app.use(optionalUserExtractor);
  app.use('/api', apiRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const ephemeralPort = server.address().port;
  const BASE_URL = `http://localhost:${ephemeralPort}/api`;
  console.log(`[Safety Guard] Ephemeral Test Server: Running on port ${ephemeralPort}`);
  console.log('====================================================================\n');

  const RUN_SIGNATURE = 'SEC_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const createdUserIds = new Set();
  const createdUserEmails = new Set();
  const createdOrderNumbers = new Set();
  const createdPoNumbers = new Set();
  const createdPayrollNumbers = new Set();
  const createdItemIds = new Set();
  const createdGatePasses = new Set();

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

  async function createTestUser({ name, role, email, status = 'active', department = 'Testing' }) {
    const uniqueEmail = email || `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@yaf-sec-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status)
       VALUES (?, ?, ?, 'TU', ?, 'hashed_pw_placeholder', ?)`,
      [name, role, department, uniqueEmail, status]
    );
    const userId = result.insertId;
    createdUserIds.add(userId);
    createdUserEmails.add(uniqueEmail);
    return { id: userId, name, role, email: uniqueEmail, status };
  }

  function signToken(user) {
    return jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  try {
    // Standard test actors
    const adminUser = await createTestUser({ name: 'Security Admin', role: 'ERP Admin', department: 'IT' });
    const ceoUser = await createTestUser({ name: 'Executive Chief', role: 'Chairman & CEO', department: 'Executive' });
    const financeUser = await createTestUser({ name: 'Finance Lead', role: 'Director Finance', department: 'Finance' });
    const accountsUser = await createTestUser({ name: 'Accounts Officer Tariq', role: 'Accounts Officer', department: 'Finance' });
    const hrUser = await createTestUser({ name: 'HR Manager Nadia', role: 'HR Manager', department: 'HR' });
    const salesOfficer = await createTestUser({ name: 'Sales Officer Bilal', role: 'Sales Officer', department: 'Sales' });
    const storeUser = await createTestUser({ name: 'Store Keeper Usman', role: 'Raw Material Store', department: 'Inventory' });
    const gateUser = await createTestUser({ name: 'Gate Keeper Gul', role: 'Gate Officer', department: 'Security' });
    const staffUser = await createTestUser({ name: 'Basic Staff Employee', role: 'Staff', department: 'General' });

    const adminToken = signToken(adminUser);
    const accountsToken = signToken(accountsUser);
    const hrToken = signToken(hrUser);
    const salesToken = signToken(salesOfficer);
    const storeToken = signToken(storeUser);
    const gateToken = signToken(gateUser);
    const staffToken = signToken(staffUser);

    // ========================================================================
    // 1. FINDING A: PUBLIC SIGNUP PRIVILEGE ESCALATION PREVENTION
    // ========================================================================
    await test('Finding A: Public signup attempting "Chairman & CEO" role is rejected with HTTP 403', async () => {
      const email = `attacker_ceo_${Date.now()}@evil.com`;
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Evil Attacker',
          email,
          password: 'Password123!',
          role: 'Chairman & CEO'
        })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Privileged or custom roles cannot be self-assigned'));

      const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      assert.strictEqual(rows.length, 0, 'No user record must be created on forbidden role attempt');
    });

    await test('Finding A: Public signup attempting "ERP Admin" role is rejected with HTTP 403', async () => {
      const email = `attacker_admin_${Date.now()}@evil.com`;
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Evil Admin Attacker',
          email,
          password: 'Password123!',
          role: 'ERP Admin'
        })
      });
      assert.strictEqual(res.status, 403);
      const [rows] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      assert.strictEqual(rows.length, 0);
    });

    await test('Finding A: Public signup without role defaults safely to least-privilege "Staff" role', async () => {
      const email = `legit_signup_${Date.now()}@yaf-test.com`;
      createdUserEmails.add(email);
      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Employee',
          email,
          password: 'SafePassword123!'
        })
      });
      assert.ok(res.status === 200 || res.status === 201, `Expected HTTP 200/201, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.user.role, 'Staff');
      createdUserIds.add(body.user.id);

      const [rows] = await db.query('SELECT role, department, status FROM users WHERE id = ?', [body.user.id]);
      assert.strictEqual(rows[0].role, 'Staff');
      assert.strictEqual(rows[0].department, 'General');
      assert.strictEqual(rows[0].status, 'active');
    });

    await test('Finding A: Admin creating user with authorized role succeeds; invalid role rejected', async () => {
      const legitEmail = `admin_created_${Date.now()}@yaf-test.com`;
      createdUserEmails.add(legitEmail);
      const resValid = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'Authorized Plant Manager',
          email: legitEmail,
          password: 'SafePassword123!',
          role: 'Plant Manager',
          department: 'Plant'
        })
      });
      assert.strictEqual(resValid.status, 200);
      const bodyValid = await resValid.json();
      createdUserIds.add(bodyValid.id);
      assert.strictEqual(bodyValid.role, 'Plant Manager');

      // Attempt invalid role
      const resInvalid = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'Bogus Role User',
          email: `bogus_${Date.now()}@yaf-test.com`,
          password: 'SafePassword123!',
          role: 'SuperMasterHacker',
          department: 'IT'
        })
      });
      assert.strictEqual(resInvalid.status, 400);
      const bodyInvalid = await resInvalid.json();
      assert.ok(bodyInvalid.error.includes('Invalid role'));
    });

    // ========================================================================
    // 2. FINDING D: DATABASE-VERIFIED ADMINISTRATIVE AUTHORIZATION (requireAdmin)
    // ========================================================================
    await test('Finding D: requireAdmin rejects non-admin employee with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${salesToken}`
        },
        body: JSON.stringify({
          name: 'Unauthorized Create',
          email: `unauth_${Date.now()}@yaf.com`,
          password: 'Pass123456!',
          role: 'Staff',
          department: 'General'
        })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding D: Demoted admin in DB fails closed with HTTP 403 despite stale admin JWT', async () => {
      const demotedUser = await createTestUser({ name: 'Demoted Admin', role: 'ERP Admin' });
      const staleAdminToken = signToken(demotedUser);

      // Downgrade in MySQL to 'Staff'
      await db.query('UPDATE users SET role = "Staff" WHERE id = ?', [demotedUser.id]);

      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staleAdminToken}`
        },
        body: JSON.stringify({
          name: 'Should Fail',
          email: `fail_${Date.now()}@yaf.com`,
          password: 'Pass123456!',
          role: 'Staff',
          department: 'General'
        })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding D: Suspended admin in DB fails closed with HTTP 403', async () => {
      const suspendedAdmin = await createTestUser({ name: 'Suspended Admin', role: 'ERP Admin', status: 'suspended' });
      const token = signToken(suspendedAdmin);

      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'Should Fail',
          email: `fail_${Date.now()}@yaf.com`,
          password: 'Pass123456!',
          role: 'Staff',
          department: 'General'
        })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('User account is inactive or suspended'));
    });

    // ========================================================================
    // 3. FINDING B: UNAUTHENTICATED SENSITIVE MUTATION ROUTES REJECTION
    // ========================================================================
    await test('Finding B: Unauthenticated POST /api/inventory/adjust is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, adjust_qty: 50, adjustType: 'add' })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/inventory/transfer is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/inventory/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, fromWarehouse: 'MRD', toWarehouse: 'ATK', transfer_qty: 10 })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/pos/checkout is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/pos/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: 1, quantity: 1, unit_price: 100 }],
          paidAmount: 100
        })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/payroll/generate is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: '2026-10' })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/procurement/pos is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/procurement/pos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier: 'Corn Mill Ltd', amount: 500000 })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/sales/orders is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: 'Test Customer', total_amount: 100000 })
      });
      assert.strictEqual(res.status, 401);
    });

    await test('Finding B: Unauthenticated POST /api/approvals/1/action is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/approvals/1/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approved' })
      });
      assert.strictEqual(res.status, 401);
    });

    // ========================================================================
    // 4. FINDING B: ROLE AUTHORIZATION & IDENTITY ATTRIBUTION
    // ========================================================================
    await test('Finding B: Unauthorized role for inventory adjustment is rejected with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        },
        body: JSON.stringify({ id: 1, adjust_qty: 10, adjustType: 'add' })
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.ok(body.error.includes('Access Denied'));
    });

    await test('Finding B: Authorized Store Officer adjusts stock; performed_by records authentic user', async () => {
      // Create isolated test inventory item
      const itemCode = `TEST-ITEM-${RUN_SIGNATURE}`;
      const [itemResult] = await db.query(
        `INSERT INTO inventory_items
         (code, name, category, mrd_qty, total_qty, reorder_at, avg_cost, total_value, status)
         VALUES (?, 'Test Feed Trays', 'Raw Material', 100, 100, 20, 50.00, 5000.00, 'OK')`,
        [itemCode]
      );
      const itemId = itemResult.insertId;
      createdItemIds.add(itemId);

      const res = await fetch(`${BASE_URL}/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storeToken}`
        },
        body: JSON.stringify({
          id: itemId,
          warehouse: 'MRD',
          adjust_qty: 25,
          adjustType: 'add',
          reason: 'Verified Batch Addition'
        })
      });
      assert.strictEqual(res.status, 200);

      // Verify database updated
      const [itemRows] = await db.query('SELECT mrd_qty, total_qty FROM inventory_items WHERE id = ?', [itemId]);
      assert.strictEqual(itemRows[0].mrd_qty, 125);

      // Verify ledger attribution has Store Keeper's authentic name, not generic placeholder
      const [txRows] = await db.query(
        'SELECT performed_by FROM inventory_transactions WHERE item_id = ? ORDER BY id DESC LIMIT 1',
        [itemId]
      );
      assert.ok(txRows[0].performed_by.includes('Store Keeper Usman'));
      assert.ok(!txRows[0].performed_by.includes('Store Manager'));
    });

    await test('Finding B: POS Checkout ignores spoofed cashier name and binds to authenticated user', async () => {
      // Create isolated product for checkout
      const prodCode = `POS-PROD-${RUN_SIGNATURE}`;
      const [prodRes] = await db.query(
        `INSERT INTO inventory_items
         (code, name, category, mrd_qty, total_qty, reorder_at, avg_cost, total_value, status)
         VALUES (?, 'Egg Cartons Premium', 'Finished Goods', 50, 50, 10, 200.00, 10000.00, 'OK')`,
        [prodCode]
      );
      const prodId = prodRes.insertId;
      createdItemIds.add(prodId);

      const res = await fetch(`${BASE_URL}/pos/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${salesToken}`
        },
        body: JSON.stringify({
          items: [{ id: prodId, quantity: 2, unit_price: 250 }],
          paidAmount: 500,
          paymentMethod: 'Cash',
          cashierName: 'Hacker Cashier Spoofed'
        })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();

      // Check DB order record: cashier_name must be 'Sales Officer Bilal', NOT 'Hacker Cashier Spoofed'
      const [orderRows] = await db.query('SELECT cashier_name FROM pos_orders WHERE id = ?', [body.orderId]);
      assert.strictEqual(orderRows[0].cashier_name, 'Sales Officer Bilal');
      assert.ok(!orderRows[0].cashier_name.includes('Spoofed'));
    });

    await test('Finding B: Payroll generation binds prepared_by to authenticated HR user', async () => {
      const res = await fetch(`${BASE_URL}/payroll/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hrToken}`
        },
        body: JSON.stringify({ month: '2026-11' })
      });
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      createdPayrollNumbers.add(body.run_number);

      const [payRows] = await db.query('SELECT prepared_by FROM payroll_runs WHERE run_number = ?', [body.run_number]);
      assert.strictEqual(payRows[0].prepared_by, 'HR Manager Nadia');
    });

    // ========================================================================
    // 5. FINDING C: FAIL-CLOSED INVOICE AND PAYMENT AUTHORIZATION
    // ========================================================================
    await test('Finding C: Unauthenticated invoice and payment endpoints return HTTP 401', async () => {
      const resInv = await fetch(`${BASE_URL}/sales/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: 'SO-DUMMY' })
      });
      assert.strictEqual(resInv.status, 401);

      const resPay = await fetch(`${BASE_URL}/sales/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ so_number: 'SO-DUMMY' })
      });
      assert.strictEqual(resPay.status, 401);
    });

    await test('Finding C: Unauthorized role for invoice is rejected with HTTP 403', async () => {
      const res = await fetch(`${BASE_URL}/sales/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gateToken}`
        },
        body: JSON.stringify({ so_number: 'SO-DUMMY' })
      });
      assert.strictEqual(res.status, 403);
    });

    await test('Finding C: Authorized Accounts Officer generates invoice and records payment cleanly', async () => {
      // Create approved sales order
      const soNum = `SO-INV-${RUN_SIGNATURE}`;
      createdOrderNumbers.add(soNum);
      await db.query(
        `INSERT INTO sales_orders
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Invoice Test Customer', 'Mardan Store', 75000.00, 1000000.00, 0.00, 0.00, 'Approved', 'Approved by Executive', 'Sales Officer')`,
        [soNum]
      );

      // Generate invoice
      const resInv = await fetch(`${BASE_URL}/sales/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accountsToken}`
        },
        body: JSON.stringify({ so_number: soNum })
      });
      assert.strictEqual(resInv.status, 201);
      const invBody = await resInv.json();
      assert.strictEqual(invBody.invoice.status, 'Unpaid');
      assert.ok(invBody.invoice.created_by.includes('Accounts Officer Tariq'));

      // Record payment
      const resPay = await fetch(`${BASE_URL}/sales/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accountsToken}`
        },
        body: JSON.stringify({
          so_number: soNum,
          amount: 75000.00,
          payment_method: 'Bank Transfer'
        })
      });
      assert.strictEqual(resPay.status, 201);

      // Verify order status updated to Paid
      const [orderRows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [soNum]);
      assert.strictEqual(orderRows[0].status, 'Paid');

      // Verify payment received_by attribution
      const [payRows] = await db.query('SELECT received_by FROM sales_payments WHERE so_number = ?', [soNum]);
      assert.ok(payRows[0].received_by.includes('Accounts Officer Tariq'));
    });

    // ========================================================================
    // 6. FINDING E: SENSITIVE GET ENDPOINTS PROTECTION
    // ========================================================================
    await test('Finding E: Unauthenticated GET /api/users is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/users`);
      assert.strictEqual(res.status, 401);
    });

    await test('Finding E: Authenticated staff can view employee directory (GET /api/users)', async () => {
      const res = await fetch(`${BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      assert.strictEqual(res.status, 200);
      const users = await res.json();
      assert.ok(Array.isArray(users));
      assert.ok(users.length > 0);
    });

    await test('Finding E: Unauthenticated and unauthorized access to Chairman Dashboard is rejected', async () => {
      const resUnauth = await fetch(`${BASE_URL}/dashboard/chairman`);
      assert.strictEqual(resUnauth.status, 401);

      const resForbidden = await fetch(`${BASE_URL}/dashboard/chairman`, {
        headers: { 'Authorization': `Bearer ${gateToken}` }
      });
      assert.strictEqual(resForbidden.status, 403);

      const resAuthorized = await fetch(`${BASE_URL}/dashboard/chairman`, {
        headers: { 'Authorization': `Bearer ${signToken(ceoUser)}` }
      });
      assert.strictEqual(resAuthorized.status, 200);
    });

    await test('Finding E: Finance Overview and PnL Report reject unauthorized roles and permit Finance officers', async () => {
      const resPnlForbidden = await fetch(`${BASE_URL}/reports/pnl`, {
        headers: { 'Authorization': `Bearer ${gateToken}` }
      });
      assert.strictEqual(resPnlForbidden.status, 403);

      const resPnlAllowed = await fetch(`${BASE_URL}/reports/pnl`, {
        headers: { 'Authorization': `Bearer ${accountsToken}` }
      });
      assert.strictEqual(resPnlAllowed.status, 200);

      const resFinForbidden = await fetch(`${BASE_URL}/finance/overview`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      assert.strictEqual(resFinForbidden.status, 403);

      const resFinAllowed = await fetch(`${BASE_URL}/finance/overview`, {
        headers: { 'Authorization': `Bearer ${signToken(financeUser)}` }
      });
      assert.strictEqual(resFinAllowed.status, 200);
    });

    await test('Finding E: Payroll register rejects unauthorized staff and permits HR Manager', async () => {
      const resPayForbidden = await fetch(`${BASE_URL}/payroll`, {
        headers: { 'Authorization': `Bearer ${salesToken}` }
      });
      assert.strictEqual(resPayForbidden.status, 403);

      const resPayAllowed = await fetch(`${BASE_URL}/payroll`, {
        headers: { 'Authorization': `Bearer ${hrToken}` }
      });
      assert.strictEqual(resPayAllowed.status, 200);
    });

  } finally {
    // ========================================================================
    // SAFE CLEANUP: Only remove records tracked in this specific test run
    // ========================================================================
    console.log('\n[Safe Cleanup] Executing targeted cleanup of run-created records...');

    if (createdOrderNumbers.size > 0) {
      const orderList = Array.from(createdOrderNumbers);
      await db.query('DELETE FROM sales_payments WHERE so_number IN (?)', [orderList]);
      await db.query('DELETE FROM sales_invoices WHERE so_number IN (?)', [orderList]);
      await db.query('DELETE FROM sales_order_items WHERE so_number IN (?)', [orderList]);
      await db.query('DELETE FROM sales_orders WHERE so_number IN (?)', [orderList]);
      await db.query('DELETE FROM audit_logs WHERE entity_id IN (?)', [orderList]);
      console.log(`[Safe Cleanup] Removed ${orderList.length} test sales order(s) and related records.`);
    }

    if (createdItemIds.size > 0) {
      const itemList = Array.from(createdItemIds);
      await db.query('DELETE FROM pos_order_items WHERE item_id IN (?)', [itemList]);
      await db.query('DELETE FROM inventory_transactions WHERE item_id IN (?)', [itemList]);
      await db.query('DELETE FROM inventory_items WHERE id IN (?)', [itemList]);
      console.log(`[Safe Cleanup] Removed ${itemList.length} test inventory item(s).`);
    }

    if (createdPayrollNumbers.size > 0) {
      const payrollList = Array.from(createdPayrollNumbers);
      await db.query('DELETE FROM payroll_runs WHERE run_number IN (?)', [payrollList]);
      await db.query('DELETE FROM audit_logs WHERE entity_id IN (?)', [payrollList]);
      console.log(`[Safe Cleanup] Removed ${payrollList.length} test payroll run(s).`);
    }

    if (createdUserEmails.size > 0) {
      const emailList = Array.from(createdUserEmails);
      await db.query('DELETE FROM users WHERE email IN (?)', [emailList]);
      console.log(`[Safe Cleanup] Removed ${emailList.length} temporary test user(s).`);
    }

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

runSecurityTestSuite().catch((err) => {
  console.error('Fatal unhandled error during test suite execution:', err);
  process.exit(1);
});
