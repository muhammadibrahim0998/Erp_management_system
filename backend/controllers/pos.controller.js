const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Point of Sale (POS) Atomic Checkout with Pessimistic Row Locking (FOR UPDATE)
 */
const checkout = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      customerName,
      customerPhone,
      warehouse,
      items,
      paymentMethod,
      paidAmount,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty. Cannot process checkout.');
    }

    const parsedPaid = parseFloat(paidAmount) || 0;
    const parsedTotal = parseFloat(totalAmount) || 0;
    const parsedSubtotal = parseFloat(subtotal) || 0;
    const parsedTax = parseFloat(taxAmount) || 0;
    const parsedDiscount = parseFloat(discountAmount) || 0;

    if (parsedPaid < parsedTotal && (paymentMethod === 'Cash' || !paymentMethod)) {
      throw new Error(`Insufficient paid amount. Required: PKR ${parsedTotal.toLocaleString()}, Paid: PKR ${parsedPaid.toLocaleString()}`);
    }

    const changeAmount = Math.max(0, parsedPaid - parsedTotal);
    const cashierName = req.user ? req.user.name : (req.body.cashierName || 'Bilal Yousafzai');
    const selectedWarehouse = warehouse || 'Mardan Central Store';

    // 1. Generate Unique Invoice Number (e.g. YAF-INV-20261013-1003)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [cntRows] = await connection.query('SELECT COUNT(*) as cnt FROM pos_orders');
    const invoiceNo = `YAF-INV-${dateStr}-${1000 + cntRows[0].cnt + 1}`;

    // 2. Insert Master POS Order Record
    const [orderResult] = await connection.query(
      `INSERT INTO pos_orders (
        invoice_no, customer_name, customer_phone, warehouse, 
        subtotal, tax_amount, discount_amount, total_amount, 
        paid_amount, change_amount, payment_method, cashier_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
      [
        invoiceNo,
        customerName || 'Walk-in Customer',
        customerPhone || '',
        selectedWarehouse,
        parsedSubtotal,
        parsedTax,
        parsedDiscount,
        parsedTotal,
        parsedPaid,
        changeAmount,
        paymentMethod || 'Cash',
        cashierName
      ]
    );
    const orderId = orderResult.insertId;

    // 3. Process Cart Items with Row-Level Locking (Pessimistic Lock: SELECT ... FOR UPDATE)
    const insertedLineItems = [];
    for (const cartItem of items) {
      const itemId = cartItem.id;
      const requestedQty = parseInt(cartItem.quantity, 10);
      const unitPrice = parseFloat(cartItem.unit_price) || 0;

      if (!itemId || isNaN(requestedQty) || requestedQty <= 0) {
        throw new Error(`Invalid item or quantity for item ID ${itemId}`);
      }

      // Lock row to prevent race conditions across parallel counters
      const [invRows] = await connection.query(
        'SELECT id, code, name, mrd_qty, total_qty, reorder_at, avg_cost FROM inventory_items WHERE id = ? FOR UPDATE',
        [itemId]
      );

      if (invRows.length === 0) {
        throw new Error(`Product with ID #${itemId} not found in inventory.`);
      }

      const product = invRows[0];
      const availableQty = product.mrd_qty ?? product.total_qty;

      // Verify stock availability
      if (availableQty < requestedQty) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${availableQty} trays, Requested: ${requestedQty} trays.`
        );
      }

      const prevQty = product.mrd_qty;
      const newMrdQty = Math.max(0, product.mrd_qty - requestedQty);
      const newTotalQty = Math.max(0, product.total_qty - requestedQty);
      const newTotalValue = newTotalQty * parseFloat(product.avg_cost || 0);

      // Determine reorder status dynamically
      let newStatus = 'OK';
      if (newTotalQty <= product.reorder_at * 0.5) {
        newStatus = 'Reorder';
      } else if (newTotalQty <= product.reorder_at) {
        newStatus = 'Watch';
      }

      // Atomically decrement warehouse and total stock
      await connection.query(
        `UPDATE inventory_items 
         SET mrd_qty = ?, total_qty = ?, total_value = ?, status = ? 
         WHERE id = ?`,
        [newMrdQty, newTotalQty, newTotalValue, newStatus, product.id]
      );

      const lineTotal = requestedQty * unitPrice;

      // Insert line item
      await connection.query(
        `INSERT INTO pos_order_items (order_id, item_id, item_code, item_name, quantity, unit_price, total_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, product.id, product.code, product.name, requestedQty, unitPrice, lineTotal]
      );

      // Record immutable inventory ledger transaction
      await connection.query(
        `INSERT INTO inventory_transactions (item_id, ref_no, transaction_type, quantity_change, prev_qty, new_qty, warehouse, performed_by) 
         VALUES (?, ?, 'POS_SALE', ?, ?, ?, ?, ?)`,
        [product.id, invoiceNo, -requestedQty, prevQty, newMrdQty, selectedWarehouse, cashierName]
      );

      insertedLineItems.push({
        id: product.id,
        code: product.code,
        name: product.name,
        quantity: requestedQty,
        unit_price: unitPrice,
        total_price: lineTotal
      });
    }

    // Commit ACID Transaction
    await connection.commit();

    // Log in central audit trail
    await logAudit({
      req,
      action: 'POS_CHECKOUT',
      entityType: 'POS',
      entityId: invoiceNo,
      details: `POS checkout completed: ${invoiceNo} | PKR ${parsedTotal.toLocaleString()} (${items.length} items) for "${customerName || 'Walk-in'}"`,
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      orderId,
      invoiceNo,
      totalAmount: parsedTotal,
      changeAmount,
      invoice: {
        id: orderId,
        invoice_no: invoiceNo,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || '',
        warehouse: selectedWarehouse,
        subtotal: parsedSubtotal,
        tax_amount: parsedTax,
        discount_amount: parsedDiscount,
        total_amount: parsedTotal,
        paid_amount: parsedPaid,
        change_amount: changeAmount,
        payment_method: paymentMethod || 'Cash',
        cashier_name: cashierName,
        status: 'Completed',
        created_at: new Date().toISOString(),
        items: insertedLineItems
      },
      message: 'Checkout completed successfully with atomic inventory deduction.'
    });

  } catch (err) {
    await connection.rollback();
    await logAudit({
      req,
      action: 'POS_CHECKOUT_FAILED',
      entityType: 'POS',
      entityId: 'FAILED',
      details: `POS checkout aborted: ${err.message}`,
      status: 'FAILED'
    });
    res.status(400).json({ error: err.message });
  } finally {
    connection.release();
  }
};

/**
 * Fetch POS Orders / Invoices History
 */
const getOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, COUNT(i.id) as items_count 
       FROM pos_orders o 
       LEFT JOIN pos_order_items i ON o.id = i.order_id 
       GROUP BY o.id 
       ORDER BY o.id DESC 
       LIMIT 50`
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Fetch single POS Invoice with Line Items (for Receipt printing/PDF)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await db.query(
      'SELECT * FROM pos_orders WHERE id = ? OR invoice_no = ?',
      [id, id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const order = orders[0];
    const [items] = await db.query(
      'SELECT * FROM pos_order_items WHERE order_id = ? ORDER BY id ASC',
      [order.id]
    );
    order.items = items;
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POS Dashboard KPIs & Today's Summary
 */
const getStats = async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as totalOrders,
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0) as todayRevenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) as todayOrders
      FROM pos_orders
    `);

    const [traysStats] = await db.query(`
      SELECT COALESCE(SUM(i.quantity), 0) as totalTraysSold 
      FROM pos_order_items i 
      JOIN pos_orders o ON i.order_id = o.id 
      WHERE DATE(o.created_at) = CURDATE()
    `);

    res.json({
      totalOrders: stats[0].totalOrders,
      totalRevenue: stats[0].totalRevenue,
      todayRevenue: stats[0].todayRevenue,
      todayOrders: stats[0].todayOrders,
      todayTraysSold: traysStats[0].totalTraysSold
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  checkout,
  getOrders,
  getOrderById,
  getStats
};
