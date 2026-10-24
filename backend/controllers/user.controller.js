const bcrypt = require('bcryptjs');
const { db } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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
  try {
    const { id } = req.params;
    const { name, email, role, department, status } = req.body;

    const [existing] = await db.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role && !VALID_ERP_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role "${role}". Must be an authorized ERP role.` });
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

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateStatus,
  resetPassword
};
