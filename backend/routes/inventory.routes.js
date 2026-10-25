const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticateToken, requireRoles } = require('../middlewares/auth');

const INVENTORY_MUTATION_ROLES = [
  'Raw Material Store',
  'Finish Store & Delivery',
  'Plant Manager',
  'Production Manager',
  'Director Operations',
  'General Manager',
  'Chairman & CEO',
  'ERP Admin'
];

router.get('/', authenticateToken, inventoryController.getInventory);
router.post('/adjust', authenticateToken, requireRoles(INVENTORY_MUTATION_ROLES), inventoryController.adjustStock);
router.post('/transfer', authenticateToken, requireRoles(INVENTORY_MUTATION_ROLES), inventoryController.transferStock);
router.get('/ledger', authenticateToken, inventoryController.getLedger);

module.exports = router;
