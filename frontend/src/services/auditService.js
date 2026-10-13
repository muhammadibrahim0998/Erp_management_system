import { apiClient } from './apiClient';

export const auditService = {
  getAuditLogs(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.append(key, val);
      }
    });
    const queryString = queryParams.toString();
    return apiClient.get(`/api/audit-logs${queryString ? `?${queryString}` : ''}`);
  },

  exportAuditLogs(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.append(key, val);
      }
    });
    const queryString = queryParams.toString();
    return apiClient.get(`/api/audit-logs/export${queryString ? `?${queryString}` : ''}`);
  },

  logClientEvent(eventData) {
    return apiClient.post('/api/audit-logs/client-event', eventData).catch(err => {
      console.warn('Silent client-event logging error:', err.message);
    });
  }
};

export default auditService;
