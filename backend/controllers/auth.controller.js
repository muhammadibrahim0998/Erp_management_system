const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');
const { logAudit } = require('../utils/auditLogger');

/**
 * Fetch currently authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0 || users[0].status !== 'active') {
      return res.status(401).json({ error: 'User session invalid or account inactive' });
    }
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Register a new user account
 */
const signup = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Finding A: Public signup privilege escalation prevention.
    // Unauthenticated self-registration must never accept or assign privileged roles.
    if (role && role !== 'Staff') {
      return res.status(403).json({
        error: 'Privileged or custom roles cannot be self-assigned during public registration. Contact an ERP Administrator.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email address already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const avatar = name.trim().slice(0, 2).toUpperCase() || 'US';
    // Always assign safe least-privilege default role
    const userRole = 'Staff';
    const userDept = (department && department !== 'Executive' && department !== 'IT') ? department : 'General';

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, department, avatar, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), cleanEmail, hashedPassword, userRole, userDept, avatar, 'active']
    );

    const userPayload = {
      id: result.insertId,
      name: name.trim(),
      email: cleanEmail,
      role: userRole,
      department: userDept,
      avatar,
      status: 'active'
    };

    await logAudit({
      req,
      userId: userPayload.id,
      userName: userPayload.name,
      role: userPayload.role,
      action: 'USER_REGISTERED',
      entityType: 'AUTH',
      entityId: userPayload.id,
      details: `New account registered: ${cleanEmail} (${userRole}, ${userDept})`
    });

    const token = jwt.sign(
      { id: userPayload.id, role: userPayload.role, email: userPayload.email, name: userPayload.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * User login with credential verification and bcrypt check
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [users] = await db.query(
      'SELECT id, name, email, password, role, department, avatar, status FROM users WHERE email = ?',
      [cleanEmail]
    );

    if (users.length === 0) {
      await logAudit({
        req,
        userName: cleanEmail,
        role: 'Unauthenticated',
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        details: `Login failed: Email "${cleanEmail}" does not exist`,
        status: 'FAILED'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    if (user.status && user.status !== 'active') {
      await logAudit({
        req,
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'LOGIN_BLOCKED',
        entityType: 'AUTH',
        entityId: user.id,
        details: `Deactivated user account tried to log in (${cleanEmail})`,
        status: 'WARNING'
      });
      return res.status(403).json({ error: 'Account is deactivated. Please contact ERP Administrator.' });
    }

    let isMatch = false;
    const dbPassword = user.password;
    if (typeof dbPassword === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(dbPassword)) {
      try {
        isMatch = await bcrypt.compare(password, dbPassword);
      } catch (bcryptErr) {
        isMatch = false;
      }
    } else {
      // Legacy plaintext passwords and malformed hashes are strictly rejected
      isMatch = false;
    }

    if (!isMatch) {
      await logAudit({
        req,
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityId: user.id,
        details: `Login failed: Incorrect password for account ${cleanEmail}`,
        status: 'FAILED'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar: user.avatar,
      status: user.status
    };

    await logAudit({
      req,
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      details: `User ${user.name} (${user.role}) logged in successfully`
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: userPayload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Authenticated user: Change own password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const [rows] = await db.query('SELECT password, name, email FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    const newHashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashed, req.user.id]);

    await logAudit({
      req,
      action: 'PASSWORD_CHANGE',
      entityType: 'AUTH',
      entityId: req.user.id,
      details: `User ${rows[0].name || rows[0].email} successfully updated account password`
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getMe,
  signup,
  login,
  changePassword
};
