const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operations.controller');
const { authenticateToken } = require('../middlewares/auth');

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

// Sales Orders & Order-to-Cash (Order -> Approval -> Invoice -> Payment)
router.get('/sales/orders', operationsController.getSalesOrders);
router.get('/sales/orders/:so_number', operationsController.getSalesOrderDetails);
router.post('/sales/orders', operationsController.createSalesOrder);
router.post('/sales/approve', authenticateToken, operationsController.approveSalesOrder);
router.post('/sales/orders/:so_number/approve', authenticateToken, operationsController.approveSalesOrder);
router.post('/sales/invoice', operationsController.invoiceSalesOrder);
router.post('/sales/orders/:so_number/invoice', operationsController.invoiceSalesOrder);
router.post('/sales/payment', operationsController.recordSalesPayment);
router.post('/sales/orders/:so_number/payment', operationsController.recordSalesPayment);

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
