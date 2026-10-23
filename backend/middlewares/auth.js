const jwt = require('jsonwebtoken');

/**
 * Resolves and validates JWT_SECRET based on runtime environment.
 * In production mode (NODE_ENV === 'production'), a non-empty JWT_SECRET is strictly mandatory;
 * fallback to hardcoded secrets is prohibited and triggers a fail-fast configuration error.
 */
const resolveJwtSecret = (env = process.env) => {
  const isProduction = env.NODE_ENV === 'production';
  const secret = env.JWT_SECRET;

  if (isProduction) {
    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is mandatory in production mode and cannot be empty.'
      );
    }
    return secret.trim();
  }

  // In non-production environments (development, test), allow safe local development secret fallback
  if (secret && typeof secret === 'string' && secret.trim()) {
    return secret.trim();
  }
  return 'yaf_erp_secure_jwt_secret_key_2026_mardan';
};

const JWT_SECRET = resolveJwtSecret();

/**
 * Optional user authentication extractor for general request context & audit logging
 */
const optionalUserExtractor = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * Enforces valid JWT token on protected routes
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

const { db } = require('../config/db');

/**
 * Verifies active database user and returns trusted user record
 */
const getTrustedUser = async (userId) => {
  if (!userId) return null;
  const [rows] = await db.query(
    'SELECT id, name, email, role, department, avatar, status FROM users WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  return rows[0];
};

/**
 * Middleware factory to enforce specific roles based on current database state
 */
const requireRoles = (allowedRoles = []) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: Missing user identity.' });
    }

    try {
      const user = await getTrustedUser(userId);
      if (!user) {
        return res.status(403).json({ error: 'Access denied: User record does not exist.' });
      }

      const normalizedStatus = (typeof user.status === 'string') ? user.status.trim().toLowerCase() : '';
      if (normalizedStatus !== 'active') {
        return res.status(403).json({ error: 'Access denied: User account is inactive or suspended.' });
      }

      const currentDbRole = (typeof user.role === 'string') ? user.role.trim() : '';
      if (allowedRoles.length > 0 && !allowedRoles.includes(currentDbRole)) {
        return res.status(403).json({
          error: `Access Denied: Current role "${currentDbRole || 'Unassigned'}" is not authorized. Allowed roles: ${allowedRoles.join(', ')}.`
        });
      }

      // Sync trusted database user data into request context
      req.trustedUser = user;
      req.user.name = user.name;
      req.user.role = currentDbRole;
      req.user.status = user.status;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Authorization error: Failed to verify user permissions.' });
    }
  };
};

/**
 * Enforces Admin privileges (ERP Admin or Chairman & CEO) backed by database verification
 */
const requireAdmin = requireRoles(['ERP Admin', 'Chairman & CEO']);

module.exports = {
  JWT_SECRET,
  resolveJwtSecret,
  optionalUserExtractor,
  authenticateToken,
  requireRoles,
  requireAdmin,
  getTrustedUser
};
