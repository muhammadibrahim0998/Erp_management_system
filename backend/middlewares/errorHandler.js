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
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  if (statusCode >= 500) {
    console.error('🔥 Server Error [500]:', err.stack || err.message);
  } else {
    console.warn(`⚠️ Client Error [${statusCode}]:`, err.message);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const clientMessage = (statusCode >= 500 && isProduction)
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    error: clientMessage,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

// Production response sanitizer to ensure direct 5xx json responses in controllers
// do not leak internal database details or error stacks to external clients
const productionResponseSanitizer = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 500 && body && typeof body === 'object' && body.error) {
        return originalJson({
          ...body,
          error: 'Internal Server Error'
        });
      }
      return originalJson(body);
    };
  }
  next();
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler,
  productionResponseSanitizer
};
