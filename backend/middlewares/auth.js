const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yaf_erp_secure_jwt_secret_key_2026_mardan';

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

/**
 * Enforces Admin privileges (ERP Admin or Chairman & CEO)
 */
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'ERP Admin' || req.user.role === 'Chairman & CEO')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required.' });
  }
};

module.exports = {
  JWT_SECRET,
  optionalUserExtractor,
  authenticateToken,
  requireAdmin
};
