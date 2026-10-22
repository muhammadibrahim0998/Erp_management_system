const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Fetch Paginated Audit Logs with Filters & KPI Summary Statistics
 */
const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const { action, entityType, status, search } = req.query;

    const conditions = [];
    const params = [];

    if (action && action !== 'ALL') {
      conditions.push('action = ?');
      params.push(action);
    }
    if (entityType && entityType !== 'ALL') {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }
    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(user_name LIKE ? OR action LIKE ? OR details LIKE ? OR ip_address LIKE ? OR entity_id LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    const logsQuery = `
      SELECT id, user_id, user_name, role, action, entity_type, entity_id, details, ip_address, status, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;
    const [logs] = await db.query(logsQuery, [...params, limit, offset]);

    // Summary statistics for dashboard cards
    const [statsResult] = await db.query(`
      SELECT 
        COUNT(*) as totalEvents,
        COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) as failedEvents,
        COALESCE(SUM(CASE WHEN status = 'WARNING' THEN 1 ELSE 0 END), 0) as warningEvents,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) as todayEvents,
        COUNT(DISTINCT user_name) as uniqueActors
      FROM audit_logs
    `);

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      },
      stats: statsResult[0] || { totalEvents: 0, failedEvents: 0, warningEvents: 0, todayEvents: 0, uniqueActors: 0 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Export filtered audit logs (up to 1,000 records)
 */
const exportAuditLogs = async (req, res) => {
  try {
    const { action, entityType, status, search } = req.query;
    const conditions = [];
    const params = [];

    if (action && action !== 'ALL') {
      conditions.push('action = ?');
      params.push(action);
    }
    if (entityType && entityType !== 'ALL') {
      conditions.push('entity_type = ?');
      params.push(entityType);
    }
    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(status);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push('(user_name LIKE ? OR action LIKE ? OR details LIKE ? OR ip_address LIKE ? OR entity_id LIKE ?)');
      params.push(q, q, q, q, q);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [logs] = await db.query(
      `SELECT id, created_at, user_name, role, action, entity_type, entity_id, ip_address, status, details 
       FROM audit_logs ${whereClause} ORDER BY id DESC LIMIT 1000`,
      params
    );

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Client-side security & UI event logger
 */
const logClientEvent = async (req, res) => {
  try {
    const { action, entityType, entityId, details, status } = req.body;
    await logAudit({
      req,
      action: action || 'CLIENT_ACTION',
      entityType: entityType || 'UI',
      entityId: entityId || null,
      details: details || '',
      status: status || 'SUCCESS'
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAuditLogs,
  exportAuditLogs,
  logClientEvent
};
