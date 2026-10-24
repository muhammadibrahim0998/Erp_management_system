const { db } = require('./config/db');

async function seedTenRecords() {
  console.log('🔄 Cleaning old static data and seeding exactly 10 dynamic records per page/table in MySQL...');

  try {
    // 1. Workflow Tasks (10 records)
    await db.query('DELETE FROM workflow_tasks');
    const tasks = [
      ['WO-2026-0001', 'Production order', 'Peek Freans · 2,300 kg Bulk Finished Goods', 'Peek Freans', 836000.00, 'high', 'Record production output', 'waiting 1 d ago', 'pending', 'Farhan Ali'],
      ['WO-2026-0002', 'Production order', 'Dawn Foods · 400 kg Standard Batch', 'Dawn Foods', 145000.00, 'normal', 'Assign to Production Manager', 'waiting 5 h ago', 'pending', 'Usama Tariq'],
      ['WO-2026-0003', 'Production order', 'Master Baker · 500 kg Standard Product', 'Master Baker', 182000.00, 'normal', 'Prepare raw material requirement', 'waiting 4 h ago', 'pending', 'Farhan Ali'],
      ['PO-2026-0929', 'Purchase order', 'Premier Packaging Co. · Standard Packaging Units', 'Premier Packaging Co.', 2943392.00, 'high', 'Approve purchase order', 'waiting 3 d ago', 'pending', 'Sana Ullah'],
      ['GRN-2026-0611', 'Goods receipt (GRN)', 'Charsadda Supply Partners · 800 Trays Medium', 'Charsadda Supply Partners', 426600.00, 'normal', 'Receive into store', 'waiting 1 h ago', 'pending', 'Usman Ali'],
      ['RMR-2026-0003', 'Raw material requirement', 'Main Processing Facility – Rashakai Plant', 'Rashakai Plant', 340000.00, 'normal', 'Issue to shift supervisor', 'waiting 1 h ago', 'pending', 'Usman Ali'],
      ['WO-2026-0004', 'Production order', 'Salman Sweets & Bakers · 250 kg Finished Goods', 'Salman Sweets', 92000.00, 'normal', 'Assign to Plant Manager', 'waiting 55 min ago', 'pending', 'Khalid Mehmood'],
      ['GPI-2026-0002', 'Gate pass — inward', 'Swabi Manufacturing & Logistics · Vehicle MRD-4471', 'Swabi Manufacturing & Logistics', 1250000.00, 'normal', 'Start QC inspection', 'waiting 35 min ago', 'pending', 'Dr. Asma Noor'],
      ['SO-2026-0418', 'Sales order', 'Swat Valley Trading Co. · Credit Limit Exception', 'Swat Valley Trading Co.', 1583850.00, 'high', 'CEO Credit Approval exception', 'waiting 2 h ago', 'pending', 'Sana Ullah'],
      ['PAY-2026-0010', 'Payroll run', 'October 2026 Monthly Staff & Plant Payroll Batch', 'YAF Employees (Head Office & Plant)', 4868088.00, 'high', 'Approve payroll disbursement', 'waiting 6 h ago', 'pending', 'Sana Ullah']
    ];
    for (const t of tasks) {
      await db.query(
        'INSERT INTO workflow_tasks (doc_number, doc_type, title, party, amount, priority, action_label, waiting_since, status, assigned_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        t
      );
    }
    console.log('✅ 10 workflow tasks seeded.');

    // 2. Gate Passes (10 records)
    await db.query('DELETE FROM gate_passes');
    const gates = [
      ['GPI-2026-0001', 'CSD-2298', 'Charsadda Supply Partners', 'inward', '2 h ago', 'QC done — unloading'],
      ['GPI-2026-0002', 'MRD-4471', 'Swabi Manufacturing & Logistics', 'inward', '35 min ago', 'At gate — waiting for QC'],
      ['GPI-2026-0003', 'PSW-9912', 'Frontier Raw Materials & Supplies', 'inward', '1 h ago', 'QC done — unloading'],
      ['GPI-2026-0004', 'KHY-8829', 'Khyber Cold Chain Logistics', 'inward', '45 min ago', 'At gate — waiting for QC'],
      ['GPI-2026-0005', 'ISB-3341', 'Premier Packaging Co.', 'inward', '3 h ago', 'Cleared by Store'],
      ['GPO-2026-0001', 'MRD-7710', 'Mardan Sales Point Dispatch', 'outward', '10 min ago', 'Cleared by Store'],
      ['GPO-2026-0002', 'LHR-5521', 'Peek Freans Distribution Truck', 'outward', '1 h ago', 'Dispatched — Gate cleared'],
      ['GPO-2026-0003', 'RWP-1102', 'Tehzeeb Bakers Logistics Fleet', 'outward', '2 h ago', 'Dispatched — Gate cleared'],
      ['GPO-2026-0004', 'SWB-6604', 'Swabi Regional Depot', 'outward', '3 h ago', 'Dispatched — Gate cleared'],
      ['GPO-2026-0005', 'ATK-9018', 'Attock Wholesale Distribution', 'outward', '4 h ago', 'Dispatched — Gate cleared']
    ];
    for (const g of gates) {
      await db.query('INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) VALUES (?, ?, ?, ?, ?, ?)', g);
    }
    console.log('✅ 10 gate passes seeded.');

    // 3. Purchase Orders (10 records)
    await db.query('DELETE FROM purchase_orders');
    const pos = [
      ['PO-2026-0935', '28 Sep 2026', 'Rashakai Engineering Works', 'Draft', 'Waqar Ahmad', 808300.00, 2],
      ['PO-2026-0934', '28 Sep 2026', 'Charsadda Supply Partners', 'Approved', 'Waqar Ahmad', 432000.00, 1],
      ['PO-2026-0933', '27 Sep 2026', 'Mardan Office Supplies', 'Approved', 'Waqar Ahmad', 76110.00, 3],
      ['PO-2026-0932', '26 Sep 2026', 'Premier Packaging Co.', 'Pending approval CEO', 'Waqar Ahmad', 2943392.00, 1],
      ['PO-2026-0931', '24 Sep 2026', 'Swabi Manufacturing & Logistics', 'Partly done', 'Waqar Ahmad', 2335000.00, 2],
      ['PO-2026-0930', '20 Sep 2026', 'Frontier Poultry Feeds', 'Approved', 'Waqar Ahmad', 11119140.00, 5],
      ['PO-2026-0929', '15 Sep 2026', 'Khyber Cold Chain Logistics', 'Received', 'Waqar Ahmad', 2062160.00, 2],
      ['PO-2026-0928', '10 Sep 2026', 'Haripur Egg Farm', 'Received', 'Waqar Ahmad', 2646330.00, 4],
      ['PO-2026-0927', '07 Sep 2026', 'Rashakai Engineering Works', 'Received', 'Waqar Ahmad', 513300.00, 1],
      ['PO-2026-0926', '30 Aug 2026', 'Frontier Raw Materials & Supplies', 'Received', 'Waqar Ahmad', 1534000.00, 4]
    ];
    for (const p of pos) {
      await db.query('INSERT INTO purchase_orders (po_number, po_date, supplier, status, created_by, amount, items_count) VALUES (?, ?, ?, ?, ?, ?, ?)', p);
    }
    console.log('✅ 10 purchase orders seeded.');

    // 4. Production Orders (10 records)
    await db.query('DELETE FROM production_orders');
    const prod = [
      ['WO-2026-0001', 'With GM', 'Salman Sweets & Bakers', 'Standard Processed Pack', 250.00, 5057, 169, '5 Oct 2026', 0.10, 'normal', 363.00],
      ['WO-2026-0002', 'With Plant Manager', 'Dawn Foods', 'Custom Pack (Batch #10)', 400.00, 7282, 243, '4 Oct 2026', 0.20, 'normal', 363.00],
      ['WO-2026-0003', 'With Production Manager', 'Master Baker', 'Standard Finished Goods', 500.00, 10114, 337, '3 Oct 2026', 0.20, 'normal', 363.00],
      ['WO-2026-0004', 'Materials requested', 'Tehzeeb Bakers', 'Premium Pack Goods', 500.00, 10527, 351, '3 Oct 2026', 0.20, 'normal', 363.00],
      ['WO-2026-0005', 'In production', 'Peek Freans', 'Bulk Industrial Finished Goods', 2300.00, 45915, 1531, '1 Oct 2026', 1.02, 'high', 363.00],
      ['WO-2026-0006', 'Completed', 'Barkat Frisian', 'Standard Industrial Product', 1000.00, 20227, 674, '25 Sep 2026', 0.50, 'normal', 363.00],
      ['WO-2026-0007', 'With GM', 'Shezan Bakers', 'Pasteurized Whole Liquid Egg', 600.00, 12136, 405, '6 Oct 2026', 0.25, 'normal', 363.00],
      ['WO-2026-0008', 'With Plant Manager', 'Gourmet Foods', 'Industrial Liquid Egg Yolk', 800.00, 16180, 540, '7 Oct 2026', 0.35, 'normal', 363.00],
      ['WO-2026-0009', 'Materials requested', 'Rahat Bakers', 'Liquid Egg Albumen White', 450.00, 9102, 303, '8 Oct 2026', 0.20, 'normal', 363.00],
      ['WO-2026-0010', 'Completed', 'Karachi General Foodpack', 'Pasteurized Blend Extra Large', 1500.00, 30340, 1011, '20 Sep 2026', 0.70, 'high', 363.00]
    ];
    for (const pr of prod) {
      await db.query(
        'INSERT INTO production_orders (wo_number, stage, customer, product_name, quantity_kg, eggs_to_break, trays_count, due_date, duration_hours, priority, cost_per_kg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        pr
      );
    }
    console.log('✅ 10 production orders seeded.');

    // 5. Inventory Items (10 records)
    await db.query('DELETE FROM inventory_items');
    const inv = [
      ['PRD-01-01-01', 'Premium Product Grade A – Pack Extra Large', 'Products', 540, 225, 90, 45, 0, 0, 900, 800, 610.00, 549000.00, '2 d', 'Watch'],
      ['PRD-01-01-02', 'Standard Product Grade A – Pack Large', 'Products', 3347, 650, 260, 130, 0, 0, 4387, 3000, 575.00, 2522525.00, '3 d', 'OK'],
      ['PRD-01-02-01', 'Standard Product Item – Medium', 'Products', 840, 350, 140, 70, 0, 0, 1400, 1200, 540.00, 756000.00, '2 d', 'Watch'],
      ['PRD-01-02-02', 'Standard Product Item – Small', 'Products', 300, 125, 50, 25, 0, 0, 500, 400, 495.00, 247500.00, '3 d', 'Watch'],
      ['PRD-02-01-01', 'Specialty Product – Large', 'Products', 252, 105, 42, 21, 0, 0, 420, 400, 670.00, 281400.00, '2 d', 'Watch'],
      ['PRD-02-01-02', 'Specialty Product – Medium', 'Products', 180, 75, 30, 15, 0, 0, 300, 250, 635.00, 190500.00, '3 d', 'Watch'],
      ['PRD-03-01-01', 'Organic Product Batch – Large', 'Products', 36, 15, 6, 3, 0, 0, 60, 80, 950.00, 57000.00, '1 d', 'Reorder'],
      ['PRD-03-02-01', 'Custom Formulation Product – Large', 'Products', 54, 23, 9, 4, 0, 0, 90, 60, 900.00, 81000.00, '3 d', 'OK'],
      ['RM-PKG-01', 'Corrugated Export Cartons (30-Pack Box)', 'Packaging', 1200, 400, 200, 100, 300, 0, 2200, 1500, 85.00, 187000.00, '5 d', 'OK'],
      ['RM-TRF-02', 'Industrial Molded Pulp Egg Trays (Heavy Duty)', 'Packaging', 850, 320, 110, 60, 400, 0, 1740, 1200, 120.00, 208800.00, '4 d', 'OK']
    ];
    for (const i of inv) {
      await db.query(
        'INSERT INTO inventory_items (code, name, category, mrd_qty, atk_qty, ccf_qty, phf_qty, rsk_rm_qty, rsk_fg_qty, total_qty, reorder_at, avg_cost, total_value, cover_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        i
      );
    }
    console.log('✅ 10 inventory items seeded.');

    // 6. Sales Orders (10 records)
    await db.query('DELETE FROM sales_orders');
    const sales = [
      ['SO-2026-0418', '28 Sep 2026', '1 Oct 2026', 'Swat Valley Trading Co.', 'Mardan sales point & store', 1583850.00, 4500000.00, 5461504.00, 961504.00, 'Pending approval', 'CEO Waiting', 'Bilal Yousafzai'],
      ['SO-2026-0419', '29 Sep 2026', '2 Oct 2026', 'Peek Freans Food Industries', 'Rashakai Finished Store', 7093583.00, 10000000.00, 7093583.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Imran Khattak'],
      ['SO-2026-0420', '30 Sep 2026', '3 Oct 2026', 'Karachi General Wholesalers', 'Mardan Central Store', 12386999.00, 15000000.00, 12386999.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Bilal Yousafzai'],
      ['SO-2026-0421', '1 Oct 2026', '4 Oct 2026', 'Barkat Frisian (Value Added)', 'Rashakai Finished Store', 5486933.00, 8000000.00, 5486933.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Imran Khattak'],
      ['SO-2026-0422', '2 Oct 2026', '5 Oct 2026', 'Dawn Foods Karachi', 'Mardan Central Store', 3942893.00, 6000000.00, 3942893.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Bilal Yousafzai'],
      ['SO-2026-0423', '3 Oct 2026', '6 Oct 2026', 'Tehzeeb Bakers Rawalpindi', 'Mardan sales point & store', 2850000.00, 5000000.00, 2850000.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Bilal Yousafzai'],
      ['SO-2026-0424', '4 Oct 2026', '7 Oct 2026', 'Master Baker Lahore', 'Rashakai Finished Store', 4200000.00, 5000000.00, 4200000.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Imran Khattak'],
      ['SO-2026-0425', '5 Oct 2026', '8 Oct 2026', 'Salman Sweets Mardan', 'Mardan Central Store', 1120000.00, 2000000.00, 1120000.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Bilal Yousafzai'],
      ['SO-2026-0426', '6 Oct 2026', '9 Oct 2026', 'Gourmet Foods Islamabad', 'Rashakai Finished Store', 3650000.00, 6000000.00, 3650000.00, 0.00, 'Approved', 'Cleared for Dispatch', 'Imran Khattak'],
      ['SO-2026-0427', '7 Oct 2026', '10 Oct 2026', 'Shezan Bakers Peshawar', 'Mardan sales point & store', 2150000.00, 3000000.00, 2150000.00, 0.00, 'Pending approval', 'Finance Waiting', 'Bilal Yousafzai']
    ];
    for (const s of sales) {
      await db.query(
        'INSERT INTO sales_orders (so_number, order_date, delivery_date, customer, warehouse, total_amount, credit_limit, current_exposure, credit_breach, status, approval_step, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        s
      );
    }
    console.log('✅ 10 sales orders seeded.');

    // 7. Marketing Campaigns (10 records)
    await db.query('DELETE FROM marketing_campaigns');
    const campaigns = [
      ['MKB-2026-0001', 'Brand Heritage — Yousafzai Quality Since 1960', '1 Jun 2026 – 31 Aug 2026', 'Completed', 1500000.00, 1480000.00, '950k', '7.1%', 520, '40/40', 35],
      ['MKB-2026-0002', 'Always-on social — premium quality since 1960', '16 Jul 2026 – 14 Oct 2026', 'Live', 1781000.00, 1319000.00, '873k', '6.3%', 498, '36/51', 26],
      ['MKB-2026-0003', 'New product line launch — retail & wholesale', '11 Oct 2026 – 9 Jan 2027', 'In Approval', 4300000.00, 0.00, '1.2M', '7.2%', 0, '20/45', 0],
      ['MKB-2026-0004', 'Winter demand push — dealers & retail', '29 Oct 2026 – 17 Jan 2027', 'In Approval', 2100000.00, 0.00, '500k', '5.0%', 0, '12/30', 0],
      ['MKB-2026-0005', 'B2B Liquid Egg Awareness for Bakeries', '1 Sep 2026 – 30 Nov 2026', 'Live', 2500000.00, 1800000.00, '640k', '8.4%', 310, '25/30', 18],
      ['MKB-2026-0006', 'KP Agri Expo 2026 Peshawar Sponsorship', '15 Sep 2026 – 20 Sep 2026', 'Completed', 850000.00, 850000.00, '320k', '9.5%', 240, '10/10', 8],
      ['MKB-2026-0007', 'Ramadan Advance Booking Campaign', '1 Dec 2026 – 28 Feb 2027', 'Draft', 3200000.00, 0.00, '1.5M', '6.8%', 0, '5/50', 0],
      ['MKB-2026-0008', 'Digital Influencer Chef Recipe Series', '1 Aug 2026 – 31 Oct 2026', 'Live', 1200000.00, 950000.00, '1.1M', '11.2%', 680, '15/15', 12],
      ['MKB-2026-0009', 'Institutional Health & Nutrition Drive', '15 Jul 2026 – 15 Oct 2026', 'Completed', 980000.00, 975000.00, '450k', '5.8%', 190, '18/18', 14],
      ['MKB-2026-0010', 'Modern Trade Supermarket Shelving Promotion', '1 Oct 2026 – 31 Dec 2026', 'Live', 1650000.00, 420000.00, '580k', '6.1%', 215, '14/25', 9]
    ];
    for (const c of campaigns) {
      await db.query(
        'INSERT INTO marketing_campaigns (code, title, dates, status, budget, spent, reach, engagement, leads, creatives, posts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        c
      );
    }
    console.log('✅ 10 marketing campaigns seeded.');

    // 8. Payroll Runs (10 records)
    await db.query('DELETE FROM payroll_runs');
    const payrolls = [
      ['PAY-2026-0010', '29 Sep 2026', '2026-09', 'Pending approval', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0009', '31 Aug 2026', '2026-08', 'Paid', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0008', '31 Jul 2026', '2026-07', 'Paid', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0007', '30 Jun 2026', '2026-06', 'Paid', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0006', '31 May 2026', '2026-05', 'Paid', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0005', '30 Apr 2026', '2026-04', 'Paid', 'Nadia Shah', 4868088.00],
      ['PAY-2026-0004', '31 Mar 2026', '2026-03', 'Paid', 'Nadia Shah', 4650000.00],
      ['PAY-2026-0003', '28 Feb 2026', '2026-02', 'Paid', 'Nadia Shah', 4650000.00],
      ['PAY-2026-0002', '31 Jan 2026', '2026-01', 'Paid', 'Nadia Shah', 4650000.00],
      ['PAY-2026-0001', '31 Dec 2025', '2025-12', 'Paid', 'Nadia Shah', 4500000.00]
    ];
    for (const pr of payrolls) {
      await db.query('INSERT INTO payroll_runs (run_number, run_date, month, status, prepared_by, net_pay) VALUES (?, ?, ?, ?, ?, ?)', pr);
    }
    console.log('✅ 10 payroll runs seeded.');

    // 9. POS Orders (10 records)
    await db.query('DELETE FROM pos_order_items');
    await db.query('DELETE FROM pos_orders');
    const posOrders = [
      ['YAF-INV-20260929-1001', 'Swat Valley Egg Dealers', '0300-9876543', 'Mardan Central Store', 28750.00, 0.00, 500.00, 28250.00, 30000.00, 1750.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1002', 'Walk-in Retail Customer', '0345-1234567', 'Mardan Central Store', 9450.00, 0.00, 0.00, 9450.00, 10000.00, 550.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1003', 'Peshawar Bakers Hub', '0312-3456789', 'Mardan Central Store', 17250.00, 0.00, 250.00, 17000.00, 17000.00, 0.00, 'Bank Transfer', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1004', 'Charsadda Confectionery', '0333-8765432', 'Mardan Central Store', 34500.00, 0.00, 500.00, 34000.00, 35000.00, 1000.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1005', 'Mardan Mart & Store', '0301-4455667', 'Mardan Central Store', 11500.00, 0.00, 0.00, 11500.00, 12000.00, 500.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1006', 'Rashakai Wholesale Client', '0321-7788990', 'Mardan Central Store', 46000.00, 0.00, 1000.00, 45000.00, 45000.00, 0.00, 'Card', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1007', 'Swabi Restaurant Chain', '0344-9988776', 'Mardan Central Store', 23000.00, 0.00, 300.00, 22700.00, 23000.00, 300.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1008', 'Nowshera Food Plaza', '0315-6677889', 'Mardan Central Store', 18400.00, 0.00, 400.00, 18000.00, 18000.00, 0.00, 'Bank Transfer', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1009', 'Abbottabad Bakery Supplies', '0302-1122334', 'Mardan Central Store', 29900.00, 0.00, 900.00, 29000.00, 30000.00, 1000.00, 'Cash', 'Bilal Yousafzai', 'Completed'],
      ['YAF-INV-20260929-1010', 'Malakand Traders', '0334-5566778', 'Mardan Central Store', 13800.00, 0.00, 0.00, 13800.00, 14000.00, 200.00, 'Cash', 'Bilal Yousafzai', 'Completed']
    ];
    for (const po of posOrders) {
      const [res] = await db.query(
        'INSERT INTO pos_orders (invoice_no, customer_name, customer_phone, warehouse, subtotal, tax_amount, discount_amount, total_amount, paid_amount, change_amount, payment_method, cashier_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        po
      );
      await db.query(
        'INSERT INTO pos_order_items (order_id, item_id, item_code, item_name, quantity, unit_price, total_price) VALUES (?, 1, "PRD-01-01-02", "Standard Product Grade A – Pack Large", 20, 575.00, 11500.00)',
        [res.insertId]
      );
    }
    console.log('✅ 10 POS orders seeded.');

    // 10. Audit Logs (10 records)
    await db.query('DELETE FROM audit_logs');
    const auditSeeds = [
      [1, 'Sana Ullah', 'Chairman & CEO', 'LOGIN_SUCCESS', 'AUTH', '1', 'Chairman & CEO logged in from Executive Office', '192.168.1.10', 'SUCCESS'],
      [2, 'Khalid Mehmood', 'General Manager', 'WORKFLOW_APPROVED', 'WORKFLOW', 'WO-2026-0004', 'General Manager approved Work Order WO-2026-0004 for Salman Sweets', '192.168.1.11', 'SUCCESS'],
      [3, 'Saeed ur Rehman', 'Director Operations', 'OPERATION_SCHEDULED', 'PRODUCTION', 'WO-2026-0005', 'Scheduled bulk liquid egg production run on Line #2', '192.168.1.12', 'SUCCESS'],
      [4, 'Mujeeb Ullah', 'Director Finance', 'FINANCE_AUDITED', 'FINANCE', 'FIN-2026-Q3', 'Quarterly treasury and receivables ledger reconciliation complete', '192.168.1.15', 'SUCCESS'],
      [8, 'Gul Rehman', 'Gate Officer', 'CREATE_GATE_PASS', 'GATE_PASS', 'GPI-2026-0002', 'Vehicle MRD-4471 cleared at Rashakai Gate for Raw Material intake', '192.168.2.14', 'SUCCESS'],
      [9, 'Dr. Asma Noor', 'QC Cell', 'QC_INSPECTION_PASSED', 'QUALITY', 'GRN-2026-0611', 'Passed raw shell eggs quality check with 10 units defect deduction', '192.168.2.20', 'SUCCESS'],
      [10, 'Usman Ali', 'Raw Material Store', 'STOCK_ADJUSTMENT', 'INVENTORY', 'PRD-01-01-02', 'Recorded 50 trays stock adjustment in Mardan Central Store', '192.168.2.35', 'SUCCESS'],
      [12, 'Waqar Ahmad', 'Procurement', 'CREATE_PO', 'PURCHASE_ORDER', 'PO-2026-0935', 'Issued purchase order to Rashakai Engineering Works for PKR 808,300', '192.168.1.30', 'SUCCESS'],
      [14, 'Bilal Yousafzai', 'Sales Officer', 'POS_SALE', 'POS_ORDER', 'YAF-INV-20260929-1001', 'Processed POS invoice for Swat Valley Egg Dealers (PKR 28,250)', '192.168.3.10', 'SUCCESS'],
      [20, 'Kamran Ali', 'ERP Admin', 'SYSTEM_AUDIT', 'SECURITY', 'SYS-AUD-10', 'Completed full system access integrity and active sessions verification', '127.0.0.1', 'SUCCESS']
    ];
    for (const a of auditSeeds) {
      await db.query(
        'INSERT INTO audit_logs (user_id, user_name, role, action, entity_type, entity_id, details, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        a
      );
    }
    console.log('✅ 10 audit logs seeded.');

    console.log('✨ All 10 tables updated with exactly 10 dynamic records each!');
  } catch (err) {
    console.error('❌ Error seeding 10 records:', err.message);
  } finally {
    process.exit(0);
  }
}

seedTenRecords();
