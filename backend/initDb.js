const { db } = require('./config/db');
const bcrypt = require('bcryptjs');

/**
 * Determines whether demonstration and mock data seeding is permitted.
 * In production mode, demo seeding is strictly prohibited under all circumstances,
 * even if SEED_DEMO_DATA=true is configured.
 * In non-production environments (development/test), seeding is enabled by default unless SEED_DEMO_DATA === 'false'.
 */
const shouldSeedDemoData = (env = process.env) => {
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction) {
    return false;
  }
  return env.SEED_DEMO_DATA !== 'false';
};

/**
 * Initializes all required database tables if they do not already exist.
 * Does NOT insert any sample/demo data.
 */
async function initSchema(connection = db) {
  const conn = connection || db;
  try {
    // 1. Users & Roles table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        avatar VARCHAR(10) DEFAULT 'US',
        email VARCHAR(100),
        password VARCHAR(255) DEFAULT 'password',
        status VARCHAR(20) DEFAULT 'active',
        token_version INT DEFAULT 1
      )
    `);

    // Ensure token_version column exists on users table idempotently
    const [tokenVersionCols] = await conn.query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'token_version'
    `);
    if (!Array.isArray(tokenVersionCols) || tokenVersionCols.length === 0) {
      try {
        await conn.query('ALTER TABLE users ADD COLUMN token_version INT DEFAULT 1');
        await conn.query('UPDATE users SET token_version = 1 WHERE token_version IS NULL');
      } catch (alterErr) {
        if (!alterErr.message.includes('Duplicate column name') && alterErr.code !== 'ER_DUP_FIELDNAME') {
          throw alterErr;
        }
      }

      // Explicit post-verification of token_version column existence
      const [postTokenCols] = await conn.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'users' 
          AND COLUMN_NAME = 'token_version'
      `);
      if (!Array.isArray(postTokenCols) || postTokenCols.length === 0) {
        throw new Error(
          'FATAL MIGRATION FAILURE: Column "token_version" on users table could not be verified after ALTER TABLE.'
        );
      }
    }


    // 2. Approvals & Workflow Tasks
    await conn.query(`
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
        assigned_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wt_assigned_user (assigned_user_id)
      )
    `);

    // 3. Gate Passes & Vehicles
    await conn.query(`
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
    await conn.query(`
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
    await conn.query(`
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
    await conn.query(`
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
    await conn.query(`
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

    // 7b. Sales Order Items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sales_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        so_number VARCHAR(50) NOT NULL,
        item_code VARCHAR(50) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        rate DECIMAL(10, 2) NOT NULL,
        discount_percent DECIMAL(5, 2) DEFAULT 0.00,
        total_amount DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_soi_so (so_number)
      ) ENGINE=InnoDB;
    `);

    // 7c. Sales Invoices (Order to Cash: Stage 3)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_no VARCHAR(50) NOT NULL UNIQUE,
        so_number VARCHAR(50) NOT NULL UNIQUE,
        customer VARCHAR(255) NOT NULL,
        invoice_date VARCHAR(50) NOT NULL,
        due_date VARCHAR(50),
        subtotal DECIMAL(15, 2) NOT NULL,
        tax_amount DECIMAL(15, 2) DEFAULT 0.00,
        total_amount DECIMAL(15, 2) NOT NULL,
        paid_amount DECIMAL(15, 2) DEFAULT 0.00,
        status VARCHAR(50) DEFAULT 'Unpaid',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inv_so (so_number)
      ) ENGINE=InnoDB;
    `);

    // Ensure UNIQUE constraint on sales_invoices(so_number) alone for existing tables idempotently
    const [invColIndexes] = await conn.query(`
      SELECT INDEX_NAME 
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'sales_invoices' 
        AND NON_UNIQUE = 0 
      GROUP BY INDEX_NAME 
      HAVING COUNT(*) = 1 
         AND MAX(COLUMN_NAME) = 'so_number'
    `);
    const hasUniqueInvoiceSo = Array.isArray(invColIndexes) && invColIndexes.length > 0;
    if (!hasUniqueInvoiceSo) {
      const [dups] = await conn.query(`
        SELECT so_number, COUNT(*) as cnt 
        FROM sales_invoices 
        GROUP BY so_number 
        HAVING cnt > 1
      `);
      if (dups.length > 0) {
        const dupDetails = dups.map(d => `${d.so_number} (${d.cnt} instances)`).join(', ');
        throw new Error(
          `FATAL MIGRATION FAILURE: Cannot apply UNIQUE constraint on sales_invoices(so_number). Found ${dups.length} duplicate so_number record(s): ${dupDetails}. Automatic startup blocked to prevent inconsistent financial state. Manual reconciliation required.`
        );
      }
      try {
        await conn.query('ALTER TABLE sales_invoices ADD UNIQUE KEY uq_sales_invoices_so (so_number)');
      } catch (alterErr) {
        if (!alterErr.message.includes('Duplicate key name') && !alterErr.message.includes('already exists') && alterErr.code !== 'ER_DUP_KEYNAME') {
          throw alterErr;
        }
      }

      // Explicit post-verification of uniqueness constraint on so_number alone
      const [postIndexes] = await conn.query(`
        SELECT INDEX_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'sales_invoices' 
          AND NON_UNIQUE = 0 
        GROUP BY INDEX_NAME 
        HAVING COUNT(*) = 1 
           AND MAX(COLUMN_NAME) = 'so_number'
      `);
      const postUniqueEstablished = Array.isArray(postIndexes) && postIndexes.length > 0;
      if (!postUniqueEstablished) {
        throw new Error(
          'FATAL MIGRATION FAILURE: Unique constraint uq_sales_invoices_so on sales_invoices(so_number) could not be verified after ALTER TABLE.'
        );
      }
    }

    // 7d. Sales Payments (Order to Cash: Stage 4)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sales_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_no VARCHAR(50) NOT NULL UNIQUE,
        invoice_no VARCHAR(50) NOT NULL,
        so_number VARCHAR(50) NOT NULL,
        customer VARCHAR(255) NOT NULL,
        payment_date VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
        reference_no VARCHAR(100),
        received_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pay_so (so_number),
        INDEX idx_pay_inv (invoice_no)
      ) ENGINE=InnoDB;
    `);

    // 7e. Document Sequences (No Math.random)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        seq_key VARCHAR(50) PRIMARY KEY,
        prefix VARCHAR(20) NOT NULL,
        current_val INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Ensure purchase_order sequence is initialized safely if not already present
    const [poSeqRows] = await conn.query(
      "SELECT seq_key FROM document_sequences WHERE seq_key = 'purchase_order'"
    );
    if (poSeqRows.length === 0) {
      const [maxPoRows] = await conn.query(
        "SELECT po_number FROM purchase_orders WHERE po_number LIKE 'PO-2026-%' ORDER BY po_number DESC LIMIT 1"
      );
      let initVal = 935;
      if (maxPoRows.length > 0 && maxPoRows[0]?.po_number) {
        const parts = maxPoRows[0].po_number.split('-');
        const parsed = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(parsed) && parsed > 0) {
          initVal = Math.max(initVal, parsed);
        }
      }
      await conn.query(
        "INSERT IGNORE INTO document_sequences (seq_key, prefix, current_val) VALUES ('purchase_order', 'PO-2026', ?)",
        [initVal]
      );
    }

    // 8. Marketing Campaigns
    await conn.query(`
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
    await conn.query(`
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

    // 10. Central Audit Trail & Activity Logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(100) NOT NULL DEFAULT 'System',
        role VARCHAR(100) NOT NULL DEFAULT 'System',
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
        entity_id VARCHAR(100) NULL,
        details TEXT NULL,
        ip_address VARCHAR(50) DEFAULT '127.0.0.1',
        status VARCHAR(20) DEFAULT 'SUCCESS',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_action (action),
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_entity (entity_type),
        INDEX idx_audit_created (created_at)
      )
    `);

    // 11. POS Orders (Sales Invoices)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_no VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(150) DEFAULT 'Walk-in Customer',
        customer_phone VARCHAR(50) DEFAULT '',
        warehouse VARCHAR(100) DEFAULT 'Mardan Central Store',
        subtotal DECIMAL(12, 2) NOT NULL,
        tax_amount DECIMAL(12, 2) DEFAULT 0.00,
        discount_amount DECIMAL(12, 2) DEFAULT 0.00,
        total_amount DECIMAL(12, 2) NOT NULL,
        paid_amount DECIMAL(12, 2) NOT NULL,
        change_amount DECIMAL(12, 2) DEFAULT 0.00,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        cashier_name VARCHAR(100) DEFAULT 'Cashier',
        status VARCHAR(30) DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pos_invoice (invoice_no),
        INDEX idx_pos_created (created_at)
      ) ENGINE=InnoDB;
    `);

    // 12. POS Order Items (Invoice Lines)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pos_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        item_code VARCHAR(50),
        item_name VARCHAR(150) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_items_order (order_id),
        FOREIGN KEY (order_id) REFERENCES pos_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 13. Inventory Transactions Ledger
    await conn.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        ref_no VARCHAR(50) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        quantity_change INT NOT NULL,
        prev_qty INT NOT NULL,
        new_qty INT NOT NULL,
        warehouse VARCHAR(100),
        performed_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inv_tx_item (item_id),
        INDEX idx_inv_tx_ref (ref_no),
        INDEX idx_inv_tx_created (created_at)
      ) ENGINE=InnoDB;
    `);

    console.log('✅ Tables created or verified.');
  } catch (err) {
    console.error('❌ Schema initialization error:', err.message);
    throw err;
  }
}

/**
 * Seeds initial demonstration data matching system specifications ONLY if tables are currently empty.
 * In production mode, this routine is strictly prohibited and aborted.
 */
async function seedDemoData(connection = db, env = process.env) {
  const conn = connection || db;
  if (env.NODE_ENV === 'production') {
    console.warn('⚠️ Demonstration data seeding is strictly prohibited in production mode.');
    return;
  }
  try {
    // Seed Initial Data matching the PDF if empty
    const [userRows] = await conn.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('🌱 Seeding 19 Yousafzai Agri Foods ERP users from PDF Page 4...');
      const usersData = [
        ['Sana Ullah', 'Chairman & CEO', 'Executive', 'SU', 'ceo@gmail.com', 'ceo12345'],
        ['Khalid Mehmood', 'General Manager', 'Executive', 'KM', 'gm@yaf.com', 'password'],
        ['Saeed ur Rehman', 'Director Operations', 'Operations', 'SR', 'operations@yaf.com', 'password'],
        ['Mujeeb Ullah', 'Director Finance', 'Finance', 'MU', 'finance@yaf.com', 'password'],
        ['Usama Tariq', 'Plant Manager', 'Plant', 'UT', 'plant@yaf.com', 'password'],
        ['Farhan Ali', 'Production Manager', 'Production', 'FA', 'production@yaf.com', 'password'],
        ['Sher Zaman', 'Breaking Supervisor', 'Plant', 'SZ', 'sher.zaman@yaf.com', 'password'],
        ['Gul Rehman', 'Gate Officer', 'Security', 'GR', 'gate@yaf.com', 'password'],
        ['Dr. Asma Noor', 'QC Cell', 'Quality', 'AN', 'qc@yaf.com', 'password'],
        ['Usman Ali', 'Raw Material Store', 'Inventory', 'UA', 'usman.ali@yaf.com', 'password'],
        ['Waqas Ahmed', 'Finish Store & Delivery', 'Logistics', 'WA', 'waqas.ahmed@yaf.com', 'password'],
        ['Waqar Ahmad', 'Procurement', 'Purchasing', 'WA', 'procurement@yaf.com', 'password'],
        ['Imran Khattak', 'Sales Manager', 'Sales', 'IK', 'sales@yaf.com', 'password'],
        ['Bilal Yousafzai', 'Sales Officer', 'Sales', 'BY', 'bilal.yousafzai@yaf.com', 'password'],
        ['Mahnoor Khan', 'Head of Marketing', 'Marketing', 'MK', 'marketing@yaf.com', 'password'],
        ['Sana Gul', 'Social Media & Content', 'Marketing', 'SG', 'sana.gul@yaf.com', 'password'],
        ['Hamza Khan', 'Accounts Officer', 'Finance', 'HK', 'hamza.khan@yaf.com', 'password'],
        ['Nadia Shah', 'HR Manager', 'HR', 'NS', 'hr@yaf.com', 'password'],
        ['Zahid Afridi', 'Poultry Farms', 'Farms', 'ZA', 'zahid.afridi@yaf.com', 'password'],
        ['Kamran Ali', 'Super Admin', 'IT', 'KA', 'superadmin@gmail.com', 'super12345']
      ];
      for (const u of usersData) {
        const passwordToHash = u[5] || 'password';
        const userPasswordHash = await bcrypt.hash(passwordToHash, 10);
        await conn.query(
          'INSERT INTO users (name, role, department, avatar, email, password) VALUES (?, ?, ?, ?, ?, ?)',
          [u[0], u[1], u[2], u[3], u[4], userPasswordHash]
        );
      }
    }

    // Seed Workflow Tasks (PDF Page 6)
    const [taskRows] = await conn.query('SELECT COUNT(*) as count FROM workflow_tasks');
    if (taskRows[0].count === 0) {
      console.log('🌱 Seeding Workflow Tasks from PDF Page 6...');
      const tasks = [
        ['WO-2026-0002', 'Production order', 'Peek Freans · 2,000 units Finished Goods', 'Peek Freans', 836000, 'high', 'Record production output', 'waiting 1 d ago', 'pending', 'Production Manager', 6],
        ['WO-2026-0005', 'Production order', 'Dawn Foods · 400 units Standard Batch', 'Dawn Foods', 145000, 'normal', 'Assign to Production Manager', 'waiting 5 h ago', 'pending', 'Plant Manager', 5],
        ['WO-2026-0004', 'Production order', 'Master Baker · 500 units Standard Product', 'Master Baker', 182000, 'normal', 'Prepare raw material requirement', 'waiting 4 h ago', 'pending', 'Production Manager', 6],
        ['GRN-2026-0611', 'Goods receipt (GRN)', 'Charsadda Supply Partners · 800 Units Medium Products', 'Charsadda Supply Partners', 426600, 'normal', 'Receive into store', 'waiting 1 h ago', 'pending', 'Raw Material Store', 10],
        ['RMR-2026-0003', 'Raw material requirement', 'Main Processing Facility – Rashakai', 'Rashakai Plant', 340000, 'normal', 'Issue to shift supervisor', 'waiting 1 h ago', 'pending', 'Raw Material Store', 10],
        ['WO-2026-0006', 'Production order', 'Salman Sweets & Bakers · 250 units Finished Goods', 'Salman Sweets', 92000, 'normal', 'Assign to Plant Manager', 'waiting 55 min ago', 'pending', 'General Manager', 2],
        ['GPI-2026-0002', 'Gate pass — inward', 'Swabi Manufacturing & Logistics · Vehicle MRD-4471', 'Swabi Manufacturing & Logistics', 1250000, 'normal', 'Start QC inspection', 'waiting 35 min ago', 'pending', 'QC Cell', 9],
        ['PO-2026-0929', 'Purchase order', 'Premier Packaging Co. · Standard Packaging Units', 'Premier Packaging Co.', 2943392, 'high', 'Approve purchase order', 'waiting 3 d ago', 'pending', 'Chairman & CEO', 1]
      ];
      for (const t of tasks) {
        try {
          await conn.query(
            'INSERT INTO workflow_tasks (doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role, assigned_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            t
          );
        } catch (insertErr) {
          if (insertErr.code === 'ER_BAD_FIELD_ERROR' || insertErr.message?.includes('Unknown column')) {
            await conn.query(
              'INSERT INTO workflow_tasks (doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              t.slice(0, 10)
            );
          } else {
            throw insertErr;
          }
        }
      }
    }

    // Seed Purchase Orders (PDF Page 10)
    const [poRows] = await conn.query('SELECT COUNT(*) as count FROM purchase_orders');
    if (poRows[0].count === 0) {
      console.log('🌱 Seeding Purchase Orders from PDF Page 10...');
      const pos = [
        ['PO-2026-0935', '28 Sep 2026', 'Rashakai Engineering Works', 'Draft', 'Waqar Ahmad', 808300, 2],
        ['PO-2026-0931', '28 Sep 2026', 'Charsadda Supply Partners', 'Approved', 'Waqar Ahmad', 432000, 1],
        ['PO-2026-0934', '27 Sep 2026', 'Mardan Office Supplies', 'Approved', 'Waqar Ahmad', 76110, 3],
        ['PO-2026-0929', '26 Sep 2026', 'Premier Packaging Co.', 'Pending approval CEO', 'Waqar Ahmad', 2943392, 1],
        ['PO-2026-0930', '24 Sep 2026', 'Swabi Manufacturing & Logistics', 'Partly done', 'Waqar Ahmad', 2335000, 2],
        ['PO-2026-0933', '7 Sep 2026', 'Rashakai Engineering Works', 'Received', 'Waqar Ahmad', 513300, 1],
        ['PO-2026-0932', '30 Aug 2026', 'Frontier Raw Materials & Supplies', 'Received', 'Waqar Ahmad', 1534000, 4]
      ];
      for (const p of pos) {
        await conn.query('INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, ?, ?, ?, ?, ?, ?)', p);
      }
    }

    // Seed Production Orders (PDF Page 11 & 12)
    const [prodRows] = await conn.query('SELECT COUNT(*) as count FROM production_orders');
    if (prodRows[0].count === 0) {
      console.log('🌱 Seeding Production Orders from PDF Page 11 & 12...');
      const prod = [
        ['WO-2026-0006', 'With GM', 'Salman Sweets & Bakers', 'Standard Processed Pack', 250.00, 5057, 169, '5 Oct 2026', 0.1, 'normal', 363.00],
        ['WO-2026-0005', 'With Plant Manager', 'Dawn Foods', 'Custom Pack (Batch #10)', 400.00, 7282, 243, '4 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0004', 'With Production Manager', 'Master Baker', 'Standard Finished Goods', 500.00, 10114, 337, '3 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0003', 'Materials requested', 'Tehzeeb Bakers', 'Premium Pack Goods', 500.00, 10527, 351, '3 Oct 2026', 0.2, 'normal', 363.00],
        ['WO-2026-0002', 'In production', 'Peek Freans', 'Bulk Industrial Finished Goods', 2300.00, 45915, 1531, '1 Oct 2026', 1.02, 'high', 363.00],
        ['WO-2026-0001', 'Completed', 'Barkat Frisian', 'Standard Industrial Product', 1000.00, 20227, 674, '25 Sep 2026', 0.5, 'normal', 363.00]
      ];
      for (const pr of prod) {
        await conn.query(
          'INSERT INTO production_orders (wo_number, stage, customer, product_name, quantity_kg, eggs_to_break, trays_count, due_date, duration_hours, priority, cost_per_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          pr
        );
      }
    }

    // Seed Inventory items (PDF Page 13)
    const [invRows] = await conn.query('SELECT COUNT(*) as count FROM inventory_items');
    if (invRows[0].count === 0) {
      console.log('🌱 Seeding Inventory Stock from PDF Page 13...');
      const inv = [
        ['PRD-01-01-01', 'Premium Product Grade A – Pack Extra Large', 'Products', 540, 225, 90, 45, 0, 0, 900, 800, 610.00, 549000, '2 d', 'Watch'],
        ['PRD-01-01-02', 'Standard Product Grade A – Pack Large', 'Products', 3347, 650, 260, 130, 0, 0, 4387, 3000, 575.00, 2522525, '3 d', 'OK'],
        ['PRD-01-02-01', 'Standard Product Item – Medium', 'Products', 840, 350, 140, 70, 0, 0, 1400, 1200, 540.00, 756000, '2 d', 'Watch'],
        ['PRD-01-02-02', 'Standard Product Item – Small', 'Products', 300, 125, 50, 25, 0, 0, 500, 400, 495.00, 247500, '3 d', 'Watch'],
        ['PRD-02-01-01', 'Specialty Product – Large', 'Products', 252, 105, 42, 21, 0, 0, 420, 400, 670.00, 281400, '2 d', 'Watch'],
        ['PRD-02-01-02', 'Specialty Product – Medium', 'Products', 180, 75, 30, 15, 0, 0, 300, 250, 635.00, 190500, '3 d', 'Watch'],
        ['PRD-03-01-01', 'Organic Product Batch – Large', 'Products', 36, 15, 6, 3, 0, 0, 60, 80, 950.00, 57000, '1 d', 'Reorder'],
        ['PRD-03-02-01', 'Custom Formulation Product – Large', 'Products', 54, 23, 9, 4, 0, 0, 90, 60, 900.00, 81000, '3 d', 'OK']
      ];
      for (const i of inv) {
        await conn.query(
          'INSERT INTO inventory_items (code, name, category, mrd_qty, atk_qty, ccf_qty, phf_qty, rsk_rm_qty, rsk_fg_qty, total_qty, reorder_at, avg_cost, total_value, cover_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          i
        );
      }
    }

    // Seed Gate passes (PDF Page 8)
    const [gateRows] = await conn.query('SELECT COUNT(*) as count FROM gate_passes');
    if (gateRows[0].count === 0) {
      console.log('🌱 Seeding Gate Passes from PDF Page 8...');
      const gates = [
        ['GPI-2026-0003', 'CSD-2298', 'Charsadda Supply Partners', 'inward', '2 h ago', 'QC done — unloading'],
        ['GPI-2026-0002', 'MRD-4471', 'Swabi Manufacturing & Logistics', 'inward', '35 min ago', 'At gate — waiting for QC'],
        ['GPO-2026-0001', 'Peshawar Dispatch #12', 'Mardan Sales Point', 'outward', '10 min ago', 'Cleared by Store']
      ];
      for (const g of gates) {
        await conn.query('INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, ?, ?)', g);
      }
    }

    // Seed Sales orders (PDF Page 14)
    const [salesRows] = await conn.query('SELECT COUNT(*) as count FROM sales_orders');
    if (salesRows[0].count === 0) {
      console.log('🌱 Seeding Sales Order from PDF Page 14...');
      await conn.query(`
        INSERT INTO sales_orders 
        (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step)
        VALUES 
        ('SO-2026-0418', '28 Sep 2026', '1 Oct 2026', 'Swat Valley Trading Co.', 'Mardan sales point & store', 1583850.00, 4500000.00, 5461504.00, 961504.00, 'Pending approval', 'CEO Waiting')
      `);
    }

    // Seed Sales Order Items for SO-2026-0418 (PDF Page 14)
    const [soiRows] = await conn.query('SELECT COUNT(*) as count FROM sales_order_items');
    if (soiRows[0].count === 0) {
      await conn.query(`
        INSERT INTO sales_order_items 
        (so_number, item_code, item_name, quantity, rate, discount_percent, total_amount)
        VALUES
        ('SO-2026-0418', 'SE-01-01-02', 'White eggs Grade A – Large', 1800.00, 700.00, 8.00, 1159200.00),
        ('SO-2026-0418', 'SE-01-01-01', 'White eggs Grade A – Extra large', 600.00, 745.00, 5.00, 424650.00)
      `);
    }

    // Seed Document Sequences (for sequence-backed doc numbers, no Math.random)
    const [seqRows] = await conn.query('SELECT COUNT(*) as count FROM document_sequences');
    if (seqRows[0].count === 0) {
      await conn.query(`
        INSERT INTO document_sequences (seq_key, prefix, current_val) VALUES
        ('sales_order', 'SO-2026', 418),
        ('sales_invoice', 'INV-2026', 100),
        ('sales_payment', 'PAY-2026', 50),
        ('production_order', 'WO-2026', 100),
        ('payroll_run', 'PAY-2026', 9),
        ('purchase_order', 'PO-2026', 935)
      `);
    }

    // Seed Marketing campaigns (PDF Page 15 & 16)
    const [campRows] = await conn.query('SELECT COUNT(*) as count FROM marketing_campaigns');
    if (campRows[0].count === 0) {
      console.log('🌱 Seeding Marketing Campaigns from PDF Page 15 & 16...');
      await conn.query(`
        INSERT INTO marketing_campaigns
        (code, title, dates, status, budget, spent, reach, engagement, leads, creatives, posts)
        VALUES
        ('MKB-2026-0002', 'Always-on social — premium quality since 1960', '16 Jul 2026 – 14 Oct 2026', 'Live', 1781000.00, 1319000.00, '873k', '6.3%', 498, '36/51', 26),
        ('MKB-2026-0004', 'Winter demand push — dealers & retail', '29 Oct 2026 – 17 Jan 2027', 'In Approval Line', 2100000.00, 0.00, '500k', '5.0%', 0, '12/30', 0),
        ('MKB-2026-0003', 'New product line launch — retail & wholesale', '11 Oct 2026 – 9 Jan 2027', 'In Approval Line', 4300000.00, 0.00, '1.2M', '7.2%', 0, '20/45', 0)
      `);
    }

    // Seed Payroll runs (PDF Page 17)
    const [payRows] = await conn.query('SELECT COUNT(*) as count FROM payroll_runs');
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
        await conn.query('INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, ?, ?, ?, ?, ?)', pr);
      }
    }

    // Seed Initial Audit Logs if empty
    const [auditRows] = await conn.query('SELECT COUNT(*) as count FROM audit_logs');
    if (auditRows[0].count === 0) {
      console.log('🌱 Seeding Enterprise Audit Trail Logs...');
      const auditSeeds = [
        [null, 'System Core', 'System', 'SYSTEM_INITIALIZED', 'SYSTEM', 'BOOT-001', 'AgenTech ERP system initialized for Yousafzai Agri Foods (Pvt) Ltd', '127.0.0.1', 'SUCCESS'],
        [20, 'ERP Admin', 'ERP Admin', 'SECURITY_RULES_LOADED', 'SECURITY', 'SEC-01', 'Rate Limiting & Brute-Force protection active on authentication endpoints', '127.0.0.1', 'SUCCESS'],
        [1, 'Sana Ullah', 'Chairman & CEO', 'LOGIN_SUCCESS', 'AUTH', '1', 'Chairman & CEO logged in from Executive Office', '192.168.1.10', 'SUCCESS'],
        [13, 'Imran Khattak', 'Sales Manager', 'SO_CREDIT_FLAGGED', 'SALES_ORDER', 'SO-2026-0418', 'Credit limit exceeded for Swat Valley Egg Dealers. Sent to CEO approval line', '192.168.1.45', 'WARNING'],
        [12, 'Waqar Ahmad', 'Procurement', 'CREATE_PO', 'PURCHASE_ORDER', 'PO-2026-0901', 'Issued purchase order to Frontier Poultry Feeds for PKR 11,119,140', '192.168.1.30', 'SUCCESS'],
        [8, 'Gul Rehman', 'Gate Officer', 'CREATE_GATE_PASS', 'GATE_PASS', 'GPI-2026-0087', 'Vehicle KHY-8829 cleared at Rashakai Gate for Raw Material intake', '192.168.2.14', 'SUCCESS'],
        [20, 'ERP Admin', 'ERP Admin', 'USER_STATUS_CHANGE', 'USER', '8', 'Gate Officer account role privileges verified & secured', '127.0.0.1', 'SUCCESS']
      ];
      for (const a of auditSeeds) {
        await conn.query(
          'INSERT INTO audit_logs (user_id, user_name, role, action, entity_type, entity_id, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          a
        );
      }
    }

    // Seed Initial POS Orders & Inventory Transactions
    const [posRows] = await conn.query('SELECT COUNT(*) as count FROM pos_orders');
    if (posRows[0].count === 0) {
      console.log('🌱 Seeding Initial Point of Sale (POS) Invoices & Ledger...');
      const [order1] = await conn.query(
        `INSERT INTO pos_orders (invoice_no, customer_name, customer_phone, warehouse, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_method, cashier_name, status)
         VALUES ('YAF-INV-20260929-1001', 'Swat Valley Egg Dealers', '0300-9876543', 'Mardan Central Store', 28750.00, 0.00, 500.00, 28250.00, 30000.00, 1750.00, 'Cash', 'Bilal Yousafzai', 'Completed')`
      );
      await conn.query(
        `INSERT INTO pos_order_items (order_id, item_id, item_code, item_name, quantity, unit_price, total_price)
         VALUES (?, 2, 'SE-01-01-02', 'White eggs Grade A – Large', 50, 575.00, 28750.00)`,
        [order1.insertId]
      );
      await conn.query(
        `INSERT INTO inventory_transactions (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by)
         VALUES (2, 'YAF-INV-20260929-1001', 'POS_SALE', -50, 3397, 3347, 'Mardan Central Store', 'Bilal Yousafzai')`
      );

      const [order2] = await conn.query(
        `INSERT INTO pos_orders (invoice_no, customer_name, customer_phone, warehouse, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_method, cashier_name, status)
         VALUES ('YAF-INV-20260929-1002', 'Walk-in Retail Customer', '0345-1234567', 'Mardan Central Store', 9450.00, 0.00, 0.00, 9450.00, 10000.00, 550.00, 'Cash', 'Bilal Yousafzai', 'Completed')`
      );
      await conn.query(
        `INSERT INTO pos_order_items (order_id, item_id, item_code, item_name, quantity, unit_price, total_price)
         VALUES (?, 1, 'SE-01-01-01', 'White eggs Grade A – Extra large', 10, 610.00, 6100.00),
                (?, 5, 'SE-02-01-01', 'Brown farm eggs – Large', 5, 670.00, 3350.00)`,
        [order2.insertId, order2.insertId]
      );
      await conn.query(
        `INSERT INTO inventory_transactions (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by)
         VALUES (1, 'YAF-INV-20260929-1002', 'POS_SALE', -10, 550, 540, 'Mardan Central Store', 'Bilal Yousafzai'),
                (5, 'YAF-INV-20260929-1002', 'POS_SALE', -5, 257, 252, 'Mardan Central Store', 'Bilal Yousafzai')`
      );
    }

    console.log('✨ All Yousafzai Agri Foods ERP tables and sample data seeded successfully!');
  } catch (error) {
    console.error('❌ Demonstration Data Seeding Error:', error.message);
    throw error;
  }
}

/**
 * Master database initialization routine invoked during server startup.
 * Strictly separates schema initialization from demonstration data seeding.
 */
async function initDatabase(options = {}) {
  const conn = options.db || db;
  const env = options.env || process.env;
  const isProduction = env.NODE_ENV === 'production';
  console.log('🔄 Initializing Yousafzai Agri Foods ERP Database Tables in MySQL...');

  try {
    await initSchema(conn);

    const allowSeed = options.seed !== undefined ? options.seed : shouldSeedDemoData(env);
    if (allowSeed) {
      await seedDemoData(conn, env);
    } else {
      console.log('ℹ️ Demonstration data seeding skipped (disabled by policy).');
    }
  } catch (error) {
    console.error('❌ Database Initialization Error:', error.message);
    if (isProduction || error.message.includes('FATAL MIGRATION FAILURE')) {
      throw error;
    }
  }
}

/**
 * Standalone SEC-03 Database Migration Routine.
 * Strictly decoupled from normal application boot (initDatabase / server.js).
 * Must be executed explicitly via a dedicated migration runner (e.g. migrateSec03.js)
 * after owner authorization is granted.
 */
async function runSec03Migrations(connection = db) {
  const conn = connection || db;
  console.log('🔄 Executing SEC-03 Schema Migrations...');

  // 1. gate_passes: created_by_user_id column and index idx_gp_created_by
  const [gpCols] = await conn.query(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'gate_passes' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(gpCols) || gpCols.length === 0) {
    try {
      await conn.query('ALTER TABLE gate_passes ADD COLUMN created_by_user_id INT NULL');
    } catch (alterErr) {
      if (!alterErr.message.includes('Duplicate column name') && alterErr.code !== 'ER_DUP_FIELDNAME') {
        throw alterErr;
      }
    }
  }

  const [gpIdx] = await conn.query(`
    SELECT INDEX_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'gate_passes' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(gpIdx) || gpIdx.length === 0) {
    try {
      await conn.query('ALTER TABLE gate_passes ADD INDEX idx_gp_created_by (created_by_user_id)');
    } catch (idxErr) {
      if (!idxErr.message.includes('Duplicate key name') && idxErr.code !== 'ER_DUP_KEYNAME') {
        throw idxErr;
      }
    }
  }

  // 2. purchase_orders: created_by_user_id column and index idx_po_created_by
  const [poCols] = await conn.query(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_orders' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(poCols) || poCols.length === 0) {
    try {
      await conn.query('ALTER TABLE purchase_orders ADD COLUMN created_by_user_id INT NULL');
    } catch (alterErr) {
      if (!alterErr.message.includes('Duplicate column name') && alterErr.code !== 'ER_DUP_FIELDNAME') {
        throw alterErr;
      }
    }
  }

  const [poIdx] = await conn.query(`
    SELECT INDEX_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchase_orders' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(poIdx) || poIdx.length === 0) {
    try {
      await conn.query('ALTER TABLE purchase_orders ADD INDEX idx_po_created_by (created_by_user_id)');
    } catch (idxErr) {
      if (!idxErr.message.includes('Duplicate key name') && idxErr.code !== 'ER_DUP_KEYNAME') {
        throw idxErr;
      }
    }
  }

  // 3. production_orders: created_by_user_id column and index idx_prod_created_by
  const [prodCols] = await conn.query(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'production_orders' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(prodCols) || prodCols.length === 0) {
    try {
      await conn.query('ALTER TABLE production_orders ADD COLUMN created_by_user_id INT NULL');
    } catch (alterErr) {
      if (!alterErr.message.includes('Duplicate column name') && alterErr.code !== 'ER_DUP_FIELDNAME') {
        throw alterErr;
      }
    }
  }

  const [prodIdx] = await conn.query(`
    SELECT INDEX_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'production_orders' 
      AND COLUMN_NAME = 'created_by_user_id'
  `);
  if (!Array.isArray(prodIdx) || prodIdx.length === 0) {
    try {
      await conn.query('ALTER TABLE production_orders ADD INDEX idx_prod_created_by (created_by_user_id)');
    } catch (idxErr) {
      if (!idxErr.message.includes('Duplicate key name') && idxErr.code !== 'ER_DUP_KEYNAME') {
        throw idxErr;
      }
    }
  }

  // 4. workflow_tasks: assigned_user_id column and index idx_wt_assigned_user
  const [wtCols] = await conn.query(`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'workflow_tasks'
      AND COLUMN_NAME = 'assigned_user_id'
  `);
  if (!Array.isArray(wtCols) || wtCols.length === 0) {
    try {
      await conn.query('ALTER TABLE workflow_tasks ADD COLUMN assigned_user_id INT NULL AFTER assigned_role');
    } catch (alterErr) {
      if (!alterErr.message.includes('Duplicate column name') && alterErr.code !== 'ER_DUP_FIELDNAME') {
        throw alterErr;
      }
    }
  }

  const [wtIdx] = await conn.query(`
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'workflow_tasks'
      AND COLUMN_NAME = 'assigned_user_id'
  `);
  if (!Array.isArray(wtIdx) || wtIdx.length === 0) {
    try {
      await conn.query('ALTER TABLE workflow_tasks ADD INDEX idx_wt_assigned_user (assigned_user_id)');
    } catch (idxErr) {
      if (!idxErr.message.includes('Duplicate key name') && idxErr.code !== 'ER_DUP_KEYNAME') {
        throw idxErr;
      }
    }
  }

  // 5. Goods Receipts (GRN) — Reviewable Idempotent DDL
  await conn.query(`
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grn_number VARCHAR(50) NOT NULL UNIQUE,
      po_number VARCHAR(50) NULL,
      supplier VARCHAR(255) NOT NULL,
      vehicle_number VARCHAR(50) NULL,
      gate_pass_no VARCHAR(50) NULL,
      receipt_date VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending QC',
      qc_status VARCHAR(50) DEFAULT 'Pending',
      qc_notes TEXT NULL,
      created_by_user_id INT NULL,
      received_by VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_grn_po (po_number),
      INDEX idx_grn_created_by (created_by_user_id),
      INDEX idx_grn_status (status)
    ) ENGINE=InnoDB;
  `);

  // 6. Goods Receipt Items — Reviewable Idempotent DDL
  await conn.query(`
    CREATE TABLE IF NOT EXISTS goods_receipt_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      grn_id INT NOT NULL,
      item_code VARCHAR(50) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      ordered_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
      received_qty DECIMAL(10, 2) NOT NULL,
      accepted_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
      rejected_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
      unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
      warehouse VARCHAR(100) DEFAULT 'Raw Material Store',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gri_grn (grn_id),
      FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  // 7. Raw Material Requirements (RMR) — Reviewable Idempotent DDL
  await conn.query(`
    CREATE TABLE IF NOT EXISTS raw_material_requirements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      rmr_number VARCHAR(50) NOT NULL UNIQUE,
      wo_number VARCHAR(50) NULL,
      requisition_date VARCHAR(50) NOT NULL,
      department VARCHAR(100) DEFAULT 'Liquid Egg Plant',
      status VARCHAR(50) DEFAULT 'Pending',
      created_by_user_id INT NULL,
      requested_by VARCHAR(100) NOT NULL,
      total_items INT DEFAULT 1,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rmr_wo (wo_number),
      INDEX idx_rmr_created_by (created_by_user_id),
      INDEX idx_rmr_status (status)
    ) ENGINE=InnoDB;
  `);

  console.log('✅ SEC-03 migrations applied successfully.');
}

module.exports = {
  initDatabase,
  initSchema,
  runSec03Migrations,
  seedDemoData,
  shouldSeedDemoData
};
