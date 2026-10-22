const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const posRoutes = require('./pos.routes');
const inventoryRoutes = require('./inventory.routes');
const auditRoutes = require('./audit.routes');
const operationsRoutes = require('./operations.routes');

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pos', posRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/', operationsRoutes);

module.exports = router;
