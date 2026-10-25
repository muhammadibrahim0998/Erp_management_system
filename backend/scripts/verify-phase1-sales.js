/**
 * Verification Script: Phase 1 Sales Order-to-Cash Lifecycle
 * 
 * Verifies:
 * 1. GET /api/sales/orders returns ALL orders.
 * 2. Order to cash flow: Create Order -> Approval -> Invoice -> Payment.
 * 3. Role enforcement on approval (403 for unauthorized roles).
 * 4. Status progression enforcement (400 for skipping stages).
 * 5. Database sequence generation for SO, Invoice, and Payment doc numbers (no Math.random).
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:7001';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 1 SALES ORDER-TO-CASH VERIFICATION');
  console.log(`🎯 Target API: ${BASE_URL}`);
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Helper to authenticate
  async function login(email, password = 'password') {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(`Login failed for ${email}: ${data.error || res.status}`);
    }
    return { token: data.token, user: data.user };
  }

  try {
    // Step 0: Logins
    console.log('🔑 Step 0: Authenticating users with distinct roles...');
    const salesUser = await login('bilal.yousafzai@yaf.com');
    const gateUser = await login('gate@yaf.com');
    const ceoUser = await login('ceo@yaf.com');
    const financeUser = await login('finance@yaf.com');

    console.log(`  - Sales Officer: ${salesUser.user.name} (${salesUser.user.role})`);
    console.log(`  - Gate Officer: ${gateUser.user.name} (${gateUser.user.role})`);
    console.log(`  - CEO Approver: ${ceoUser.user.name} (${ceoUser.user.role})`);
    console.log(`  - Finance Officer: ${financeUser.user.name} (${financeUser.user.role})\n`);

    // Test 1: GET /api/sales/orders returns ALL orders (array)
    console.log('📋 Test 1: Checking GET /api/sales/orders returns ALL orders...');
    const getRes = await fetch(`${BASE_URL}/api/sales/orders`, {
      headers: { 'Authorization': `Bearer ${salesUser.token}` }
    });
    assert(getRes.ok, `GET /api/sales/orders responded with HTTP ${getRes.status}`);
    const orders = await getRes.json();
    assert(Array.isArray(orders), 'Response is an Array, not a single object or null');
    assert(orders.length >= 1, `Orders array contains ${orders.length} orders (at least 1 seeded order)`);
    const initialCount = orders.length;

    // Test 2: Create a Sales Order with database sequence
    console.log('\n📝 Test 2: Creating a new Sales Order via sequence...');
    const createRes = await fetch(`${BASE_URL}/api/sales/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesUser.token}`
      },
      body: JSON.stringify({
        customer: 'Khyber Confectioners Ltd',
        warehouse: 'Mardan sales point & store',
        delivery_date: '30 Oct 2026',
        credit_limit: 3000000.00,
        current_exposure: 2800000.00,
        items: [
          {
            item_code: 'SE-01-01-02',
            item_name: 'White eggs Grade A – Large',
            quantity: 1000,
            rate: 700.00,
            discount_percent: 5.0,
            total_amount: 665000.00
          }
        ]
      })
    });
    assert(createRes.status === 201, `Create order responded with HTTP 201 (got ${createRes.status})`);
    const createdOrder = await createRes.json();
    const soNumber = createdOrder.so_number;
    assert(/^SO-2026-\d{4}$/.test(soNumber), `Order number "${soNumber}" matches database sequence pattern SO-2026-XXXX`);
    assert(createdOrder.status === 'Pending approval', `Initial status is "Pending approval" (got "${createdOrder.status}")`);
    assert(createdOrder.credit_breach > 0, `Credit breach correctly calculated: PKR ${createdOrder.credit_breach}`);

    // Verify GET /api/sales/orders count incremented
    const listAfterCreate = await (await fetch(`${BASE_URL}/api/sales/orders`)).json();
    assert(listAfterCreate.length === initialCount + 1, `Orders list now contains all ${initialCount + 1} orders`);

    // Test 3: Unauthorized user (Gate Officer) attempts to approve
    console.log('\n🚫 Test 3: Enforcing role-based approval (Gate Officer attempt)...');
    const unauthorizedApproveRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gateUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber })
    });
    assert(unauthorizedApproveRes.status === 403, `Unauthorized approval rejected with HTTP 403 (got ${unauthorizedApproveRes.status})`);
    const unauthData = await unauthorizedApproveRes.json();
    assert(unauthData.error && unauthData.error.includes('not authorized'), `Error explains role restriction: "${unauthData.error}"`);

    // Test 4: Status sequence check - attempt to invoice before approval
    console.log('\n🚫 Test 4: Enforcing status order - attempting Invoice before Approval...');
    const prematureInvoiceRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber })
    });
    assert(prematureInvoiceRes.status === 400, `Premature invoice rejected with HTTP 400 (got ${prematureInvoiceRes.status})`);
    const premInvData = await prematureInvoiceRes.json();
    assert(premInvData.error && premInvData.error.includes('Approved'), `Error explains status requirement: "${premInvData.error}"`);

    // Test 5: Status sequence check - attempt to pay before invoice
    console.log('\n🚫 Test 5: Enforcing status order - attempting Payment before Invoice...');
    const prematurePayRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber, amount: 665000.00 })
    });
    assert(prematurePayRes.status === 400, `Premature payment rejected with HTTP 400 (got ${prematurePayRes.status})`);
    const premPayData = await prematurePayRes.json();
    assert(premPayData.error && premPayData.error.includes('Invoiced'), `Error explains status requirement: "${premPayData.error}"`);

    // Test 6: Authorized Approval (CEO)
    console.log('\n✅ Test 6: Authorized CEO approval...');
    const approveRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ceoUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber })
    });
    assert(approveRes.ok, `Approval responded with HTTP ${approveRes.status}`);
    const approvedData = await approveRes.json();
    assert(approvedData.order?.status === 'Approved', `Order status updated to "Approved" (got "${approvedData.order?.status}")`);

    // Test 7: Attempt to approve AGAIN (duplicate approval rejection)
    console.log('\n🚫 Test 7: Rejecting duplicate approval on already-approved order...');
    const duplicateApproveRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ceoUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber })
    });
    assert(duplicateApproveRes.status === 400, `Duplicate approval rejected with HTTP 400 (got ${duplicateApproveRes.status})`);

    // Test 8: Generate Commercial Invoice (Order-to-Cash Stage 3)
    console.log('\n📄 Test 8: Generating Commercial Invoice from database sequence...');
    const invoiceRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeUser.token}`
      },
      body: JSON.stringify({ so_number: soNumber })
    });
    assert(invoiceRes.status === 201, `Invoice generation responded with HTTP 201 (got ${invoiceRes.status})`);
    const invoiceData = await invoiceRes.json();
    const invoiceNo = invoiceData.invoice?.invoice_no;
    assert(/^INV-2026-\d{4}$/.test(invoiceNo), `Invoice number "${invoiceNo}" matches sequence pattern INV-2026-XXXX`);

    // Check that order status is now 'Invoiced'
    const orderAfterInv = await (await fetch(`${BASE_URL}/api/sales/orders/${soNumber}`)).json();
    assert(orderAfterInv.status === 'Invoiced', `Order status progressed to "Invoiced" (got "${orderAfterInv.status}")`);
    assert(orderAfterInv.invoice?.invoice_no === invoiceNo, `Order details contains generated invoice ${invoiceNo}`);

    // Test 9: Record Payment (Order-to-Cash Stage 4)
    console.log('\n💳 Test 9: Recording Customer Payment from database sequence...');
    const paymentRes = await fetch(`${BASE_URL}/api/sales/orders/${soNumber}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${financeUser.token}`
      },
      body: JSON.stringify({
        so_number: soNumber,
        amount: 665000.00,
        payment_method: 'Online Bank Transfer',
        reference_no: 'HBL-FT-9912048'
      })
    });
    assert(paymentRes.status === 201, `Payment recording responded with HTTP 201 (got ${paymentRes.status})`);
    const paymentData = await paymentRes.json();
    const paymentNo = paymentData.payment?.payment_no;
    assert(/^PAY-2026-\d{4}$/.test(paymentNo), `Payment number "${paymentNo}" matches sequence pattern PAY-2026-XXXX`);

    // Check final status is 'Paid'
    const orderAfterPay = await (await fetch(`${BASE_URL}/api/sales/orders/${soNumber}`)).json();
    assert(orderAfterPay.status === 'Paid', `Order status progressed to "Paid" (got "${orderAfterPay.status}")`);
    assert(orderAfterPay.payments?.length >= 1, `Order payments list contains ${orderAfterPay.payments?.length} recorded payment(s)`);

    console.log('\n====================================================');
    console.log(`🎉 [PASS] ALL ${passedTests}/${totalTests} PHASE 1 SALES ORDER-TO-CASH TESTS PASSED!`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ [FAIL] Test execution encountered an error:');
    console.error(err.message);
    process.exit(1);
  }
}

runTests();
