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

const app = express();
const PORT = process.env.PORT || 7001;

// Core Middlewares
app.use(cors());
app.use(express.json());

// Request User Context Extractor (for audit trail)
app.use(optionalUserExtractor);

// Base Status Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'AgenTech ERP — Yousafzai Agri Foods (Pvt) Ltd',
    database: process.env.DB_NAME || 'Erp_management',
    port: PORT,
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

module.exports = { app, startServer };
