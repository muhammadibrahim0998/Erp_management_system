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
    const failed = [];
    const fetchItem = async (name, endpoint) => {
      try {
        return await apiClient.get(endpoint);
      } catch (err) {
        if (err?.status !== 401) {
          failed.push(name);
        }
        return null;
      }
    };

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
      fetchItem('users', '/api/users'),
      fetchItem('chairman dashboard', '/api/dashboard/chairman'),
      fetchItem('approvals', '/api/approvals'),
      fetchItem('gate', '/api/gate'),
      fetchItem('procurement', '/api/procurement/pos'),
      fetchItem('production', '/api/production/board'),
      fetchItem('inventory', '/api/inventory'),
      fetchItem('sales', '/api/sales/orders'),
      fetchItem('marketing', '/api/marketing'),
      fetchItem('payroll', '/api/payroll'),
      fetchItem('finance', '/api/finance/overview')
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
      finance,
      failed
    };
  }
};

export default operationsService;
