const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, auditController.getAuditLogs);
router.get('/export', authenticateToken, auditController.exportAuditLogs);
router.post('/client-event', authenticateToken, auditController.logClientEvent);

module.exports = router;
