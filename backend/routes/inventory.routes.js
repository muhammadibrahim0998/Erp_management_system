const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

router.get('/', inventoryController.getInventory);
router.post('/adjust', inventoryController.adjustStock);
router.post('/transfer', inventoryController.transferStock);
router.get('/ledger', inventoryController.getLedger);

module.exports = router;
