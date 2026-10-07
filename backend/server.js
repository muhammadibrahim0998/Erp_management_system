const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { db, testConnection } = require('./config/db');
const { initDatabase } = require('./initDb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors());
app.use(express.json());

// 0. Base status route
app.get('/', async (req, res) => {
  res.json({
    status: 'online',
    system: 'AgenTech ERP — Yousafzai Agri Foods (Pvt) Ltd',
    database: process.env.DB_NAME || 'Erp_management',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// 1. Users / 19 Roles (PDF Page 4)
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await db.query('SELECT * FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Chairman's Dashboard API (PDF Page 5)
app.get('/api/dashboard/chairman', async (req, res) => {
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
});

// 3. Approvals & Tasks Inbox (PDF Page 6)
app.get('/api/approvals', async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM workflow_tasks ORDER BY id ASC');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approvals/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approved' | 'rejected' | 'completed'
  try {
    await db.query('UPDATE workflow_tasks SET status = ? WHERE id = ?', [action || 'completed', id]);
    res.json({ success: true, message: `Task ${action || 'processed'} successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Live Operations Control Room (PDF Page 7)
app.get('/api/live-operations', (req, res) => {
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
});

// 5. Gate & Security (PDF Page 8)
app.get('/api/gate', async (req, res) => {
  try {
    const [passes] = await db.query('SELECT * FROM gate_passes ORDER BY id DESC');
    res.json(passes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gate', async (req, res) => {
  const { pass_number, vehicle_number, supplier_customer, pass_type } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, "Just now", "At gate — waiting for QC")',
      [pass_number || `GPI-2026-000${Math.floor(Math.random() * 90 + 10)}`, vehicle_number, supplier_customer, pass_type || 'inward']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Procurement & Purchase Orders (PDF Page 10)
app.get('/api/procurement/pos', async (req, res) => {
  try {
    const [pos] = await db.query('SELECT * FROM purchase_orders ORDER BY id DESC');
    res.json(pos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/procurement/pos', async (req, res) => {
  const { supplier, amount, items_count } = req.body;
  const po_number = `PO-2026-09${Math.floor(Math.random() * 89 + 10)}`;
  try {
    const [result] = await db.query(
      'INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, "29 Sep 2026", ?, "Draft", "Waqar Ahmad", ?, ?)',
      [po_number, supplier, amount, items_count || 1]
    );
    res.json({ success: true, po_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Production Board & Orders (PDF Page 11 & 12)
app.get('/api/production/board', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM production_orders ORDER BY id ASC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production/move', async (req, res) => {
  const { id, stage } = req.body;
  try {
    await db.query('UPDATE production_orders SET stage = ? WHERE id = ?', [stage, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Inventory / Stock on Hand (PDF Page 13)
app.get('/api/inventory', async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM inventory_items ORDER BY id ASC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/adjust', async (req, res) => {
  const { id, adjust_qty } = req.body;
  try {
    await db.query('UPDATE inventory_items SET total_qty = total_qty + ? WHERE id = ?', [adjust_qty, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Sales Orders & Credit Control (PDF Page 14)
app.get('/api/sales/orders', async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM sales_orders ORDER BY id DESC');
    res.json(orders[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales/approve', async (req, res) => {
  const { so_number } = req.body;
  try {
    await db.query('UPDATE sales_orders SET status = "Approved", approval_step = "CEO Approved" WHERE so_number = ?', [so_number]);
    res.json({ success: true, message: 'Sales order approved despite credit limit breach' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Marketing Campaigns (PDF Page 15 & 16)
app.get('/api/marketing', async (req, res) => {
  try {
    const [campaigns] = await db.query('SELECT * FROM marketing_campaigns ORDER BY id ASC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Payroll Runs (PDF Page 17)
app.get('/api/payroll', async (req, res) => {
  try {
    const [runs] = await db.query('SELECT * FROM payroll_runs ORDER BY id DESC');
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/generate', async (req, res) => {
  const { month } = req.body;
  const run_number = `PAY-2026-00${Math.floor(Math.random() * 89 + 10)}`;
  try {
    await db.query(
      'INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, "29 Sep 2026", ?, "Pending approval", "Nadia Shah", 4868088.00)',
      [run_number, month || '2026-10']
    );
    res.json({ success: true, run_number });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Accounts & Finance Overview (PDF Page 18)
app.get('/api/finance/overview', (req, res) => {
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
});

// 13. Reports: Profit & Loss (PDF Page 19)
app.get('/api/reports/pnl', (req, res) => {
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
});

// 14. Approval Matrix Settings (PDF Page 20)
app.get('/api/settings/matrix', (req, res) => {
  res.json({
    rules: [
      { doc: 'Purchase requisition', range: '0 to No limit', approvers: ['Department head'] },
      { doc: 'Purchase order Band 1', range: '0 to 500,000', approvers: ['Department head', 'Accounts & Finance'] },
      { doc: 'Purchase order Band 2', range: '500,000 to 2,500,000', approvers: ['Department head', 'Accounts & Finance'] },
      { doc: 'Purchase order Band 3', range: '2,500,000 to No limit', approvers: ['Department head', 'Accounts & Finance', 'CEO'] }
    ]
  });
});

// Auth routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });
    
    await db.query(
      'INSERT INTO users (name, email, password, role, department, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password, role, department, name.substring(0, 2).toUpperCase()]
    );
    const [newUser] = await db.query('SELECT id, name, email, role, department, avatar FROM users WHERE email = ?', [email]);
    res.json(newUser[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT id, name, email, role, department, avatar FROM users WHERE email = ? AND password = ?', [email, password]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 AgenTech ERP Server is running on http://localhost:${PORT}`);
  await testConnection();
  await initDatabase();
});
