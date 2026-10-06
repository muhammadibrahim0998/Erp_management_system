const { db } = require('./config/db');

async function initDatabase() {
  console.log('🔄 Initializing Yousafzai Agri Foods ERP Database Tables in MySQL...');

  try {
    // 1. Users & Roles table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        avatar VARCHAR(10) DEFAULT 'US',
        email VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active'
      )
    `);

    // 2. Approvals & Workflow Tasks
    await db.query(`
      CREATE TABLE IF NOT EXISTS workflow_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_number VARCHAR(50) NOT NULL UNIQUE,
        doc_type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        party VARCHAR(255),
        amount DECIMAL(15, 2) DEFAULT 0.00,
        priority VARCHAR(20) DEFAULT 'normal',
        action_label VARCHAR(100) NOT NULL,
        waiting_since VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        assigned_role VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Gate Passes & Vehicles
    await db.query(`
      CREATE TABLE IF NOT EXISTS gate_passes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pass_number VARCHAR(50) NOT NULL UNIQUE,
        vehicle_number VARCHAR(50) NOT NULL,
        supplier_customer VARCHAR(255) NOT NULL,
        pass_type ENUM('inward', 'outward') DEFAULT 'inward',
        since_time VARCHAR(50),
        status VARCHAR(100) DEFAULT 'At gate — waiting for QC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Procurement & Purchase Orders
    await db.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        po_date VARCHAR(50) NOT NULL,
        supplier VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Draft',
        created_by VARCHAR(100) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        items_count INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Production Orders (Liquid Egg Plant)
    await db.query(`
      CREATE TABLE IF NOT EXISTS production_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        wo_number VARCHAR(50) NOT NULL UNIQUE,
        stage VARCHAR(50) NOT NULL DEFAULT 'With GM',
        customer VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity_kg DECIMAL(10, 2) NOT NULL,
        eggs_to_break INT NOT NULL,
        trays_count INT NOT NULL,
        due_date VARCHAR(50),
        duration_hours DECIMAL(5, 2) DEFAULT 1.0,
        priority VARCHAR(20) DEFAULT 'normal',
        cost_per_kg DECIMAL(10, 2) DEFAULT 363.00,
        status VARCHAR(50) DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Stock on Hand / Inventory
    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        mrd_qty INT DEFAULT 0,
        atk_qty INT DEFAULT 0,
        ccf_qty INT DEFAULT 0,
        phf_qty INT DEFAULT 0,
        rsk_rm_qty INT DEFAULT 0,
        rsk_fg_qty INT DEFAULT 0,
        total_qty INT NOT NULL,
        reorder_at INT NOT NULL,
        avg_cost DECIMAL(10, 2) NOT NULL,
        total_value DECIMAL(15, 2) NOT NULL,
        cover_days VARCHAR(10) DEFAULT '3 d',
        status ENUM('OK', 'Watch', 'Reorder') DEFAULT 'OK'
      )
    `);

    // 7. Sales Orders & Credit Control
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        so_number VARCHAR(50) NOT NULL UNIQUE,
        order_date VARCHAR(50) NOT NULL,
        delivery_date VARCHAR(50) NOT NULL,
        customer VARCHAR(255) NOT NULL,
        warehouse VARCHAR(100) DEFAULT 'Mardan sales point & store',
        total_amount DECIMAL(15, 2) NOT NULL,
        credit_limit DECIMAL(15, 2) NOT NULL,
        current_exposure DECIMAL(15, 2) NOT NULL,
        credit_breach DECIMAL(15, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending approval',
        approval_step VARCHAR(100) DEFAULT 'CEO Waiting',
        created_by VARCHAR(100) DEFAULT 'Bilal Yousafzai'
      )
    `);

    // 8. Marketing Campaigns
    await db.query(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        dates VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Live',
        budget DECIMAL(15, 2) NOT NULL,
        spent DECIMAL(15, 2) NOT NULL,
        reach VARCHAR(50) DEFAULT '873k',
        engagement VARCHAR(50) DEFAULT '6.3%',
        leads INT DEFAULT 498,
        creatives VARCHAR(50) DEFAULT '36/51',
        posts INT DEFAULT 26
      )
    `);

    // 9. Payroll Runs
    await db.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        run_number VARCHAR(50) NOT NULL UNIQUE,
        run_date VARCHAR(50) NOT NULL,
        month VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'Paid',
        prepared_by VARCHAR(100) DEFAULT 'Nadia Shah',
        net_pay DECIMAL(15, 2) NOT NULL
      )
    `);

    console.log('✅ Tables created or verified.');

    // Seed Initial Data matching the PDF if empty
    const [userRows] = await db.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('🌱 Seeding 19 Yousafzai Agri Foods ERP users from PDF Page 4...');
      const usersData = [
        ['Sana Ullah', 'Chairman & CEO', 'Executive', 'SU'],
        ['Khalid Mehmood', 'General Manager', 'Executive', 'KM'],
        ['Saeed ur Rehman', 'Director Operations', 'Operations', 'SR'],
        ['Mujeeb Ullah', 'Director Finance', 'Finance', 'MU'],
        ['Usama Tariq', 'Plant Manager', 'Plant', 'UT'],
        ['Farhan Ali', 'Production Manager', 'Production', 'FA'],
        ['Sher Zaman', 'Breaking Supervisor', 'Plant', 'SZ'],
        ['Gul Rehman', 'Gate Officer', 'Security', 'GR'],
        ['Dr. Asma Noor', 'QC Cell', 'Quality', 'AN'],
        ['Usman Ali', 'Raw Material Store', 'Inventory', 'UA'],
        ['Waqas Ahmed', 'Finish Store & Delivery', 'Logistics', 'WA'],
        ['Waqar Ahmad', 'Procurement', 'Purchasing', 'WA'],
        ['Imran Khattak', 'Sales Manager', 'Sales', 'IK'],
        ['Bilal Yousafzai', 'Sales Officer', 'Sales', 'BY'],
        ['Mahnoor Khan', 'Head of Marketing', 'Marketing', 'MK'],
        ['Sana Gul', 'Social Media & Content', 'Marketing', 'SG'],
        ['Hamza Khan', 'Accounts Officer', 'Finance', 'HK'],
        ['Nadia Shah', 'HR Manager', 'HR', 'NS'],
        ['Zahid Afridi', 'Poultry Farms', 'Farms', 'ZA'],
        ['Kamran Ali', 'ERP Admin', 'IT', 'KA']
      ];
      for (const u of usersData) {
        await db.query('INSERT INTO users (name, role, department, avatar) VALUES (?, ?, ?, ?)', u);
      }
    }

    // Seed Workflow Tasks (PDF Page 6)
    const [taskRows] = await db.query('SELECT COUNT(*) as count FROM workflow_tasks');
    if (taskRows[0].count === 0) {
      console.log('🌱 Seeding Workflow Tasks from PDF Page 6...');
      const tasks = [
        ['WO-2026-0002', 'Production order', 'Peek Freans · 2,000 kg Liquid Whole Egg', 'Peek Freans', 836000, 'high', 'Record production output', 'waiting 1 d ago', 'pending', 'Farhan Ali'],
        ['WO-2026-0005', 'Production order', 'Dawn Foods · 400 kg Salted Liquid Whole Egg', 'Dawn Foods', 145000, 'normal', 'Assign to Production Manager', 'waiting 5 h ago', 'pending', 'Usama Tariq'],
        ['WO-2026-0004', 'Production order', 'Master Baker · 500 kg Liquid Whole Egg', 'Master Baker', 182000, 'normal', 'Prepare raw material requirement', 'waiting 4 h ago', 'pending', 'Farhan Ali'],
        ['GRN-2026-0611', 'Goods receipt (GRN)', 'Charsadda Poultry Farm · 800 Trays Medium Eggs', 'Charsadda Poultry Farm', 426600, 'normal', 'Receive into store', 'waiting 1 h ago', 'pending', 'Usman Ali'],
        ['RMR-2026-0003', 'Raw material requirement', 'Liquid Egg Plant – Rashakai', 'Rashakai Plant', 340000, 'normal', 'Issue to breaking supervisor', 'waiting 1 h ago', 'pending', 'Usman Ali'],
        ['WO-2026-0006', 'Production order', 'Salman Sweets & Bakers · 250 kg Whole Egg', 'Salman Sweets', 92000, 'normal', 'Assign to Plant Manager', 'waiting 55 min ago', 'pending', 'Khalid Mehmood'],
        ['GPI-2026-0002', 'Gate pass — inward', 'Swabi Layer Farms · Vehicle MRD-4471', 'Swabi Layer Farms', 1250000, 'normal', 'Start QC inspection', 'waiting 35 min ago', 'pending', 'Dr. Asma Noor'],
        ['PO-2026-0929', 'Purchase order', 'Peshawar Pulp Trays · 3-ply egg trays', 'Peshawar Pulp Trays', 2943392, 'high', 'Approve purchase order', 'waiting 3 d ago', 'pending', 'Sana Ullah']
      ];
      for (const t of tasks) {
        await db.query(
          'INSERT INTO workflow_tasks (doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          t
        );
      }
    }

    // Seed Purchase Orders (PDF Page 10)
    const [poRows] = await db.query('SELECT COUNT(*) as count FROM purchase_orders');
    if (poRows[0].count === 0) {
      console.log('🌱 Seeding Purchase Orders from PDF Page 10...');
      const pos = [
        ['PO-2026-0935', '28 Sep 2026', 'Rashakai Engineering Works', 'Draft', 'Waqar Ahmad', 808300, 2],
        ['PO-2026-0931', '28 Sep 2026', 'Charsadda Poultry Farm', 'Approved', 'Waqar Ahmad', 432000, 1],
        ['PO-2026-0934', '27 Sep 2026', 'Mardan Office Supplies', 'Approved', 'Waqar Ahmad', 76110, 3],
        ['PO-2026-0929', '26 Sep 2026', 'Peshawar Pulp Trays', 'Pending approval CEO', 'Waqar Ahmad', 2943392, 1],
        ['PO-2026-0930', '24 Sep 2026', 'Swabi Layer Farms', 'Partly done', 'Waqar Ahmad', 2335000, 2],
        ['PO-2026-0933', '7 Sep 2026', 'Rashakai Engineering Works', 'Received', 'Waqar Ahmad', 513300, 1],
        ['PO-2026-0932', '30 Aug 2026', 'Frontier Poultry Feeds', 'Received', 'Waqar Ahmad', 1534000, 4]
      ];
      for (const p of pos) {
        await db.query('INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, ?, ?, ?, ?, ?, ?)', p);
      }
    }

    // Seed Production Orders (PDF Page 11 & 12)
    const [prodRows] = await db.query('SELECT COUNT(*) as count FROM production_orders');
    if (prodRows[0].count === 0) {
      console.log('🌱 Seeding Production Orders from PDF Page 11 & 12...');
      const prod = [
        ['WO-2026-0006', 'With GM', 'Salman Sweets & Bakers', 'Liquid whole egg', 250.00, 5057, 169, '5 Oct 2026', 0.1, 'normal', 363.00],
        ['WO-2026-0005', 'With Plant Manager', 'Dawn Foods', 'Salted liquid whole egg (10% salt)', 400.00, 7282, 243, '4 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0004', 'With Production Manager', 'Master Baker', 'Liquid whole egg', 500.00, 10114, 337, '3 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0003', 'Materials requested', 'Tehzeeb Bakers', 'Liquid egg yolk & white', 500.00, 10527, 351, '3 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0002', 'In production', 'Peek Freans', 'Pasteurised liquid whole egg & sugared egg', 2300.00, 45915, 1531, '1 Oct 2026', 1.02, 'high', 363.00],
        ['WO-2026-0001', 'Completed', 'Barkat Frisian', 'Liquid whole egg', 1000.00, 20227, 674, '25 Sep 2026', 0.5, 'normal', 363.00]
      ];
      for (const pr of prod) {
        await db.query(
          'INSERT INTO production_orders (wo_number, stage, customer, product_name, quantity_kg, eggs_to_break, trays_count, due_date, duration_hours, priority, cost_per_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          pr
        );
      }
    }

    // Seed Inventory items (PDF Page 13)
    const [invRows] = await db.query('SELECT COUNT(*) as count FROM inventory_items');
    if (invRows[0].count === 0) {
      console.log('🌱 Seeding Inventory Stock from PDF Page 13...');
      const inv = [
        ['SE-01-01-01', 'White eggs Grade A – Extra large', 'Eggs', 540, 225, 90, 45, 0, 0, 900, 800, 610.00, 549000, '2 d', 'Watch'],
        ['SE-01-01-02', 'White eggs Grade A – Large', 'Eggs', 3347, 650, 260, 130, 0, 0, 4387, 3000, 575.00, 2522525, '3 d', 'OK'],
        ['SE-01-02-01', 'White eggs – Medium', 'Eggs', 840, 350, 140, 70, 0, 0, 1400, 1200, 540.00, 756000, '2 d', 'Watch'],
        ['SE-01-02-02', 'White eggs – Small', 'Eggs', 300, 125, 50, 25, 0, 0, 500, 400, 495.00, 247500, '3 d', 'Watch'],
        ['SE-02-01-01', 'Brown farm eggs – Large', 'Eggs', 252, 105, 42, 21, 0, 0, 420, 400, 670.00, 281400, '2 d', 'Watch'],
        ['SE-02-01-02', 'Brown farm eggs – Medium', 'Eggs', 180, 75, 30, 15, 0, 0, 300, 250, 635.00, 190500, '3 d', 'Watch'],
        ['SE-03-01-01', 'Organic eggs – Large', 'Eggs', 36, 15, 6, 3, 0, 0, 60, 80, 950.00, 57000, '1 d', 'Reorder'],
        ['SE-03-02-01', 'Omega-3 eggs – Large', 'Eggs', 54, 23, 9, 4, 0, 0, 90, 60, 900.00, 81000, '3 d', 'OK']
      ];
      for (const i of inv) {
        await db.query(
          'INSERT INTO inventory_items (code, name, category, mrd_qty, atk_qty, ccf_qty, phf_qty, rsk_rm_qty, rsk_fg_qty, total_qty, reorder_at, avg_cost, total_value, cover_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          i
        );
      }
    }

    // Seed Gate passes (PDF Page 8)
    const [gateRows] = await db.query('SELECT COUNT(*) as count FROM gate_passes');
    if (gateRows[0].count === 0) {
      console.log('🌱 Seeding Gate Passes from PDF Page 8...');
      const gates = [
        ['GPI-2026-0003', 'CSD-2298', 'Charsadda Poultry Farm', 'inward', '2 h ago', 'QC done — unloading'],
        ['GPI-2026-0002', 'MRD-4471', 'Swabi Layer Farms', 'inward', '35 min ago', 'At gate — waiting for QC'],
        ['GPO-2026-0001', 'Peshawar Dispatch #12', 'Mardan Sales Point', 'outward', '10 min ago', 'Cleared by Store']
      ];
      for (const g of gates) {
        await db.query('INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, ?, ?)', g);
      }
    }

    // Seed Sales orders (PDF Page 14)
    const [salesRows] = await db.query('SELECT COUNT(*) as count FROM sales_orders');
    if (salesRows[0].count === 0) {
      console.log('🌱 Seeding Sales Order from PDF Page 14...');
      await db.query(`
        INSERT INTO sales_orders 
        (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step)
        VALUES 
        ('SO-2026-0418', '28 Sep 2026', '1 Oct 2026', 'Swat Valley Egg Dealers', 'Mardan sales point & store', 1583850.00, 4500000.00, 5461504.00, 961504.00, 'Pending approval', 'CEO Waiting')
      `);
    }

    // Seed Marketing campaigns (PDF Page 15 & 16)
    const [campRows] = await db.query('SELECT COUNT(*) as count FROM marketing_campaigns');
    if (campRows[0].count === 0) {
      console.log('🌱 Seeding Marketing Campaigns from PDF Page 15 & 16...');
      await db.query(`
        INSERT INTO marketing_campaigns
        (code, title, dates, status, budget, spent, reach, engagement, leads, creatives, posts)
        VALUES
        ('MKB-2026-0002', 'Always-on social — farm fresh since 1960', '16 Jul 2026 – 14 Oct 2026', 'Live', 1781000.00, 1319000.00, '873k', '6.3%', 498, '36/51', 26),
        ('MKB-2026-0004', 'Winter demand push — dealers & retail', '29 Oct 2026 – 17 Jan 2027', 'In Approval Line', 2100000.00, 0.00, '500k', '5.0%', 0, '12/30', 0),
        ('MKB-2026-0003', 'Liquid egg launch — bakeries & food industry', '11 Oct 2026 – 9 Jan 2027', 'In Approval Line', 4300000.00, 0.00, '1.2M', '7.2%', 0, '20/45', 0)
      `);
    }

    // Seed Payroll runs (PDF Page 17)
    const [payRows] = await db.query('SELECT COUNT(*) as count FROM payroll_runs');
    if (payRows[0].count === 0) {
      console.log('🌱 Seeding Payroll Runs from PDF Page 17...');
      const payrolls = [
        ['PAY-2026-0009', '29 Sep 2026', '2026-09', 'Pending approval', 'Nadia Shah', 4868088.00],
        ['PAY-2026-0008', '31 Aug 2026', '2026-08', 'Paid', 'Nadia Shah', 4868088.00],
        ['PAY-2026-0007', '31 Jul 2026', '2026-07', 'Paid', 'Nadia Shah', 4868088.00],
        ['PAY-2026-0006', '30 Jun 2026', '2026-06', 'Paid', 'Nadia Shah', 4868088.00],
        ['PAY-2026-0005', '31 May 2026', '2026-05', 'Paid', 'Nadia Shah', 4868088.00],
        ['PAY-2026-0004', '30 Apr 2026', '2026-04', 'Paid', 'Nadia Shah', 4868088.00]
      ];
      for (const pr of payrolls) {
        await db.query('INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, ?, ?, ?, ?, ?)', pr);
      }
    }

    console.log('✨ All Yousafzai Agri Foods ERP tables and sample data seeded successfully!');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error.message);
  }
}

module.exports = { initDatabase };
