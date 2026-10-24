const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const auditLogger = require('../utils/auditLogger');
const { logAudit } = auditLogger;

const VALID_ERP_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Operations',
  'Director Finance',
  'Plant Manager',
  'Production Manager',
  'Breaking Supervisor',
  'Gate Officer',
  'QC Cell',
  'Raw Material Store',
  'Finish Store & Delivery',
  'Procurement',
  'Sales Manager',
  'Sales Officer',
  'Head of Marketing',
  'Social Media & Content',
  'Accounts Officer',
  'HR Manager',
  'Poultry Farms',
  'ERP Admin',
  'Staff'
];

/**
 * Fetch all users (Passwords strictly excluded)
 */
const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, department, avatar, status FROM users ORDER BY id ASC'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new user (Admin only)
 */
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({ error: 'Name, email, password, role, and department are required' });
    }
    if (!VALID_ERP_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role "${role}". Must be an authorized ERP role.` });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const avatar = name.trim().slice(0, 2).toUpperCase() || 'US';

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, department, avatar, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanEmail, hashed, role, department, avatar, 'active']
    );

    const [newUser] = await db.query(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [result.insertId]
    );

    await logAudit({
      req,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: result.insertId,
      details: `Admin created user account: ${name.trim()} (${cleanEmail}) as ${role} in ${department}`
    });

    res.json(newUser[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update user profile details (Admin only)
 */
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department, status } = req.body;

  if (role && !VALID_ERP_ROLES.includes(role)) {
    return res.status(400).json({ error: `Invalid role "${role}". Must be an authorized ERP role.` });
  }

  let cleanStatus = undefined;
  if (status !== undefined) {
    if (!status || typeof status !== 'string' || !['active', 'suspended', 'inactive'].includes(status.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Invalid status value. Allowed: active, suspended, inactive' });
    }
    cleanStatus = status.trim().toLowerCase();
  }

  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id, name, email, role, department, avatar, status, token_version FROM users WHERE id = ? FOR UPDATE',
      [id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const currentStatus = (typeof existing[0].status === 'string') ? existing[0].status.trim().toLowerCase() : '';
    const statusChanged = cleanStatus !== undefined && cleanStatus !== currentStatus;

    // Self-modification protection (F-D2.26-01):
    // Administrative callers cannot escalate their own role, change their display name
    // (which could allow impersonating workflow task assignees), or alter their own account status.
    const callerId = Number(req.trustedUser?.id || req.user?.id);
    if (!Number.isInteger(callerId) || callerId <= 0) {
      await connection.rollback();
      return res.status(401).json({ error: 'Authentication required: Missing or invalid caller identity.' });
    }

    const targetId = Number(id);
    if (callerId === targetId) {
      const currentRole = (typeof existing[0].role === 'string') ? existing[0].role.trim() : '';
      const currentName = (typeof existing[0].name === 'string') ? existing[0].name.trim() : '';

      const roleAttempted = role !== undefined;
      const roleChanged = roleAttempted && (
        typeof role !== 'string' ||
        role.trim().toLowerCase() !== currentRole.toLowerCase()
      );

      const nameAttempted = name !== undefined;
      const nameChanged = nameAttempted && (
        typeof name !== 'string' ||
        name.trim().toLowerCase() !== currentName.toLowerCase()
      );

      if (roleChanged) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Access Denied: Administrative users cannot modify their own role.'
        });
      }

      if (nameChanged) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Access Denied: Administrative users cannot modify their own display name.'
        });
      }

      if (statusChanged) {
        await connection.rollback();
        return res.status(403).json({
          error: 'Access Denied: Administrative users cannot modify their own account status.'
        });
      }
    }

    const currentVersion = Number(existing[0].token_version);
    if (statusChanged) {
      if (!Number.isInteger(currentVersion) || currentVersion <= 0) {
        await connection.rollback();
        return res.status(500).json({
          error: 'Authentication error: Account session configuration is invalid. Contact ERP Administrator.'
        });
      }
    }

    const avatar = name ? name.trim().slice(0, 2).toUpperCase() : undefined;

    if (statusChanged) {
      await connection.query(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), avatar = COALESCE(?, avatar), status = ?, token_version = token_version + 1 WHERE id = ?',
        [name?.trim(), email?.trim().toLowerCase(), role, department, avatar, cleanStatus, id]
      );
    } else {
      await connection.query(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), avatar = COALESCE(?, avatar), status = COALESCE(?, status) WHERE id = ?',
        [name?.trim(), email?.trim().toLowerCase(), role, department, avatar, cleanStatus, id]
      );
    }

    const [updated] = await connection.query(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [id]
    );

    await auditLogger.logAudit({
      req,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      details: `Admin updated profile for user #${id} (${existing[0].name})${statusChanged ? ` (status changed to "${cleanStatus}")` : ''}`,
      connection
    });

    await connection.commit();
    res.json(updated[0]);
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    res.status(500).json({ error: err.message || 'Failed to update user profile and record audit log' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Toggle user status: Active / Suspended (Admin only)
 */
const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || typeof status !== 'string' || !['active', 'suspended', 'inactive'].includes(status.trim().toLowerCase())) {
    return res.status(400).json({ error: 'Invalid status value. Allowed: active, suspended, inactive' });
  }
  const cleanStatus = status.trim().toLowerCase();

  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.query(
      'SELECT id, name, email, status, token_version FROM users WHERE id = ? FOR UPDATE',
      [id]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Self-modification protection (F-D2.26-01):
    // Administrative callers cannot alter their own account status (prevents self-suspension or lockout).
    const callerId = Number(req.trustedUser?.id || req.user?.id);
    if (!Number.isInteger(callerId) || callerId <= 0) {
      await connection.rollback();
      return res.status(401).json({ error: 'Authentication required: Missing or invalid caller identity.' });
    }

    const targetId = Number(id);
    if (callerId === targetId) {
      await connection.rollback();
      return res.status(403).json({
        error: 'Access Denied: Administrative users cannot alter their own account status.'
      });
    }

    const currentVersion = Number(existing[0].token_version);
    if (!Number.isInteger(currentVersion) || currentVersion <= 0) {
      await connection.rollback();
      return res.status(500).json({
        error: 'Authentication error: Account session configuration is invalid. Contact ERP Administrator.'
      });
    }

    const currentStatus = (typeof existing[0].status === 'string') ? existing[0].status.trim().toLowerCase() : '';
    const userName = existing[0].name || `User #${id}`;

    // If status is identical, do not needlessly increment token_version; return success idempotently
    if (currentStatus === cleanStatus) {
      await connection.rollback();
      return res.json({ success: true, message: `User status is already ${cleanStatus}` });
    }

    // Status transition: Atomically update status and increment token_version to invalidate prior sessions
    await connection.query(
      'UPDATE users SET status = ?, token_version = token_version + 1 WHERE id = ?',
      [cleanStatus, id]
    );

    await auditLogger.logAudit({
      req,
      action: cleanStatus === 'active' ? 'ACTIVATE_USER' : 'SUSPEND_USER',
      entityType: 'USER',
      entityId: id,
      details: `Admin changed status of ${userName} from "${currentStatus}" to "${cleanStatus}"`,
      status: cleanStatus === 'suspended' ? 'WARNING' : 'SUCCESS',
      connection
    });

    await connection.commit();
    res.json({ success: true, message: `User status updated to ${cleanStatus}` });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    res.status(500).json({ error: err.message || 'Failed to update user status and record audit log' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Admin reset user password
 */
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const [existing] = await db.query('SELECT name, email, token_version FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentVersion = Number(existing[0].token_version);
    if (!Number.isInteger(currentVersion) || currentVersion <= 0) {
      return res.status(500).json({
        error: 'Authentication error: Account session configuration is invalid. Contact ERP Administrator.'
      });
    }
    const userName = existing[0].name || `User #${id}`;

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?',
      [hashed, id]
    );

    await logAudit({
      req,
      action: 'RESET_PASSWORD',
      entityType: 'USER',
      entityId: id,
      details: `Admin reset password for user: ${userName}`,
      status: 'WARNING'
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete user account (Admin only)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user && String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Cannot delete your own logged-in account' });
    }

    const [existing] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = existing[0];
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    await logAudit({
      req,
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      details: `Admin deleted user account: ${targetUser.name} (${targetUser.email}, Role: ${targetUser.role})`,
      status: 'WARNING'
    });

    res.json({ success: true, message: `User ${targetUser.name} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateStatus,
  resetPassword,
  deleteUser
};
