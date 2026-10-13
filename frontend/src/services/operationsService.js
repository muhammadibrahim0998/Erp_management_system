import { apiClient } from './apiClient';

export const operationsService = {
  getChairmanDashboard() {
    return apiClient.get('/api/dashboard/chairman');
  },

  getApprovals() {
    return apiClient.get('/api/approvals');
  },

  actionApproval(id, action) {
    return apiClient.post(`/api/approvals/${id}/action`, { action });
  },

  getLiveOperations() {
    return apiClient.get('/api/live-operations');
  },

  getGatePasses() {
    return apiClient.get('/api/gate');
  },

  createGatePass(data) {
    return apiClient.post('/api/gate', data);
  },

  getProcurementPOs() {
    return apiClient.get('/api/procurement/pos');
  },

  createProcurementPO(data) {
    return apiClient.post('/api/procurement/pos', data);
  },

  getProductionBoard() {
    return apiClient.get('/api/production/board');
  },

  moveProduction(id, stage) {
    return apiClient.post('/api/production/move', { id, stage });
  },

  getSalesOrders() {
    return apiClient.get('/api/sales/orders');
  },

  approveSalesOrder(so_number) {
    return apiClient.post('/api/sales/approve', { so_number });
  },

  getMarketing() {
    return apiClient.get('/api/marketing');
  },

  getPayroll() {
    return apiClient.get('/api/payroll');
  },

  generatePayroll(month) {
    return apiClient.post('/api/payroll/generate', { month });
  },

  getFinanceOverview() {
    return apiClient.get('/api/finance/overview');
  },

  getPnlReport() {
    return apiClient.get('/api/reports/pnl');
  },

  getSettingsMatrix() {
    return apiClient.get('/api/settings/matrix');
  },

  /**
   * Fetches all core operational datasets in parallel for App bootstrap
   */
  async getBootstrapData() {
    const [
      users,
      chairman,
      approvals,
      gate,
      procurement,
      production,
      inventory,
      sales,
      marketing,
      payroll,
      finance
    ] = await Promise.all([
      apiClient.get('/api/users').catch(() => null),
      apiClient.get('/api/dashboard/chairman').catch(() => null),
      apiClient.get('/api/approvals').catch(() => null),
      apiClient.get('/api/gate').catch(() => null),
      apiClient.get('/api/procurement/pos').catch(() => null),
      apiClient.get('/api/production/board').catch(() => null),
      apiClient.get('/api/inventory').catch(() => null),
      apiClient.get('/api/sales/orders').catch(() => null),
      apiClient.get('/api/marketing').catch(() => null),
      apiClient.get('/api/payroll').catch(() => null),
      apiClient.get('/api/finance/overview').catch(() => null)
    ]);

    return {
      users,
      chairman,
      approvals,
      gate,
      procurement,
      production,
      inventory,
      sales,
      marketing,
      payroll,
      finance
    };
  }
};

export default operationsService;
