const { rateLimit } = require('express-rate-limit');

// 1. General API Rate Limiter (Protects against scraping and DoS)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests to AgenTech ERP API from this IP. Please slow down.'
  }
});

// 2. Strict Auth Rate Limiter (Protects against Brute-Force & Credential Stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per 15 min per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.'
  }
});

// 3. Password Reset Rate Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
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
