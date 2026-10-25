const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { passwordResetLimiter } = require('../middlewares/rateLimiter');

// Authenticated staff user list (passwords stripped)
router.get('/', authenticateToken, userController.getUsers);

// Admin-only management routes
router.post('/', authenticateToken, requireAdmin, userController.createUser);
router.put('/:id', authenticateToken, requireAdmin, userController.updateUser);
router.patch('/:id/status', authenticateToken, requireAdmin, userController.updateStatus);
router.post('/:id/reset-password', authenticateToken, requireAdmin, passwordResetLimiter, userController.resetPassword);
router.delete('/:id', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;
