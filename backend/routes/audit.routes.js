const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticateToken, requireRoles } = require('../middlewares/auth');

// Role allowlist for inspecting and exporting enterprise audit logs
const AUDIT_READ_ROLES = [
  'Chairman & CEO',
  'General Manager',
  'Director Finance',
  'Director Operations',
  'ERP Admin'
];

router.get('/', authenticateToken, requireRoles(AUDIT_READ_ROLES), auditController.getAuditLogs);
router.get('/export', authenticateToken, requireRoles(AUDIT_READ_ROLES), auditController.exportAuditLogs);
router.post('/client-event', authenticateToken, auditController.logClientEvent);

module.exports = router;
