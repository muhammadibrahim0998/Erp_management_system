const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller');
const { authenticateToken, requireRoles } = require('../middlewares/auth');

const POS_CHECKOUT_ROLES = [
  'Sales Officer',
  'Sales Manager',
  'Accounts Officer',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

router.post('/checkout', authenticateToken, requireRoles(POS_CHECKOUT_ROLES), posController.checkout);
router.get('/orders', authenticateToken, posController.getOrders);
router.get('/orders/:id', authenticateToken, posController.getOrderById);
router.get('/stats', authenticateToken, posController.getStats);

module.exports = router;
