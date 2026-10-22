const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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
  try {
    await db.query('UPDATE workflow_tasks SET status = ? WHERE id = ?', [action || 'completed', id]);
    await logAudit({
      req,
      action: `WORKFLOW_${(action || 'COMPLETED').toUpperCase()}`,
      entityType: 'WORKFLOW',
      entityId: id,
      details: `Workflow task #${id} updated to status: ${action || 'completed'}`
    });
    res.json({ success: true, message: `Task ${action || 'processed'} successfully` });
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
  try {
    const [result] = await db.query(
      'INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, "Just now", "At gate — waiting for QC")',
      [passNo, vehicle_number, supplier_customer, pass_type || 'inward']
    );
    await logAudit({
      req,
      action: 'CREATE_GATE_PASS',
      entityType: 'GATE_PASS',
      entityId: passNo,
      details: `Issued ${pass_type || 'inward'} gate pass for vehicle ${vehicle_number} (${supplier_customer || 'General'})`
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
  const po_number = `PO-2026-09${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, "29 Sep 2026", ?, "Draft", "Waqar Ahmad", ?, ?)',
      [po_number, supplier, amount, items_count || 1]
    );
    await logAudit({
      req,
      action: 'CREATE_PO',
      entityType: 'PURCHASE_ORDER',
      entityId: po_number,
      details: `Generated purchase order ${po_number} for supplier: ${supplier} (PKR ${Number(amount).toLocaleString()})`
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
 * 7. Sales Orders & CEO Credit Approval
 */
const getSalesOrders = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders ORDER BY id DESC');
    res.json(orders[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveSalesOrder = async (req, res) => {
  const { so_number } = req.body;
  try {
    await db.query('UPDATE sales_orders SET status = "Approved", approval_step = "CEO Approved" WHERE so_number = ?', [so_number]);
    await logAudit({
      req,
      action: 'APPROVE_SALES_ORDER',
      entityType: 'SALES_ORDER',
      entityId: so_number,
      details: `CEO approved sales order ${so_number} overriding credit threshold`
    });
    res.json({ success: true, message: 'Sales order approved despite credit limit breach' });
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
  const run_number = `PAY-2026-00${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, "29 Sep 2026", ?, "Pending approval", "Nadia Shah", 4868088.00)',
      [run_number, month || '2026-10']
    );
    await logAudit({
      req,
      action: 'GENERATE_PAYROLL',
      entityType: 'PAYROLL',
      entityId: run_number,
      details: `Generated payroll batch ${run_number} for period ${month || '2026-10'}`
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
  approveSalesOrder,
  getMarketing,
  getPayroll,
  generatePayroll,
  getFinanceOverview,
  getPnlReport,
  getSettingsMatrix
};
