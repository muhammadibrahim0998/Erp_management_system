const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const { authLimiter, passwordResetLimiter } = require('../middlewares/rateLimiter');

router.get('/me', authenticateToken, authController.getMe);
router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);
router.post('/change-password', authenticateToken, passwordResetLimiter, authController.changePassword);

module.exports = router;
