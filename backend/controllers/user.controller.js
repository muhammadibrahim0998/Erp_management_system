const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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
  try {
    const { id } = req.params;
    const { name, email, role, department, status } = req.body;

    const [existing] = await db.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const avatar = name ? name.trim().slice(0, 2).toUpperCase() : undefined;
    await db.query(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role), department = COALESCE(?, department), avatar = COALESCE(?, avatar), status = COALESCE(?, status) WHERE id = ?',
      [name?.trim(), email?.trim().toLowerCase(), role, department, avatar, status, id]
    );

    const [updated] = await db.query(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [id]
    );

    await logAudit({
      req,
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      details: `Admin updated profile for user #${id} (${existing[0].name})`
    });

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Toggle user status: Active / Suspended (Admin only)
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const [existing] = await db.query('SELECT name, email FROM users WHERE id = ?', [id]);
    const userName = existing[0] ? existing[0].name : `User #${id}`;

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);

    await logAudit({
      req,
      action: status === 'active' ? 'ACTIVATE_USER' : 'SUSPEND_USER',
      entityType: 'USER',
      entityId: id,
      details: `Admin changed status of ${userName} to "${status}"`,
      status: status === 'suspended' ? 'WARNING' : 'SUCCESS'
    });

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const [existing] = await db.query('SELECT name, email FROM users WHERE id = ?', [id]);
    const userName = existing[0] ? existing[0].name : `User #${id}`;

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, id]);

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
