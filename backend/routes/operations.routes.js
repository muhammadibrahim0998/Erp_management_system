const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operations.controller');

// Executive Dashboard
router.get('/dashboard/chairman', operationsController.getChairmanDashboard);

// Workflow Approvals Inbox
router.get('/approvals', operationsController.getApprovals);
router.post('/approvals/:id/action', operationsController.actionApproval);

// Live Operations Control Room
router.get('/live-operations', operationsController.getLiveOperations);

// Gate & Security
router.get('/gate', operationsController.getGatePasses);
router.post('/gate', operationsController.createGatePass);

// Procurement & Purchase Orders
router.get('/procurement/pos', operationsController.getProcurementPOs);
router.post('/procurement/pos', operationsController.createProcurementPO);

// Production Board & Work Orders
router.get('/production/board', operationsController.getProductionBoard);
router.post('/production/move', operationsController.moveProduction);

// Sales Orders & CEO Credit Approvals
router.get('/sales/orders', operationsController.getSalesOrders);
router.post('/sales/approve', operationsController.approveSalesOrder);

// Marketing Campaigns
router.get('/marketing', operationsController.getMarketing);

// Payroll Management
router.get('/payroll', operationsController.getPayroll);
router.post('/payroll/generate', operationsController.generatePayroll);

// Finance & Accounts Overview
router.get('/finance/overview', operationsController.getFinanceOverview);

// Reports: Profit & Loss Statement
router.get('/reports/pnl', operationsController.getPnlReport);

// Approval Matrix Settings
router.get('/settings/matrix', operationsController.getSettingsMatrix);

module.exports = router;
