import { apiClient } from './apiClient';

export const posService = {
  getInventory() {
    return apiClient.get('/api/inventory');
  },

  getStats() {
    return apiClient.get('/api/pos/stats');
  },

  getOrders() {
    return apiClient.get('/api/pos/orders');
  },

  getOrderById(id) {
    return apiClient.get(`/api/pos/orders/${id}`);
  },

  checkout(orderData) {
    return apiClient.post('/api/pos/checkout', orderData);
  }
};

export default posService;
