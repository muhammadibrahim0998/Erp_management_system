import { apiClient } from './apiClient';

export const inventoryService = {
  getInventory() {
    return apiClient.get('/api/inventory');
  },

  adjustStock(adjustmentData) {
    return apiClient.post('/api/inventory/adjust', adjustmentData);
  },

  transferStock(transferData) {
    return apiClient.post('/api/inventory/transfer', transferData);
  },

  getLedger() {
    return apiClient.get('/api/inventory/ledger');
  }
};

export default inventoryService;
