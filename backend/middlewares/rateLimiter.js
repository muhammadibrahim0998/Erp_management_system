const { rateLimit } = require('express-rate-limit');

// Helper to bypass rate limiting for localhost / internal dev environment
const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const host = req.headers['host'] || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    process.env.NODE_ENV !== 'production'
  );
};

// 1. General API Rate Limiter (Never blocks localhost / dev)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100000,
  skip: isLocalhost,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests to AgenTech ERP API from this IP. Please slow down.'
  }
});

// 2. Auth Rate Limiter (Never blocks localhost / dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: isLocalhost,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
  }
});

// 3. Password Reset Rate Limiter (Never blocks localhost / dev)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: isLocalhost,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many password update attempts. Please wait 15 minutes.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter
};
