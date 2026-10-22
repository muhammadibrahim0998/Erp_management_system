const { db } = require('../config/db');

/**
 * Concurrency-safe document sequence generator backed by MySQL transactions.
 * Never uses Math.random.
 *
 * @param {string} seqKey - e.g. 'sales_order', 'sales_invoice', 'sales_payment'
 * @param {string} defaultPrefix - e.g. 'SO-2026', 'INV-2026', 'PAY-2026'
 * @returns {Promise<string>} - formatted document number e.g. 'SO-2026-0419'
 */
async function getNextDocNumber(seqKey, defaultPrefix = 'DOC') {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Lock sequence record for update to prevent race conditions
    const [rows] = await connection.query(
      'SELECT prefix, current_val FROM document_sequences WHERE seq_key = ? FOR UPDATE',
      [seqKey]
    );

    let prefix = defaultPrefix;
    let nextVal = 1;

    if (rows.length === 0) {
      await connection.query(
        'INSERT INTO document_sequences (seq_key, prefix, current_val) VALUES (?, ?, 1)',
        [seqKey, prefix]
      );
      nextVal = 1;
    } else {
      prefix = rows[0].prefix || defaultPrefix;
      nextVal = Number(rows[0].current_val) + 1;
      await connection.query(
        'UPDATE document_sequences SET current_val = ? WHERE seq_key = ?',
        [nextVal, seqKey]
      );
    }

    await connection.commit();
    return `${prefix}-${String(nextVal).padStart(4, '0')}`;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { getNextDocNumber };
