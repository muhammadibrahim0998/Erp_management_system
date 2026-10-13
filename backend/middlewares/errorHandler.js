/**
 * Centralized Error Handling & Async Controller Wrapper
 */

// Async Handler helper to avoid repetitive try-catch blocks
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 Not Found Handler for unknown API endpoints
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

// Global Express Error Middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  if (statusCode >= 500) {
    console.error('🔥 Server Error [500]:', err.stack || err.message);
  } else {
    console.warn(`⚠️ Client Error [${statusCode}]:`, err.message);
  }

  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler
};
