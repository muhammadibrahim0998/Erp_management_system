const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { testConnection } = require('./config/db');
const { initDatabase } = require('./initDb');
const { optionalUserExtractor } = require('./middlewares/auth');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const apiRoutes = require('./routes');

// Helper to validate a single origin string
function validateOrigin(rawOrigin) {
  if (typeof rawOrigin !== 'string' || !rawOrigin.trim()) {
    throw new Error('Origin must be a non-empty string');
  }
  const trimmed = rawOrigin.trim();
  if (trimmed.includes('*')) {
    throw new Error(`Wildcard origins ('*') are strictly prohibited: "${trimmed}"`);
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (e) {
    throw new Error(`Invalid origin URL format: "${trimmed}"`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid origin protocol "${parsed.protocol}" in "${trimmed}": only http and https are permitted`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`Origin must not contain credentials: "${trimmed}"`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`Origin must not contain query parameters or hashes: "${trimmed}"`);
  }
  if (parsed.pathname && parsed.pathname !== '/') {
    throw new Error(`Origin must not contain a path component: "${trimmed}"`);
  }
  return parsed.origin;
}

// Helper to resolve allowed origins from environment
function resolveAllowedOrigins(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  const rawAllowed = env.ALLOWED_ORIGINS;

  if (isProduction) {
    if (!rawAllowed || typeof rawAllowed !== 'string' || !rawAllowed.trim()) {
      throw new Error('ALLOWED_ORIGINS environment variable is required and must not be empty in production');
    }
    const origins = rawAllowed.split(',').map((s) => s.trim()).filter(Boolean);
    if (origins.length === 0) {
      throw new Error('ALLOWED_ORIGINS must contain at least one valid origin in production');
    }
    return origins.map(validateOrigin);
  }

  // Development / Test fallback
  if (rawAllowed && typeof rawAllowed === 'string' && rawAllowed.trim()) {
    const origins = rawAllowed.split(',').map((s) => s.trim()).filter(Boolean);
    if (origins.length > 0) {
      return origins.map(validateOrigin);
    }
  }

  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:7001',
    'http://127.0.0.1:7001'
  ];
}

// Security headers middleware for all responses
function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  // HSTS: Only emit when connection is genuinely verified as secure (req.secure).
  // Never trust raw, unverified client-controlled X-Forwarded-Proto headers.
  // In development/test, HSTS is disabled by default to prevent caching on localhost,
  // but can be explicitly enabled with ENABLE_HSTS=true. In production, enabled unless ENABLE_HSTS=false.
  const isProduction = process.env.NODE_ENV === 'production';
  const hstsExplicitlyDisabled = process.env.ENABLE_HSTS === 'false';
  const hstsExplicitlyEnabled = process.env.ENABLE_HSTS === 'true';
  const shouldEmitHsts = Boolean(req.secure) && !hstsExplicitlyDisabled && (isProduction || hstsExplicitlyEnabled);

  if (shouldEmitHsts) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

const app = express();
const PORT = process.env.PORT || 7001;

// Disable Express fingerprinting header
app.disable('x-powered-by');

// Enterprise Security Headers
app.use(securityHeadersMiddleware);

// CORS Configuration
let allowedOrigins;
try {
  allowedOrigins = resolveAllowedOrigins(process.env);
} catch (err) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Fatal CORS Configuration Error:', err.message);
    throw err;
  }
  console.warn('⚠️ CORS configuration warning:', err.message, '- falling back to localhost defaults');
  allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:7001',
    'http://127.0.0.1:7001'
  ];
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, mobile apps, server-to-server) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error('CORS origin not allowed');
    err.statusCode = 403;
    return callback(err);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());

// Request User Context Extractor (for audit trail)
app.use(optionalUserExtractor);

// Base Status Route (sanitized - no internal DB name or port leaks)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'AgenTech ERP — Yousafzai Agri Foods (Pvt) Ltd',
    timestamp: new Date().toISOString()
  });
});

// Minimal Liveness Probe
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Apply General Rate Limiter to /api
app.use('/api', apiLimiter);

// Mount Modular API Routes
app.use('/api', apiRoutes);

// Catch-all 404 handler for unknown API routes
app.use(notFoundHandler);

// Global Centralized Error Handler
app.use(errorHandler);

// Server startup orchestration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const connResult = await testConnection();
    if (!connResult.success && isProduction) {
      throw new Error(`Database connection check failed: ${connResult.error}`);
    }
    await initDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 AgenTech ERP Server is running on http://localhost:${PORT}`);
    });
    return server;
  } catch (error) {
    console.error('❌ Fatal server startup failure:', error.message);
    if (isProduction) {
      process.exit(1);
    }
    // In local development, still allow server to bind so developers can debug or inspect health routes
    const server = app.listen(PORT, () => {
      console.log(`🚀 AgenTech ERP Server is running on http://localhost:${PORT} (DEGRADED - DB Initialization Failed)`);
    });
    return server;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  resolveAllowedOrigins,
  validateOrigin,
  securityHeadersMiddleware
};
