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
  console.error(`  DB_NAME=yaf_erp_test node backend/tests/financialIntegrityPhaseB.test.js`);
  console.error(`====================================================================\n`);
  process.exit(1);
}

const { db } = require('../config/db');
const { JWT_SECRET, optionalUserExtractor } = require('../middlewares/auth');
const { getNextDocNumber } = require('../utils/sequence');
const apiRoutes = require('../routes');

async function runFinancialIntegrityTestSuite() {
  console.log('====================================================================');
  console.log('YOUSAFZAI AGRI FOODS ERP — PHASE B FINANCIAL INTEGRITY REGRESSION SUITE');
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

  // Mount API router under /api
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

  const createdUserIds = new Set();
  const createdUserEmails = new Set();
  const createdSoNumbers = new Set();
  const createdInvoiceNumbers = new Set();
  const createdPaymentNumbers = new Set();

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
    const uniqueEmail = email || `test_phaseb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@yaf-test.com`;
    const [result] = await db.query(
      `INSERT INTO users (name, role, department, avatar, email, password, status)
       VALUES (?, ?, ?, 'TU', ?, 'hashed_placeholder', ?)`,
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
    // ------------------------------------------------------------------------
    // Setup Test Actors
    // ------------------------------------------------------------------------
    const salesOfficer = await createTestUser({ name: 'Tariq Sales', role: 'Sales Officer', department: 'Sales' });
    const accountsOfficer = await createTestUser({ name: 'Asad Accounts', role: 'Accounts Officer', department: 'Finance' });
    const financeDir = await createTestUser({ name: 'Farooq Finance', role: 'Director Finance', department: 'Executive' });
    const ceoUser = await createTestUser({ name: 'Bilal Yousafzai', role: 'Chairman & CEO', department: 'Executive' });
    const hrUser = await createTestUser({ name: 'Haroon HR', role: 'HR Manager', department: 'HR' });

    const salesToken = signToken(salesOfficer);
    const accountsToken = signToken(accountsOfficer);
    const financeToken = signToken(financeDir);
    const ceoToken = signToken(ceoUser);
    const hrToken = signToken(hrUser);

    console.log('--- PART 1: SEC-01 ATOMIC INVOICING & PAYMENT PROCESSING ---\n');

    // T01: Generate invoice for approved order
    let soForInvoice;
    await test('SEC-01.01: Approved sales order can be invoiced by Accounts Officer (transitions to Invoiced)', async () => {
      // Create order directly as Approved in test DB
      const soNum = `SO-PHASEB-${Date.now()}-01`;
      createdSoNumbers.add(soNum);
      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Swat Valley Egg Dealers', 'Mardan Store', 150000.00, 4500000.00, 150000.00, 0.00, 'Approved', 'Approved', 'Test Setup')`,
        [soNum]
      );
      soForInvoice = soNum;

      const res = await fetch(`${BASE_URL}/sales/orders/${soNum}/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.invoice.invoice_no.startsWith('INV-2026-'));
      assert.strictEqual(data.invoice.so_number, soNum);
      assert.strictEqual(Number(data.invoice.total_amount), 150000);
      assert.strictEqual(Number(data.invoice.paid_amount), 0);
      assert.strictEqual(data.invoice.status, 'Unpaid');
      createdInvoiceNumbers.add(data.invoice.invoice_no);

      // Verify sales_orders status updated to 'Invoiced'
      const [orderRows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [soNum]);
      assert.strictEqual(orderRows[0].status, 'Invoiced');

      // Verify audit log
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_type = "SALES_INVOICE" AND entity_id = ?',
        [data.invoice.invoice_no]
      );
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].action, 'CREATE_SALES_INVOICE');
      assert.strictEqual(auditRows[0].user_id, accountsOfficer.id);
    });

    // T02: Reject duplicate invoice attempt
    await test('SEC-01.02: Duplicate invoice generation on already invoiced order is rejected with HTTP 400', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders/${soForInvoice}/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('must be in "Approved" status') || data.error.includes('Invoice already exists'));
    });

    // T03: Concurrent invoice requests for the same order
    await test('SEC-01.03: Concurrent invoice generation requests: exactly 1 succeeds, second fails cleanly', async () => {
      const soConcurrent = `SO-PHASEB-${Date.now()}-CONC-INV`;
      createdSoNumbers.add(soConcurrent);
      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Khyber Confectioners Ltd', 'Mardan Store', 200000.00, 3000000.00, 200000.00, 0.00, 'Approved', 'Approved', 'Test Setup')`,
        [soConcurrent]
      );

      // Fire 2 simultaneous requests
      const [res1, res2] = await Promise.all([
        fetch(`${BASE_URL}/sales/orders/${soConcurrent}/invoice`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accountsToken}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${BASE_URL}/sales/orders/${soConcurrent}/invoice`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${financeToken}`, 'Content-Type': 'application/json' }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(statuses, [201, 400], 'One request must succeed (201) and the concurrent one must fail (400)');

      // Verify exactly one invoice was created in database
      const [invRows] = await db.query('SELECT * FROM sales_invoices WHERE so_number = ?', [soConcurrent]);
      assert.strictEqual(invRows.length, 1);
      createdInvoiceNumbers.add(invRows[0].invoice_no);

      // Verify order status is 'Invoiced'
      const [soRows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [soConcurrent]);
      assert.strictEqual(soRows[0].status, 'Invoiced');
    });

    // T04: Reject invoicing if order is not in 'Approved' status
    await test('SEC-01.04: Invoicing is rejected if sales order is in Draft or Pending approval status', async () => {
      const soDraft = `SO-PHASEB-${Date.now()}-DRAFT`;
      createdSoNumbers.add(soDraft);
      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Test Customer', 'Mardan Store', 50000.00, 1000000.00, 50000.00, 0.00, 'Draft', 'Not required', 'Test Setup')`,
        [soDraft]
      );

      const res = await fetch(`${BASE_URL}/sales/orders/${soDraft}/invoice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accountsToken}`, 'Content-Type': 'application/json' }
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('must be in "Approved" status'));
    });

    // T05: Unique constraint enforcement at database layer
    await test('SEC-01.05: MySQL UNIQUE constraint uq_sales_invoices_so rejects direct duplicate insertion', async () => {
      const dummySo = `SO-PHASEB-${Date.now()}-UQ-CHECK`;
      const inv1 = `INV-TEST-UQ-1-${Date.now()}`;
      const inv2 = `INV-TEST-UQ-2-${Date.now()}`;

      await db.query(
        `INSERT INTO sales_invoices (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status)
         VALUES (?, ?, 'Test Customer', '23 Oct 2026', 1000.00, 1000.00, 0.00, 'Unpaid')`,
        [inv1, dummySo]
      );
      createdInvoiceNumbers.add(inv1);

      let threw = false;
      try {
        await db.query(
          `INSERT INTO sales_invoices (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status)
           VALUES (?, ?, 'Test Customer', '23 Oct 2026', 1000.00, 1000.00, 0.00, 'Unpaid')`,
          [inv2, dummySo]
        );
      } catch (err) {
        threw = true;
        assert.ok(err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate entry'));
      }
      assert.strictEqual(threw, true, 'Database unique constraint must throw ER_DUP_ENTRY on duplicate so_number');
    });

    // T06: Record partial payment
    let partialPaymentOrder;
    await test('SEC-01.06: Partial payment records accurately and transitions order and invoice to Partially Paid', async () => {
      const soNum = `SO-PHASEB-${Date.now()}-PARTIAL`;
      createdSoNumbers.add(soNum);
      const invNum = `INV-PHASEB-${Date.now()}-P1`;
      createdInvoiceNumbers.add(invNum);

      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Charsadda Poultry Services', 'Mardan Store', 500000.00, 5000000.00, 500000.00, 0.00, 'Invoiced', 'Approved', 'Test Setup')`,
        [soNum]
      );

      await db.query(
        `INSERT INTO sales_invoices 
         (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status, created_by)
         VALUES (?, ?, 'Charsadda Poultry Services', '23 Oct 2026', 500000.00, 500000.00, 0.00, 'Unpaid', 'Accounts Officer')`,
        [invNum, soNum]
      );
      partialPaymentOrder = { soNum, invNum, total: 500000.00 };

      // Pay 200,000 out of 500,000
      const res = await fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 200000.00,
          payment_method: 'Bank Transfer',
          reference_no: 'TRX-PARTIAL-001'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.invoice_status, 'Partially Paid');
      assert.strictEqual(data.order_status, 'Partially Paid');
      assert.strictEqual(data.outstanding_balance, 300000.00);
      assert.ok(data.payment.payment_no.startsWith('PAY-2026-'));
      createdPaymentNumbers.add(data.payment.payment_no);

      // Verify database state
      const [invRows] = await db.query('SELECT paid_amount, status FROM sales_invoices WHERE invoice_no = ?', [invNum]);
      assert.strictEqual(Number(invRows[0].paid_amount), 200000.00);
      assert.strictEqual(invRows[0].status, 'Partially Paid');

      const [soRows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [soNum]);
      assert.strictEqual(soRows[0].status, 'Partially Paid');

      // Verify audit log
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_type = "SALES_PAYMENT" AND entity_id = ?',
        [data.payment.payment_no]
      );
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].action, 'RECORD_SALES_PAYMENT');
      assert.ok(auditRows[0].details.includes('partial'));
    });

    // T07: Complete payment to fully paid status
    await test('SEC-01.07: Second payment completing balance transitions order and invoice to Paid', async () => {
      const { soNum, invNum } = partialPaymentOrder;

      // Pay the remaining 300,000
      const res = await fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 300000.00,
          payment_method: 'Direct Deposit',
          reference_no: 'TRX-FINAL-002'
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.invoice_status, 'Paid');
      assert.strictEqual(data.order_status, 'Paid');
      assert.strictEqual(data.outstanding_balance, 0);
      createdPaymentNumbers.add(data.payment.payment_no);

      // Verify database state
      const [invRows] = await db.query('SELECT paid_amount, status FROM sales_invoices WHERE invoice_no = ?', [invNum]);
      assert.strictEqual(Number(invRows[0].paid_amount), 500000.00);
      assert.strictEqual(invRows[0].status, 'Paid');

      const [soRows] = await db.query('SELECT status FROM sales_orders WHERE so_number = ?', [soNum]);
      assert.strictEqual(soRows[0].status, 'Paid');
    });

    // T08: Overpayment rejection
    await test('SEC-01.08: Payment exceeding remaining invoice balance is rejected with HTTP 400', async () => {
      const soNum = `SO-PHASEB-${Date.now()}-OVERPAY`;
      createdSoNumbers.add(soNum);
      const invNum = `INV-PHASEB-${Date.now()}-OVERPAY`;
      createdInvoiceNumbers.add(invNum);

      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Mardan Retail Mart', 'Mardan Store', 100000.00, 1000000.00, 100000.00, 0.00, 'Invoiced', 'Approved', 'Test Setup')`,
        [soNum]
      );

      await db.query(
        `INSERT INTO sales_invoices 
         (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status, created_by)
         VALUES (?, ?, 'Mardan Retail Mart', '23 Oct 2026', 100000.00, 100000.00, 0.00, 'Unpaid', 'Accounts Officer')`,
        [invNum, soNum]
      );

      // Attempt payment of 150,000 for 100,000 invoice
      const res = await fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 150000.00
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('exceeds outstanding invoice balance'));

      // Verify no payment was created
      const [payRows] = await db.query('SELECT * FROM sales_payments WHERE invoice_no = ?', [invNum]);
      assert.strictEqual(payRows.length, 0);
    });

    // T09: Reject payment on already fully paid order
    await test('SEC-01.09: Payment on already fully paid invoice is rejected with HTTP 400', async () => {
      const { soNum } = partialPaymentOrder;
      const res = await fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountsToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: 10000.00 })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('already fully paid') || data.error.includes('must be in "Invoiced"'));
    });

    // T10: Concurrent payment race condition (overpayment prevention)
    await test('SEC-01.10: Concurrent payments race condition cannot overpay invoice balance', async () => {
      const soNum = `SO-PHASEB-${Date.now()}-CONC-PAY`;
      createdSoNumbers.add(soNum);
      const invNum = `INV-PHASEB-${Date.now()}-CONC-PAY`;
      createdInvoiceNumbers.add(invNum);

      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', 'Charsadda Poultry Services', 'Mardan Store', 100000.00, 5000000.00, 100000.00, 0.00, 'Invoiced', 'Approved', 'Test Setup')`,
        [soNum]
      );

      await db.query(
        `INSERT INTO sales_invoices 
         (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status, created_by)
         VALUES (?, ?, 'Charsadda Poultry Services', '23 Oct 2026', 100000.00, 100000.00, 0.00, 'Unpaid', 'Accounts Officer')`,
        [invNum, soNum]
      );

      // Two simultaneous requests each attempting to pay 80,000 (total = 160,000, invoice = 100,000)
      const [res1, res2] = await Promise.all([
        fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accountsToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 80000.00, reference_no: 'CONC-1' })
        }),
        fetch(`${BASE_URL}/sales/orders/${soNum}/payment`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${financeToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 80000.00, reference_no: 'CONC-2' })
        })
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      if (data1.payment) createdPaymentNumbers.add(data1.payment.payment_no);
      if (data2.payment) createdPaymentNumbers.add(data2.payment.payment_no);

      const statuses = [res1.status, res2.status].sort();
      // One must succeed (201) and the second must be rejected (400) because 80000 > remaining 20000
      assert.deepStrictEqual(statuses, [201, 400], 'One payment of 80k must succeed and second 80k must fail');

      // Verify in DB total paid never exceeded 100,000
      const [invRows] = await db.query('SELECT paid_amount FROM sales_invoices WHERE invoice_no = ?', [invNum]);
      assert.strictEqual(Number(invRows[0].paid_amount), 80000.00);

      const [paySum] = await db.query('SELECT SUM(amount) as s FROM sales_payments WHERE invoice_no = ?', [invNum]);
      assert.strictEqual(Number(paySum[0].s), 80000.00);
    });

    // T11: Role authorization on invoicing and payments
    await test('SEC-01.11: Unauthorized role (HR) is rejected with HTTP 403 on invoice and payment endpoints', async () => {
      const invRes = await fetch(`${BASE_URL}/sales/orders/ANY/invoice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hrToken}`, 'Content-Type': 'application/json' }
      });
      assert.strictEqual(invRes.status, 403);

      const payRes = await fetch(`${BASE_URL}/sales/orders/ANY/payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hrToken}`, 'Content-Type': 'application/json' }
      });
      assert.strictEqual(payRes.status, 403);
    });

    // T12: Unauthenticated request rejected on invoice and payment endpoints
    await test('SEC-01.12: Unauthenticated requests are rejected with HTTP 401 on invoice and payment endpoints', async () => {
      const invRes = await fetch(`${BASE_URL}/sales/orders/ANY/invoice`, { method: 'POST' });
      assert.strictEqual(invRes.status, 401);

      const payRes = await fetch(`${BASE_URL}/sales/orders/ANY/payment`, { method: 'POST' });
      assert.strictEqual(payRes.status, 401);
    });

    console.log('\n--- PART 2: SEC-02 SERVER-SIDE CREDIT LIMIT & EXPOSURE CALCULATION ---\n');

    // T13: Forged client credit_limit, current_exposure, credit_breach are ignored
    await test('SEC-02.01: Forged credit_limit, current_exposure, and credit_breach in request body are ignored', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: 'Swat Valley Egg Dealers',
          // Client attempts to claim an inflated limit and zero exposure
          credit_limit: 999999999.00,
          current_exposure: 0.00,
          credit_breach: 0.00,
          total_amount: 50000.00,
          items: [
            { item_code: 'SE-01', item_name: 'Eggs', quantity: 100, rate: 500, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      // Swat Valley Egg Dealers authoritative profile has credit limit 4,500,000 (not 999999999)
      assert.strictEqual(Number(created.credit_limit), 4500000.00);
      assert.notStrictEqual(Number(created.credit_limit), 999999999.00);

      // Verify audit log
      const [auditRows] = await db.query(
        'SELECT * FROM audit_logs WHERE entity_type = "SALES_ORDER" AND entity_id = ?',
        [created.so_number]
      );
      assert.strictEqual(auditRows.length, 1);
      assert.strictEqual(auditRows[0].action, 'CREATE_SALES_ORDER');
    });

    // T14: Forged client status & approval_step are ignored
    await test('SEC-02.02: Forged status and approval_step in request body are overridden by server logic', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: 'Swat Valley Egg Dealers',
          // Client attempts to bypass approval workflow
          status: 'Approved',
          approval_step: 'Approved',
          items: [
            { item_code: 'SE-01', item_name: 'Eggs', quantity: 20, rate: 1000, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      // Because order is within limit, server forces Draft / Not required (never Approved)
      assert.strictEqual(created.status, 'Draft');
      assert.strictEqual(created.approval_step, 'Not required');
    });

    // T15: Server-side line item math calculation
    await test('SEC-02.03: Line item totals and order total are recomputed server-side from qty, rate, discount', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: 'Peek Freans',
          // Client claims total is 10, but math is: 100 * 200 * 0.9 = 18,000 + 50 * 400 * 1.0 = 20,000 => 38,000
          total_amount: 10.00,
          items: [
            { item_code: 'SE-01', item_name: 'Liquid Egg White', quantity: 100, rate: 200, discount_percent: 10, total_amount: 1.00 },
            { item_code: 'SE-02', item_name: 'Liquid Egg Yolk', quantity: 50, rate: 400, discount_percent: 0, total_amount: 9.00 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      assert.strictEqual(Number(created.total_amount), 38000.00);

      // Verify item rows in DB
      const [itemRows] = await db.query(
        'SELECT * FROM sales_order_items WHERE so_number = ? ORDER BY id ASC',
        [created.so_number]
      );
      assert.strictEqual(itemRows.length, 2);
      assert.strictEqual(Number(itemRows[0].total_amount), 18000.00);
      assert.strictEqual(Number(itemRows[1].total_amount), 20000.00);
    });

    // T16: New unvetted customer receives standard policy default limit
    await test('SEC-02.04: New unvetted customer defaults to server policy limit of PKR 1,000,000', async () => {
      const unvettedCustomer = `Unknown Dealer ${Date.now()}`;
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: unvettedCustomer,
          items: [
            { item_code: 'SE-01', item_name: 'Shell Eggs', quantity: 100, rate: 1000, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      assert.strictEqual(Number(created.credit_limit), 1000000.00);
      assert.strictEqual(Number(created.total_amount), 100000.00);
      assert.strictEqual(Number(created.current_exposure), 100000.00);
      assert.strictEqual(Number(created.credit_breach), 0.00);
      assert.strictEqual(created.status, 'Draft');
      assert.strictEqual(created.approval_step, 'Not required');
    });

    // T17: Order exceeding credit limit triggers credit breach, Pending approval, and CEO Waiting
    await test('SEC-02.05: Order exceeding credit limit triggers credit breach and requires CEO approval', async () => {
      const dealer = `Overlimit Dealer ${Date.now()}`;
      // Order of 1,500,000 against default 1,000,000 limit -> breach of 500,000
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: dealer,
          items: [
            { item_code: 'SE-01', item_name: 'Shell Eggs', quantity: 1500, rate: 1000, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      assert.strictEqual(Number(created.credit_limit), 1000000.00);
      assert.strictEqual(Number(created.total_amount), 1500000.00);
      assert.strictEqual(Number(created.current_exposure), 1500000.00);
      assert.strictEqual(Number(created.credit_breach), 500000.00);
      assert.strictEqual(created.status, 'Pending approval');
      assert.strictEqual(created.approval_step, 'CEO Waiting');
    });

    // T18: Dynamic exposure includes outstanding unpaid invoices
    await test('SEC-02.06: Dynamic exposure correctly includes customer unpaid invoices without double-counting', async () => {
      const customer = `Exposure Check Cust ${Date.now()}`;
      const dummySo = `SO-EXP-DUMMY-${Date.now()}`;
      const dummyInv = `INV-EXP-DUMMY-${Date.now()}`;
      createdSoNumbers.add(dummySo);
      createdInvoiceNumbers.add(dummyInv);

      // Create previous invoiced order with 400,000 unpaid balance
      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', ?, 'Mardan Store', 400000.00, 1000000.00, 400000.00, 0.00, 'Invoiced', 'Approved', 'Test Setup')`,
        [dummySo, customer]
      );
      await db.query(
        `INSERT INTO sales_invoices 
         (invoice_no, so_number, customer, invoice_date, subtotal, total_amount, paid_amount, status, created_by)
         VALUES (?, ?, ?, '23 Oct 2026', 400000.00, 400000.00, 0.00, 'Unpaid', 'Accounts Officer')`,
        [dummyInv, dummySo, customer]
      );

      // Now create a new order of 700,000 for this customer
      // Total exposure should be: 400,000 (unpaid inv) + 700,000 (new order) = 1,100,000
      // Credit limit: 1,000,000 (from previous order history)
      // Credit breach: 100,000
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer,
          items: [
            { item_code: 'SE-01', item_name: 'Eggs', quantity: 700, rate: 1000, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      assert.strictEqual(Number(created.credit_limit), 1000000.00);
      assert.strictEqual(Number(created.total_amount), 700000.00);
      assert.strictEqual(Number(created.current_exposure), 1100000.00);
      assert.strictEqual(Number(created.credit_breach), 100000.00);
      assert.strictEqual(created.status, 'Pending approval');
      assert.strictEqual(created.approval_step, 'CEO Waiting');
    });

    // T19: Dynamic exposure includes approved/pending uninvoiced orders
    await test('SEC-02.07: Dynamic exposure includes approved/pending orders not yet invoiced', async () => {
      const customer = `Uninvoiced Exposure Cust ${Date.now()}`;
      const priorSo = `SO-EXP-UNINV-${Date.now()}`;
      createdSoNumbers.add(priorSo);

      // Create prior approved order of 300,000 that has NOT been invoiced yet
      await db.query(
        `INSERT INTO sales_orders 
         (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
         VALUES (?, '23 Oct 2026', '30 Oct 2026', ?, 'Mardan Store', 300000.00, 1000000.00, 300000.00, 0.00, 'Approved', 'Approved', 'Test Setup')`,
        [priorSo, customer]
      );

      // Now create a second order of 200,000 for this customer
      // Total exposure should be: 300,000 (uninvoiced order) + 200,000 (new order) = 500,000
      // Credit limit: 1,000,000 -> breach: 0
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer,
          items: [
            { item_code: 'SE-01', item_name: 'Eggs', quantity: 200, rate: 1000, discount_percent: 0 }
          ]
        })
      });

      assert.strictEqual(res.status, 201);
      const created = await res.json();
      createdSoNumbers.add(created.so_number);

      assert.strictEqual(Number(created.current_exposure), 500000.00);
      assert.strictEqual(Number(created.credit_breach), 0.00);
      assert.strictEqual(created.status, 'Draft');
      assert.strictEqual(created.approval_step, 'Not required');
    });

    // T20: Reject sales order creation if customer is missing
    await test('SEC-02.08: Sales order creation fails with HTTP 400 when customer name is missing or empty', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${salesToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer: '   ', total_amount: 1000 })
      });
      assert.strictEqual(res.status, 400);
    });

    // T21: Role authorization on sales order creation
    await test('SEC-02.09: Unauthorized role (HR) is rejected with HTTP 403 on sales order creation', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hrToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: 'Some Customer',
          items: [{ item_code: 'SE-01', item_name: 'Eggs', quantity: 1, rate: 100, discount_percent: 0 }]
        })
      });
      assert.strictEqual(res.status, 403);
    });

    // T22: Unauthenticated request rejected on sales order creation
    await test('SEC-02.10: Unauthenticated POST /api/sales/orders is rejected with HTTP 401', async () => {
      const res = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: 'Some Customer' })
      });
      assert.strictEqual(res.status, 401);
    });

    // T23: Sequence generation with externalConnection inside transaction
    await test('SEC-01.13: getNextDocNumber safely reuses external transaction connection without deadlock', async () => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const doc1 = await getNextDocNumber('test_seq', 'TST-2026', conn);
        const doc2 = await getNextDocNumber('test_seq', 'TST-2026', conn);
        assert.ok(doc1.startsWith('TST-2026-'));
        assert.ok(doc2.startsWith('TST-2026-'));
        const n1 = parseInt(doc1.split('-')[2], 10);
        const n2 = parseInt(doc2.split('-')[2], 10);
        assert.strictEqual(n2, n1 + 1);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    });

  } finally {
    console.log('\n[Safe Cleanup] Executing targeted cleanup of run-created test records...');
    if (createdPaymentNumbers.size > 0) {
      const payList = Array.from(createdPaymentNumbers);
      await db.query('DELETE FROM sales_payments WHERE payment_no IN (?)', [payList]);
      console.log(`[Safe Cleanup] Removed ${payList.length} test payment record(s).`);
    }
    if (createdInvoiceNumbers.size > 0) {
      const invList = Array.from(createdInvoiceNumbers);
      await db.query('DELETE FROM sales_invoices WHERE invoice_no IN (?)', [invList]);
      console.log(`[Safe Cleanup] Removed ${invList.length} test invoice record(s).`);
    }
    if (createdSoNumbers.size > 0) {
      const soList = Array.from(createdSoNumbers);
      await db.query('DELETE FROM sales_order_items WHERE so_number IN (?)', [soList]);
      await db.query('DELETE FROM sales_orders WHERE so_number IN (?)', [soList]);
      console.log(`[Safe Cleanup] Removed ${soList.length} test sales order(s).`);
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

runFinancialIntegrityTestSuite().catch((err) => {
  console.error('Fatal unhandled error during test suite execution:', err);
  process.exit(1);
});
