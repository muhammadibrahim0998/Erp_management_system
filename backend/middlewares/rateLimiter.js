const { rateLimit } = require('express-rate-limit');

// Helper to bypass rate limiting for verified loopback IP or non-production dev environment
const isLocalhost = (req) => {
  const ip = req.ip || req.connection?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    process.env.NODE_ENV !== 'production'
  );
};

// 1. General API Rate Limiter (Protects against scraping and DoS; skips loopback/dev)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes per IP in production
  skip: isLocalhost,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests to AgenTech ERP API from this IP. Please slow down.'
  }
});

// 2. Strict Auth Rate Limiter (Protects against Brute-Force & Credential Stuffing; skips loopback/dev)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per 15 min per IP in production
  skip: isLocalhost,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
  }
});

// 3. Password Reset Rate Limiter (skips loopback/dev)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
