const { db } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { logAudit } = auditLogger;
const { getNextDocNumber } = require('../utils/sequence');

/**
 * 1. Chairman's Executive Dashboard
 */
const getChairmanDashboard = async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM workflow_tasks WHERE status = "pending" LIMIT 6');
    const [inventoryCount] = await db.query('SELECT COUNT(*) as count FROM inventory_items WHERE status = "Reorder"');
    const [totalOrders] = await db.query('SELECT COUNT(*) as count FROM purchase_orders');

    res.json({
      kpis: {
        revenue: 'PKR 50.3M',
        revenueTargetChange: '+10.1%',
        revenueTargetText: '99% of target',
        grossMargin: '21.9%',
        marginChange: '▼0.1 pts vs last month',
        cashAndBank: 'PKR 29.4M',
        cashAccounts: '4 accounts',
        receivables: 'PKR 45.7M',
        receivablesOverdue: 'PKR 3.2M over 30 days',
        eggsSold: '572K',
        eggsSoldTrays: '19,077 trays',
        eggsSoldChange: '+28.8%'
      },
      revenueChart: [
        { month: 'Oct', actual: 44, target: 46 },
        { month: 'Nov', actual: 48, target: 49 },
        { month: 'Dec', actual: 52, target: 51 },
        { month: 'Jan', actual: 55, target: 53 },
        { month: 'Feb', actual: 45, target: 47 },
        { month: 'Mar', actual: 42, target: 44 },
        { month: 'Apr', actual: 46, target: 45 },
        { month: 'May', actual: 49, target: 48 },
        { month: 'Jun', actual: 51, target: 50 },
        { month: 'Jul', actual: 54, target: 52 },
        { month: 'Aug', actual: 53, target: 51 },
        { month: 'Sep', actual: 50.3, target: 50.8 }
      ],
      waitingApprovals: tasks,
      receivablesAging: {
        total: 'PKR 45,660,034',
        current: '31.0M',
        d1_30: '11.4M',
        d31_60: '3.2M',
        d61_90: '0.0M'
      },
      budgetVsActual: [
        { dept: 'Poultry Farms', actual: '28.3M', budget: '31.1M', pct: 91 },
        { dept: 'HR & Administration', actual: '3.8M', budget: '4.2M', pct: 90 },
        { dept: 'Procurement & Supply Chain', actual: '74.1M', budget: '90.3M', pct: 82 }
      ],
      exceptions: [
        { title: 'Credit limit exceeded', desc: 'Swat Valley Egg Dealers · SO-2026-0418 on hold', type: 'danger' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 2. Approvals & Tasks Inbox
 */
const getApprovals = async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM workflow_tasks ORDER BY id ASC');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const actionApproval = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approved' | 'rejected' | 'completed'

  const validActions = ['approved', 'rejected', 'completed'];
  const normalizedAction = (typeof action === 'string') ? action.trim().toLowerCase() : 'completed';
  if (!validActions.includes(normalizedAction)) {
    return res.status(400).json({ error: `Invalid action "${action}". Allowed: ${validActions.join(', ')}` });
  }

  const actorName = req.user?.name || req.trustedUser?.name || 'Executive Officer';
  const actorRole = req.user?.role || req.trustedUser?.role || 'Executive';

  try {
    const [existing] = await db.query('SELECT id, status, title FROM workflow_tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Workflow task #${id} not found` });
    }

    await db.query('UPDATE workflow_tasks SET status = ? WHERE id = ?', [normalizedAction, id]);
    await logAudit({
      req,
      userId: req.user?.id,
      userName: actorName,
      role: actorRole,
      action: `WORKFLOW_${normalizedAction.toUpperCase()}`,
      entityType: 'WORKFLOW',
      entityId: id,
      details: `${actorRole} (${actorName}) updated workflow task #${id} ("${existing[0].title}") to: ${normalizedAction}`
    });
    res.json({ success: true, message: `Task ${normalizedAction} successfully by ${actorName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 3. Live Operations Control Room
 */
const getLiveOperations = (req, res) => {
  res.json({
    metrics: {
      eggsTraded7Days: '572K',
      gateToStoreTime: '1 h 53 m',
      workInProgress: 'PKR 836K',
      lastBatchYield: '98.6%',
      bottleneck: 'Breaking',
      bottleneckWait: '1 d 14 h waiting'
    },
    receivingFlow: [
      { step: 1, name: 'Suppliers', activeCount: 2, status: 'clear' },
      { step: 2, name: 'Gate in', activeCount: 1, time: '35 min', status: 'active' },
      { step: 3, name: 'QC cell', activeCount: 0, status: 'clear' },
      { step: 4, name: 'Store', activeCount: 1, time: '1 h 35 m', status: 'waiting' },
      { step: 5, name: 'Inventory', activeCount: 0, status: 'clear' },
      { step: 6, name: 'Gate out', activeCount: 0, status: 'clear' }
    ],
    liquidEggFlow: [
      { step: 1, name: 'Sales', count: 1, status: 'done' },
      { step: 2, name: 'GM', count: 1, status: 'done' },
      { step: 3, name: 'Plant', count: 1, time: '5 h', status: 'waiting' },
      { step: 4, name: 'Planning', count: 1, status: 'done' },
      { step: 5, name: 'Raw store', count: 1, status: 'done' },
      { step: 6, name: 'Breaking', count: 1, time: '1 d 14 h', status: 'bottleneck' },
      { step: 7, name: 'Finish store', count: 1, status: 'done' },
      { step: 8, name: 'Dispatch', count: 0, status: 'clear' },
      { step: 9, name: 'Customers', count: 1, status: 'done' }
    ]
  });
};

/**
 * 4. Gate & Security
 */
const getGatePasses = async (req, res) => {
  try {
    const [passes] = await db.query('SELECT * FROM gate_passes ORDER BY id DESC');
    res.json(passes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createGatePass = async (req, res) => {
  const { pass_number, vehicle_number, supplier_customer, pass_type } = req.body;
  const passNo = pass_number || `GPI-2026-000${Math.floor(Math.random() * 90 + 10)}`;
  const officerName = req.user?.name || req.trustedUser?.name || 'Gate Officer';
  const officerRole = req.user?.role || req.trustedUser?.role || 'Security';
  try {
    const [result] = await db.query(
      'INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, "Just now", "At gate — waiting for QC")',
      [passNo, vehicle_number, supplier_customer, pass_type || 'inward']
    );
    await logAudit({
      req,
      userId: req.user?.id,
      userName: officerName,
      role: officerRole,
      action: 'CREATE_GATE_PASS',
      entityType: 'GATE_PASS',
      entityId: passNo,
      details: `${officerRole} (${officerName}) issued ${pass_type || 'inward'} gate pass for vehicle ${vehicle_number} (${supplier_customer || 'General'})`
    });
    res.json({ success: true, id: result.insertId, pass_number: passNo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 5. Procurement & Purchase Orders
 */
const getProcurementPOs = async (req, res) => {
  try {
    const [pos] = await db.query('SELECT * FROM purchase_orders ORDER BY id DESC');
    res.json(pos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createProcurementPO = async (req, res) => {
  const { supplier, amount, items_count } = req.body;
  if (!supplier || amount === undefined || isNaN(Number(amount))) {
    return res.status(400).json({ error: 'Valid supplier name and amount are required' });
  }
  const creatorName = req.user?.name || req.trustedUser?.name || 'Procurement Officer';
  const creatorRole = req.user?.role || req.trustedUser?.role || 'Procurement';
  const po_number = `PO-2026-09${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, "29 Sep 2026", ?, "Draft", ?, ?, ?)',
      [po_number, supplier, creatorName, amount, items_count || 1]
    );
    await logAudit({
      req,
      userId: req.user?.id,
      userName: creatorName,
      role: creatorRole,
      action: 'CREATE_PO',
      entityType: 'PURCHASE_ORDER',
      entityId: po_number,
      details: `${creatorRole} (${creatorName}) generated purchase order ${po_number} for supplier: ${supplier} (PKR ${Number(amount).toLocaleString()})`
    });
    res.json({ success: true, po_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 6. Production Board & Work Orders
 */
const getProductionBoard = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM production_orders ORDER BY id ASC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const moveProduction = async (req, res) => {
  const { id, stage } = req.body;
  try {
    await db.query('UPDATE production_orders SET stage = ? WHERE id = ?', [stage, id]);
    await logAudit({
      req,
      action: 'MOVE_PRODUCTION',
      entityType: 'PRODUCTION',
      entityId: id,
      details: `Moved production work order #${id} to stage: "${stage}"`
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 7. Sales Orders & Order-to-Cash Lifecycle (Order -> Approval -> Invoice -> Payment)
 */
const APPROVER_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Finance',
  'Sales Manager',
  'ERP Admin'
];

const INVOICE_ROLES = [
  'Accounts Officer',
  'Director Finance',
  'Sales Manager',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

const PAYMENT_ROLES = [
  'Accounts Officer',
  'Director Finance',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

// Returns ALL sales orders
const getSalesOrders = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders ORDER BY id DESC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Returns single sales order with items, invoice, and payment history
const getSalesOrderDetails = async (req, res) => {
  const so_number = req.params.so_number || req.query.so_number;
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    if (orders.length === 0) {
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];
    const [items] = await db.query('SELECT * FROM sales_order_items WHERE so_number = ?', [so_number]);
    const [invoices] = await db.query('SELECT * FROM sales_invoices WHERE so_number = ?', [so_number]);
    const [payments] = await db.query('SELECT * FROM sales_payments WHERE so_number = ?', [so_number]);

    res.json({
      ...order,
      items,
      invoice: invoices[0] || null,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Creates a new sales order with document number from sequence (no Math.random)
const createSalesOrder = async (req, res) => {
  try {
    const {
      customer,
      delivery_date,
      warehouse = 'Mardan sales point & store',
      items = [],
      credit_limit = 4500000.00,
      current_exposure = 0.00
    } = req.body;

    if (!customer) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const so_number = await getNextDocNumber('sales_order', 'SO-2026');
    const order_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const del_date = delivery_date || order_date;

    let total_amount = Number(req.body.total_amount) || 0;
    if (items && items.length > 0) {
      total_amount = items.reduce((sum, it) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.rate) || 0;
        const disc = Number(it.discount_percent) || 0;
        const lineTotal = Number(it.total_amount) || (qty * rate * (1 - disc / 100));
        return sum + lineTotal;
      }, 0);
    } else {
      total_amount = total_amount || 1500000.00;
    }

    const totalExposure = Number(current_exposure) + total_amount;
    const creditBreach = totalExposure > Number(credit_limit) ? (totalExposure - Number(credit_limit)) : 0;
    const status = creditBreach > 0 ? 'Pending approval' : 'Draft';
    const approval_step = creditBreach > 0 ? 'CEO Waiting' : 'Not required';
    const created_by = req.user ? `${req.user.name} (${req.user.role})` : 'Sales Officer (Bilal Yousafzai)';

    await db.query(
      `INSERT INTO sales_orders 
       (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [so_number, order_date, del_date, customer, warehouse, total_amount, credit_limit, totalExposure, creditBreach, status, approval_step, created_by]
    );

    if (items && items.length > 0) {
      for (const it of items) {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.rate) || 0;
        const disc = Number(it.discount_percent) || 0;
        const lineTotal = Number(it.total_amount) || (qty * rate * (1 - disc / 100));
        await db.query(
          `INSERT INTO sales_order_items (so_number, item_code, item_name, quantity, rate, discount_percent, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [so_number, it.item_code || 'SE-01-01-02', it.item_name || 'Liquid/Shell Eggs', qty, rate, disc, lineTotal]
        );
      }
    }

    await logAudit({
      req,
      action: 'CREATE_SALES_ORDER',
      entityType: 'SALES_ORDER',
      entityId: so_number,
      details: `Created sales order ${so_number} for "${customer}" (PKR ${total_amount.toLocaleString()})`
    });

    const [created] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Stage 2: Approve Sales Order (enforces database role check, active status, atomic transaction)
const approveSalesOrder = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  // 1. Authenticated User Identity Context (client-supplied identity strictly ignored)
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    return res.status(401).json({
      error: 'Authentication failed: Missing or invalid user identity in authentication context.'
    });
  }

  let connection = null;
  try {
    // 2. Fetch current trusted user record from database
    const [userRows] = await db.query(
      'SELECT id, name, role, status FROM users WHERE id = ?',
      [authenticatedUserId]
    );

    if (userRows.length === 0) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Authenticated user record does not exist.'
      });
    }

    const trustedUser = userRows[0];

    // F-02: Require database account status to be valid, non-empty, exactly 'active'
    const normalizedStatus = (typeof trustedUser.status === 'string') ? trustedUser.status.trim().toLowerCase() : '';
    if (normalizedStatus !== 'active') {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Approver account is not active.'
      });
    }

    // F-01: Check current database role against APPROVER_ROLES (not merely JWT claim)
    const currentDbRole = (typeof trustedUser.role === 'string') ? trustedUser.role.trim() : '';
    if (!currentDbRole || !APPROVER_ROLES.includes(currentDbRole)) {
      return res.status(403).json({
        error: `Access Denied: Current user role "${currentDbRole || 'Unassigned'}" is not authorized to approve sales orders. Allowed roles: ${APPROVER_ROLES.join(', ')}.`
      });
    }

    // Resolve verified name: prioritize trusted database user record, then verified JWT claim
    let approverName = null;
    if (typeof trustedUser.name === 'string' && trustedUser.name.trim() !== '') {
      approverName = trustedUser.name.trim();
    } else if (typeof req.user?.name === 'string' && req.user.name.trim() !== '') {
      approverName = req.user.name.trim();
    }

    // Fail-closed: Never fabricate generic placeholder, never fall back to email
    if (!approverName) {
      return res.status(403).json({
        error: 'Unable to establish trusted approver identity: Approver has no verified name on record.'
      });
    }

    req.user.name = approverName;

    // F-03: Atomic sales order approval and audit logging using dedicated connection & transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Fetch and lock order for update
    const [orders] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ? FOR UPDATE',
      [so_number]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // Status check: must be Pending approval or Draft
    if (order.status !== 'Pending approval' && order.status !== 'Draft') {
      await connection.rollback();
      return res.status(400).json({
        error: `Cannot approve order ${so_number}: order is already in "${order.status}" status. Allowed transition to Approved only from "Pending approval" or "Draft".`
      });
    }

    // Update sales order within transaction
    const approverText = `Approved by ${approverName} (${currentDbRole})`;
    await connection.query(
      'UPDATE sales_orders SET status = "Approved", approval_step = ? WHERE so_number = ?',
      [approverText, so_number]
    );

    // Insert audit log within transaction (fails transaction if audit write fails)
    await auditLogger.logAudit({
      req,
      userId: trustedUser.id,
      userName: approverName,
      role: currentDbRole,
      action: 'APPROVE_SALES_ORDER',
      entityType: 'SALES_ORDER',
      entityId: so_number,
      details: `${currentDbRole} (${approverName}) approved sales order ${so_number}`,
      connection
    });

    await connection.commit();

    const [updated] = await connection.query(
      'SELECT * FROM sales_orders WHERE so_number = ?',
      [so_number]
    );

    res.json({
      success: true,
      message: `Sales order ${so_number} approved successfully by ${currentDbRole}`,
      order: updated[0]
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbErr) {
        console.error('Error during transaction rollback:', rbErr.message);
      }
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Stage 3: Generate Commercial Invoice (enforces status check + sequence)
const invoiceSalesOrder = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  try {
    // 1. Fail-closed Role & Identity verification
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const userRole = (typeof req.user?.role === 'string') ? req.user.role.trim() : '';
    if (!userRole || !INVOICE_ROLES.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: Role "${userRole || 'Unassigned'}" is not authorized to generate invoices. Allowed roles: ${INVOICE_ROLES.join(', ')}.`
      });
    }

    // 2. Fetch order
    const [orders] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    if (orders.length === 0) {
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // 3. Status order check: MUST be 'Approved'
    if (order.status !== 'Approved') {
      return res.status(400).json({
        error: `Cannot generate invoice: sales order must be in "Approved" status (current status: "${order.status}"). Follow allowed order-to-cash flow: Order -> Approval -> Invoice -> Payment.`
      });
    }

    // Check if invoice already exists
    const [existing] = await db.query('SELECT * FROM sales_invoices WHERE so_number = ?', [so_number]);
    if (existing.length > 0) {
      return res.status(400).json({
        error: `Invoice already exists for sales order ${so_number} (${existing[0].invoice_no})`
      });
    }

    // 4. Generate invoice number from database sequence (no Math.random)
    const invoice_no = await getNextDocNumber('sales_invoice', 'INV-2026');
    const invoice_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const officerName = req.user?.name || req.trustedUser?.name || 'Accounts Officer';
    const created_by = `${officerName} (${userRole})`;

    await db.query(
      `INSERT INTO sales_invoices 
       (invoice_no, so_number, customer, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'Unpaid', ?)`,
      [invoice_no, so_number, order.customer, invoice_date, order.delivery_date, order.total_amount, 0.00, order.total_amount, created_by]
    );

    // 5. Update sales order status to Invoiced
    await db.query('UPDATE sales_orders SET status = "Invoiced" WHERE so_number = ?', [so_number]);

    await logAudit({
      req,
      userId: authenticatedUserId,
      userName: officerName,
      role: userRole,
      action: 'CREATE_SALES_INVOICE',
      entityType: 'SALES_INVOICE',
      entityId: invoice_no,
      details: `${userRole} (${officerName}) generated invoice ${invoice_no} for order ${so_number} (PKR ${Number(order.total_amount).toLocaleString()})`
    });

    const [invRows] = await db.query('SELECT * FROM sales_invoices WHERE invoice_no = ?', [invoice_no]);
    res.status(201).json({
      success: true,
      message: `Commercial invoice ${invoice_no} generated for sales order ${so_number}`,
      invoice: invRows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Stage 4: Record Payment (enforces status check + sequence)
const recordSalesPayment = async (req, res) => {
  const so_number = req.params.so_number || req.body.so_number;
  if (!so_number) {
    return res.status(400).json({ error: 'so_number is required' });
  }

  try {
    // 1. Fail-closed Role & Identity verification
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const userRole = (typeof req.user?.role === 'string') ? req.user.role.trim() : '';
    if (!userRole || !PAYMENT_ROLES.includes(userRole)) {
      return res.status(403).json({
        error: `Access Denied: Role "${userRole || 'Unassigned'}" is not authorized to record payments. Allowed roles: ${PAYMENT_ROLES.join(', ')}.`
      });
    }

    // 2. Fetch order
    const [orders] = await db.query('SELECT * FROM sales_orders WHERE so_number = ?', [so_number]);
    if (orders.length === 0) {
      return res.status(404).json({ error: `Sales order ${so_number} not found` });
    }
    const order = orders[0];

    // 3. Status order check: MUST be 'Invoiced'
    if (order.status !== 'Invoiced') {
      return res.status(400).json({
        error: `Cannot record payment: order must be in "Invoiced" status (current status: "${order.status}"). Follow allowed order-to-cash flow: Order -> Approval -> Invoice -> Payment.`
      });
    }

    // Find the associated invoice
    const [invoices] = await db.query('SELECT * FROM sales_invoices WHERE so_number = ?', [so_number]);
    const invoice = invoices[0];
    const invoice_no = invoice ? invoice.invoice_no : 'DIRECT';

    // 4. Generate payment number from database sequence (no Math.random)
    const payment_no = await getNextDocNumber('sales_payment', 'PAY-2026');
    const payment_date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const amount = Number(req.body.amount) || Number(order.total_amount);
    const payment_method = req.body.payment_method || 'Bank Transfer';
    const reference_no = req.body.reference_no || `TRX-${Date.now().toString().slice(-6)}`;
    const officerName = req.user?.name || req.trustedUser?.name || 'Accounts Officer';
    const received_by = `${officerName} (${userRole})`;

    await db.query(
      `INSERT INTO sales_payments 
       (payment_no, invoice_no, so_number, customer, payment_date, amount, payment_method, reference_no, received_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payment_no, invoice_no, so_number, order.customer, payment_date, amount, payment_method, reference_no, received_by]
    );

    // 5. Update invoice to Paid
    if (invoice) {
      await db.query(
        'UPDATE sales_invoices SET paid_amount = total_amount, status = "Paid" WHERE invoice_no = ?',
        [invoice_no]
      );
    }

    // 6. Update sales order status to Paid
    await db.query('UPDATE sales_orders SET status = "Paid" WHERE so_number = ?', [so_number]);

    await logAudit({
      req,
      action: 'RECORD_SALES_PAYMENT',
      entityType: 'SALES_PAYMENT',
      entityId: payment_no,
      details: `Recorded payment ${payment_no} of PKR ${amount.toLocaleString()} for order ${so_number}`
    });

    const [payRows] = await db.query('SELECT * FROM sales_payments WHERE payment_no = ?', [payment_no]);
    res.status(201).json({
      success: true,
      message: `Payment ${payment_no} recorded successfully for sales order ${so_number}`,
      payment: payRows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * 8. Marketing Campaigns
 */
const getMarketing = async (req, res) => {
  try {
    const [campaigns] = await db.query('SELECT * FROM marketing_campaigns ORDER BY id ASC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 9. Payroll Runs
 */
const getPayroll = async (req, res) => {
  try {
    const [runs] = await db.query('SELECT * FROM payroll_runs ORDER BY id DESC');
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generatePayroll = async (req, res) => {
  const { month } = req.body;
  const preparerName = req.user?.name || req.trustedUser?.name || 'HR Officer';
  const preparerRole = req.user?.role || req.trustedUser?.role || 'HR';
  const run_number = `PAY-2026-00${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, "29 Sep 2026", ?, "Pending approval", ?, 4868088.00)',
      [run_number, month || '2026-10', preparerName]
    );
    await logAudit({
      req,
      userId: req.user?.id,
      userName: preparerName,
      role: preparerRole,
      action: 'GENERATE_PAYROLL',
      entityType: 'PAYROLL',
      entityId: run_number,
      details: `${preparerRole} (${preparerName}) generated payroll batch ${run_number} for period ${month || '2026-10'}`
    });
    res.json({ success: true, run_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 10. Accounts & Finance Overview
 */
const getFinanceOverview = (req, res) => {
  res.json({
    cashAndBank: [
      { name: 'Cash in hand', balance: '800,000', account: 'Cash' },
      { name: 'Bank — Current A/C ••4410', balance: '14,905,300', account: 'Meezan Bank' },
      { name: 'Bank — Current A/C ••2231', balance: '10,713,825', account: 'HBL Mardan' },
      { name: 'Bank — Payroll A/C ••7702', balance: '3,000,000', account: 'MCB' }
    ],
    receivables: {
      total: 'PKR 45,660,034',
      current: '31.0M',
      d1_30: '11.4M',
      d31_60: '3.2M',
      topDebtors: [
        { customer: 'Karachi Egg Wholesalers', amount: '12,386,999' },
        { customer: 'Peek Freans', amount: '7,093,583' },
        { customer: 'Barkat Frisian (value-added)', amount: '5,486,933' },
        { customer: 'Dawn Foods', amount: '3,942,893' },
        { customer: 'Swat Valley Egg Dealers', amount: '3,877,654' }
      ]
    },
    payables: {
      total: 'PKR 27,122,966',
      current: '23.2M',
      d1_30: '4.0M',
      topCreditors: [
        { supplier: 'Frontier Poultry Feeds', amount: '11,119,140' },
        { supplier: 'Swabi Layer Farms', amount: '2,646,840' },
        { supplier: 'Haripur Egg Farm', amount: '2,646,330' },
        { supplier: 'Khyber Cold Chain Logistics', amount: '2,062,160' },
        { supplier: 'Charsadda Poultry Farm', amount: '1,940,905' }
      ]
    }
  });
};

/**
 * 11. Reports: Profit & Loss Statement
 */
const getPnlReport = (req, res) => {
  res.json({
    period: '1 Jul 2026 to 29 Sep 2026',
    revenue: 'PKR 137M',
    grossProfit: 'PKR 29.9M (21.8%)',
    operatingExpenses: 'PKR 28.4M (20.8%)',
    netProfit: 'PKR 1.4M (1.1%)',
    breakdown: [
      { code: '4000', name: 'Sales revenue', amount: '136,824,763', type: 'revenue' },
      { code: '5000', name: 'Cost of eggs sold', amount: '106,954,414', type: 'cogs' },
      { code: '6000', name: 'Salaries & wages', amount: '11,391,970', type: 'expense' },
      { code: '6100', name: 'Rent & utilities', amount: '2,250,000', type: 'expense' },
      { code: '6200', name: 'Admin & office expenses', amount: '7,615,068', type: 'expense' },
      { code: '6300', name: 'Cold-chain transport & fuel', amount: '4,572,895', type: 'expense' },
      { code: '6400', name: 'Marketing & advertising', amount: '2,367,707', type: 'expense' },
      { code: '6500', name: 'Lab testing & quality', amount: '231,753', type: 'expense' }
    ]
  });
};

/**
 * 12. Approval Matrix Settings
 */
const getSettingsMatrix = (req, res) => {
  res.json({
    rules: [
      { doc: 'Purchase requisition', range: '0 to No limit', approvers: ['Department head'] },
      { doc: 'Purchase order Band 1', range: '0 to 500,000', approvers: ['Department head', 'Accounts & Finance'] },
      { doc: 'Purchase order Band 2', range: '500,000 to 2,500,000', approvers: ['Department head', 'Accounts & Finance'] },
      { doc: 'Purchase order Band 3', range: '2,500,000 to No limit', approvers: ['Department head', 'Accounts & Finance', 'CEO'] }
    ]
  });
};

module.exports = {
  getChairmanDashboard,
  getApprovals,
  actionApproval,
  getLiveOperations,
  getGatePasses,
  createGatePass,
  getProcurementPOs,
  createProcurementPO,
  getProductionBoard,
  moveProduction,
  getSalesOrders,
  getSalesOrderDetails,
  createSalesOrder,
  approveSalesOrder,
  invoiceSalesOrder,
  recordSalesPayment,
  getMarketing,
  getPayroll,
  generatePayroll,
  getFinanceOverview,
  getPnlReport,
  getSettingsMatrix
};
