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
 * Enforces valid JWT token and verifies active database account status on all protected routes
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    const userId = decodedUser?.id || decodedUser?.userId;
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication failed: Missing or invalid user identity in authentication context.'
      });
    }

    try {
      const trustedUser = await getTrustedUser(userId);
      if (!trustedUser) {
        return res.status(403).json({
          error: 'Access denied: User record does not exist. Authenticated user record does not exist.'
        });
      }

      const normalizedStatus = (typeof trustedUser.status === 'string') ? trustedUser.status.trim().toLowerCase() : '';
      if (normalizedStatus !== 'active') {
        return res.status(403).json({
          error: 'Access denied: Approver account is not active. User account is inactive or suspended.'
        });
      }

      // Scope B: Strict token version validation for revocation / password change invalidation
      const rawTokenVersion = decodedUser.token_version;
      const currentTokenVersion = trustedUser.token_version;

      // Fail-closed guard: If database token_version is missing, null, malformed, or invalid (<= 0),
      // reject all tokens immediately. Do NOT silently default to 1, which would preserve old tokens.
      if (typeof currentTokenVersion !== 'number' || !Number.isInteger(currentTokenVersion) || currentTokenVersion <= 0) {
        return res.status(401).json({
          error: 'Token has been revoked or invalidated. Please log in again.'
        });
      }

      if (rawTokenVersion !== undefined) {
        // Enforce strict integer type and value: reject strings (including numeric strings),
        // floats, negative numbers, zero, objects, and version mismatches.
        if (
          typeof rawTokenVersion !== 'number' ||
          !Number.isInteger(rawTokenVersion) ||
          rawTokenVersion <= 0 ||
          rawTokenVersion !== currentTokenVersion
        ) {
          return res.status(401).json({
            error: 'Token has been revoked or invalidated. Please log in again.'
          });
        }
      } else {
        // Unversioned legacy token: valid only if account is still at initial version 1
        if (currentTokenVersion !== 1) {
          return res.status(401).json({
            error: 'Token has been revoked or invalidated. Please log in again.'
          });
        }
      }

      // Establish trusted context from database record; mutable token claims are strictly overridden
      req.trustedUser = trustedUser;
      req.user = {
        id: trustedUser.id,
        name: trustedUser.name,
        email: trustedUser.email,
        role: trustedUser.role,
        department: trustedUser.department,
        avatar: trustedUser.avatar,
        status: trustedUser.status,
        token_version: currentTokenVersion
      };
      next();
    } catch (dbErr) {
      return res.status(500).json({ error: 'Authentication error: Failed to verify account status.' });
    }
  });
};

const { db } = require('../config/db');

/**
 * Verifies active database user and returns trusted user record
 */
const getTrustedUser = async (userId) => {
  if (!userId) return null;
  const [rows] = await db.query(
    'SELECT id, name, email, role, department, avatar, status, token_version FROM users WHERE id = ?',
    [userId]
  );
  if (rows.length === 0) return null;
  const dbUser = rows[0];
  const rawDbVersion = Number(dbUser.token_version);
  const validDbVersion = (Number.isInteger(rawDbVersion) && rawDbVersion > 0) ? rawDbVersion : null;
  return {
    id: dbUser.id,
    name: typeof dbUser.name === 'string' ? dbUser.name.trim() : '',
    email: typeof dbUser.email === 'string' ? dbUser.email.trim().toLowerCase() : '',
    role: typeof dbUser.role === 'string' ? dbUser.role.trim() : 'Staff',
    department: typeof dbUser.department === 'string' ? dbUser.department.trim() : 'General',
    avatar: dbUser.avatar || 'US',
    status: typeof dbUser.status === 'string' ? dbUser.status.trim().toLowerCase() : 'inactive',
    token_version: validDbVersion
  };
};

/**
 * Middleware factory to enforce specific roles based on current database state
 * Reuses req.trustedUser established by authenticateToken to avoid duplicate DB lookups
 */
const requireRoles = (allowedRoles = []) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required: Missing user identity.' });
    }

    try {
      // Reuse trusted user context if already established; otherwise query database
      const user = req.trustedUser || (await getTrustedUser(userId));
      if (!user) {
        return res.status(403).json({ error: 'Access denied: User record does not exist. Authenticated user record does not exist.' });
      }

      const normalizedStatus = (typeof user.status === 'string') ? user.status.trim().toLowerCase() : '';
      if (normalizedStatus !== 'active') {
        return res.status(403).json({
          error: 'Access denied: Approver account is not active. User account is inactive or suspended.'
        });
      }

      const currentDbRole = (typeof user.role === 'string') ? user.role.trim() : '';
      if (allowedRoles.length > 0 && !allowedRoles.includes(currentDbRole)) {
        return res.status(403).json({
          error: `Access Denied: Current role "${currentDbRole || 'Unassigned'}" is not authorized. Allowed roles: ${allowedRoles.join(', ')}.`
        });
      }

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
const requireAdmin = requireRoles(['Super Admin', 'ERP Admin', 'Chairman & CEO']);

module.exports = {
  JWT_SECRET,
  resolveJwtSecret,
  optionalUserExtractor,
  authenticateToken,
  requireRoles,
  requireAdmin,
  getTrustedUser
};
