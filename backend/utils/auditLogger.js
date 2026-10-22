const { db } = require('../config/db');

/**
 * Enterprise Audit Trail Logger
 * Records critical user & system actions into MySQL `audit_logs` table.
 */
async function logAudit({
  userId = null,
  userName = 'System',
  role = 'System',
  action,
  entityType = 'SYSTEM',
  entityId = null,
  details = '',
  ipAddress = '127.0.0.1',
  status = 'SUCCESS',
  req = null
}) {
  try {
    let resolvedUserId = userId;
    let resolvedUserName = userName;
    let resolvedRole = role;
    let resolvedIp = ipAddress;

    if (req) {
      if (req.user) {
        resolvedUserId = resolvedUserId ?? req.user.id;
        resolvedUserName = (resolvedUserName === 'System' || !resolvedUserName) ? (req.user.name || 'User') : resolvedUserName;
        resolvedRole = (resolvedRole === 'System' || !resolvedRole) ? (req.user.role || 'Staff') : resolvedRole;
      }
      
      const forwarded = req.headers['x-forwarded-for'];
      const rawIp = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || ipAddress);
      resolvedIp = rawIp.replace(/^::ffff:/, '');
      if (resolvedIp === '::1') resolvedIp = '127.0.0.1';
    }

    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    const [result] = await db.query(
      `INSERT INTO audit_logs (user_id, user_name, role, action, entity_type, entity_id, details, ip_address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resolvedUserId,
        resolvedUserName,
        resolvedRole,
        action,
        entityType,
        entityId ? String(entityId) : null,
        detailsStr,
        resolvedIp,
        status
      ]
    );

    return result.insertId;
  } catch (err) {
    console.error('❌ Audit log write failure:', err.message);
    return null;
  }
}

module.exports = { logAudit };
