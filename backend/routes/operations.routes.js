const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operations.controller');
const { authenticateToken, requireRoles } = require('../middlewares/auth');

// Established ERP Role Sets based on business responsibilities
const EXECUTIVE_ROLES = ['Chairman & CEO', 'General Manager', 'Director Finance', 'Director Operations', 'ERP Admin'];
const FINANCE_ROLES = ['Chairman & CEO', 'General Manager', 'Director Finance', 'Accounts Officer', 'ERP Admin'];
const PAYROLL_ROLES = ['Chairman & CEO', 'General Manager', 'Director Finance', 'HR Manager', 'Accounts Officer', 'ERP Admin'];
const PAYROLL_GENERATE_ROLES = ['HR Manager', 'Director Finance', 'Chairman & CEO', 'ERP Admin'];
const PROCUREMENT_ROLES = ['Procurement', 'Director Operations', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const PRODUCTION_ROLES = ['Production Manager', 'Breaking Supervisor', 'Plant Manager', 'Director Operations', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const GATE_ROLES = ['Gate Officer', 'Security', 'Plant Manager', 'Director Operations', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const SALES_CREATE_ROLES = ['Sales Officer', 'Sales Manager', 'Director Operations', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const INVOICE_ROLES = ['Accounts Officer', 'Director Finance', 'Sales Manager', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const PAYMENT_ROLES = ['Accounts Officer', 'Director Finance', 'General Manager', 'Chairman & CEO', 'ERP Admin'];
const WORKFLOW_ROLES = ['Chairman & CEO', 'General Manager', 'Director Operations', 'Director Finance', 'HR Manager', 'ERP Admin'];

// Executive Dashboard (confidential executive KPI view)
router.get('/dashboard/chairman', authenticateToken, requireRoles(EXECUTIVE_ROLES), operationsController.getChairmanDashboard);

// Workflow Approvals Inbox
router.get('/approvals', authenticateToken, operationsController.getApprovals);
router.post('/approvals/:id/action', authenticateToken, operationsController.actionApproval);

// Live Operations Control Room
router.get('/live-operations', authenticateToken, operationsController.getLiveOperations);

// Gate & Security
router.get('/gate', authenticateToken, operationsController.getGatePasses);
router.post('/gate', authenticateToken, requireRoles(GATE_ROLES), operationsController.createGatePass);

// Procurement & Purchase Orders
router.get('/procurement/pos', authenticateToken, operationsController.getProcurementPOs);
router.post('/procurement/pos', authenticateToken, requireRoles(PROCUREMENT_ROLES), operationsController.createProcurementPO);

// Production Board & Work Orders
router.get('/production/board', authenticateToken, operationsController.getProductionBoard);
router.post('/production/move', authenticateToken, requireRoles(PRODUCTION_ROLES), operationsController.moveProduction);

// Sales Orders & Order-to-Cash (Order -> Approval -> Invoice -> Payment)
router.get('/sales/orders', authenticateToken, operationsController.getSalesOrders);
router.get('/sales/orders/:so_number', authenticateToken, operationsController.getSalesOrderDetails);
router.post('/sales/orders', authenticateToken, requireRoles(SALES_CREATE_ROLES), operationsController.createSalesOrder);
router.post('/sales/approve', authenticateToken, operationsController.approveSalesOrder);
router.post('/sales/orders/:so_number/approve', authenticateToken, operationsController.approveSalesOrder);
router.post('/sales/invoice', authenticateToken, requireRoles(INVOICE_ROLES), operationsController.invoiceSalesOrder);
router.post('/sales/orders/:so_number/invoice', authenticateToken, requireRoles(INVOICE_ROLES), operationsController.invoiceSalesOrder);
router.post('/sales/payment', authenticateToken, requireRoles(PAYMENT_ROLES), operationsController.recordSalesPayment);
router.post('/sales/orders/:so_number/payment', authenticateToken, requireRoles(PAYMENT_ROLES), operationsController.recordSalesPayment);

// Marketing Campaigns
router.get('/marketing', authenticateToken, operationsController.getMarketing);

// Payroll Management
router.get('/payroll', authenticateToken, requireRoles(PAYROLL_ROLES), operationsController.getPayroll);
router.post('/payroll/generate', authenticateToken, requireRoles(PAYROLL_GENERATE_ROLES), operationsController.generatePayroll);

// Finance & Accounts Overview
router.get('/finance/overview', authenticateToken, requireRoles(FINANCE_ROLES), operationsController.getFinanceOverview);

// Reports: Profit & Loss Statement
router.get('/reports/pnl', authenticateToken, requireRoles(FINANCE_ROLES), operationsController.getPnlReport);

// Approval Matrix Settings
router.get('/settings/matrix', authenticateToken, operationsController.getSettingsMatrix);

module.exports = router;
