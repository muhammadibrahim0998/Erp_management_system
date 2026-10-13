const express = require('express');
const router = express.Router();
const posController = require('../controllers/pos.controller');

router.post('/checkout', posController.checkout);
router.get('/orders', posController.getOrders);
router.get('/orders/:id', posController.getOrderById);
router.get('/stats', posController.getStats);

module.exports = router;
