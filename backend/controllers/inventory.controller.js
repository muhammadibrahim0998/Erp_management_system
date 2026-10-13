const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const WAREHOUSE_COLS = {
  MRD: 'mrd_qty',
  ATK: 'atk_qty',
  CCF: 'ccf_qty',
  PHF: 'phf_qty',
  RSK_RM: 'rsk_rm_qty',
  RSK_FG: 'rsk_fg_qty'
};

const WAREHOUSE_NAMES = {
  MRD: 'Mardan Central Store & Sales Point',
  ATK: 'Attock Cold Store',
  CCF: 'Charsadda Layer Farm',
  PHF: 'Peshawar Holding Facility',
  RSK_RM: 'Rashakai Plant (Raw Store)',
  RSK_FG: 'Rashakai Plant (Finish Store)'
};

/**
 * Fetch all inventory items
 */
const getInventory = async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM inventory_items ORDER BY id ASC');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Stock Adjustment with ACID Transactions & Ledger Recording
 */
const adjustStock = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id, warehouse = 'MRD', adjust_qty, adjustType = 'add', reason = 'General Adjustment', notes = '' } = req.body;

    const qtyNumber = parseInt(adjust_qty, 10);
    if (!id || isNaN(qtyNumber) || qtyNumber <= 0) {
      throw new Error('Valid Item ID and positive quantity are required');
    }

    const whCol = WAREHOUSE_COLS[warehouse] || 'mrd_qty';
    const whName = WAREHOUSE_NAMES[warehouse] || warehouse;

    // Row-level Lock
    const [rows] = await connection.query(
      `SELECT id, code, name, mrd_qty, atk_qty, ccf_qty, phf_qty, rsk_rm_qty, rsk_fg_qty, total_qty, reorder_at, avg_cost FROM inventory_items WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error(`Item #${id} not found in inventory.`);
    }

    const item = rows[0];
    const prevWhQty = item[whCol] || 0;
    const delta = adjustType === 'subtract' ? -qtyNumber : qtyNumber;
    const newWhQty = prevWhQty + delta;

    if (newWhQty < 0) {
      throw new Error(`Cannot reduce stock below 0 in ${whName}. Current stock: ${prevWhQty}, Attempted reduction: ${qtyNumber}`);
    }

    const newTotalQty = item.total_qty + delta;
    const newTotalValue = newTotalQty * parseFloat(item.avg_cost || 0);

    let newStatus = 'OK';
    if (newTotalQty <= item.reorder_at * 0.5) {
      newStatus = 'Reorder';
    } else if (newTotalQty <= item.reorder_at) {
      newStatus = 'Watch';
    }

    await connection.query(
      `UPDATE inventory_items 
       SET ${whCol} = ?, total_qty = ?, total_value = ?, status = ? 
       WHERE id = ?`,
      [newWhQty, newTotalQty, newTotalValue, newStatus, id]
    );

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refNo = `ADJ-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;
    const performedBy = req.user ? req.user.name : 'Store Manager';

    // Insert into inventory_transactions ledger
    await connection.query(
      `INSERT INTO inventory_transactions 
       (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by) 
       VALUES (?, ?, 'STOCK_ADJUSTMENT', ?, ?, ?, ?, ?)`,
      [id, refNo, delta, prevWhQty, newWhQty, whName, performedBy]
    );

    await connection.commit();

    await logAudit({
      req,
      action: 'ADJUST_INVENTORY',
      entityType: 'INVENTORY',
      entityId: String(id),
      details: `Stock adjustment for "${item.name}" in ${whName}: ${delta >= 0 ? '+' : ''}${delta} trays (${reason}). New Warehouse Stock: ${newWhQty}`,
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: `Stock updated in ${whName}`,
      refNo,
      newWhQty,
      newTotalQty
    });

  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/**
 * Inter-Warehouse Stock Transfer with ACID Transactions & Outward Gate Pass Issuance
 */
const transferStock = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      id,
      fromWarehouse,
      toWarehouse,
      quantity,
      vehicleNumber = '',
      driverName = '',
      notes = '',
      autoGatePass = true
    } = req.body;

    const transferQty = parseInt(quantity, 10);
    if (!id || isNaN(transferQty) || transferQty <= 0) {
      throw new Error('Valid Item ID and positive transfer quantity are required');
    }

    if (!fromWarehouse || !toWarehouse || fromWarehouse === toWarehouse) {
      throw new Error('Source and destination warehouses must be different');
    }

    const fromCol = WAREHOUSE_COLS[fromWarehouse];
    const toCol = WAREHOUSE_COLS[toWarehouse];
    if (!fromCol || !toCol) {
      throw new Error('Invalid warehouse code specified');
    }

    const fromName = WAREHOUSE_NAMES[fromWarehouse];
    const toName = WAREHOUSE_NAMES[toWarehouse];

    // Row-level lock on item
    const [rows] = await connection.query(
      `SELECT id, code, name, mrd_qty, atk_qty, ccf_qty, phf_qty, rsk_rm_qty, rsk_fg_qty, total_qty FROM inventory_items WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error(`Item #${id} not found in inventory.`);
    }

    const item = rows[0];
    const sourceQty = item[fromCol] || 0;
    const destQty = item[toCol] || 0;

    if (sourceQty < transferQty) {
      throw new Error(`Insufficient stock in ${fromName}. Available: ${sourceQty} trays, Requested: ${transferQty} trays.`);
    }

    const newSourceQty = sourceQty - transferQty;
    const newDestQty = destQty + transferQty;

    // Atomically update both warehouse columns
    await connection.query(
      `UPDATE inventory_items 
       SET ${fromCol} = ?, ${toCol} = ? 
       WHERE id = ?`,
      [newSourceQty, newDestQty, id]
    );

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const transferRef = `TRF-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    const performedBy = req.user ? req.user.name : 'Logistics Manager';

    // 1. Ledger entry for dispatch from source warehouse
    await connection.query(
      `INSERT INTO inventory_transactions 
       (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by) 
       VALUES (?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?)`,
      [id, transferRef, -transferQty, sourceQty, newSourceQty, fromName, performedBy]
    );

    // 2. Ledger entry for receipt at destination warehouse
    await connection.query(
      `INSERT INTO inventory_transactions 
       (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by) 
       VALUES (?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?)`,
      [id, transferRef, transferQty, destQty, newDestQty, toName, performedBy]
    );

    // 3. Auto Generate Outward Gate Pass if vehicle info is provided
    let gatePassNumber = null;
    if (autoGatePass && vehicleNumber.trim()) {
      const [gateCount] = await connection.query('SELECT COUNT(*) as count FROM gate_passes');
      gatePassNumber = `GPO-2026-00${gateCount[0].count + 1}`;
      await connection.query(
        `INSERT INTO gate_passes (pass_number, vehicle_number, supplier_customer, pass_type, since_time, status) 
         VALUES (?, ?, ?, 'outward', 'Just now', 'En route / In transit')`,
        [
          gatePassNumber,
          vehicleNumber.trim(),
          `Internal Transfer: ${fromName} -> ${toName} (${transferQty} trays ${item.name})`
        ]
      );
    }

    await connection.commit();

    await logAudit({
      req,
      action: 'STOCK_TRANSFER',
      entityType: 'INVENTORY',
      entityId: transferRef,
      details: `Transferred ${transferQty} trays of "${item.name}" from ${fromName} to ${toName} (Vehicle: ${vehicleNumber || 'Internal Logistics'})`,
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      transferRef,
      gatePassNumber,
      message: `Successfully transferred ${transferQty} trays from ${fromName} to ${toName}.`
    });

  } catch (err) {
    await connection.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/**
 * Fetch Inventory Stock Movement Ledger
 */
const getLedger = async (req, res) => {
  try {
    const [txs] = await db.query(
      `SELECT t.*, i.name as item_name, i.code as item_code 
       FROM inventory_transactions t 
       LEFT JOIN inventory_items i ON t.item_id = i.id 
       ORDER BY t.id DESC 
       LIMIT 100`
    );
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  WAREHOUSE_COLS,
  WAREHOUSE_NAMES,
  getInventory,
  adjustStock,
  transferStock,
  getLedger
};
