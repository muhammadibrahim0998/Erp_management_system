import { apiClient } from './apiClient';

export const userService = {
  getUsers() {
    return apiClient.get('/api/users');
  },

  createUser(userData) {
    return apiClient.post('/api/users', userData);
  },

  updateUser(id, userData) {
    return apiClient.put(`/api/users/${id}`, userData);
  },

  updateUserStatus(id, status) {
    return apiClient.patch(`/api/users/${id}/status`, { status });
  },

  resetUserPassword(id, newPassword) {
    return apiClient.post(`/api/users/${id}/reset-password`, { newPassword });
  }
};

export default userService;
