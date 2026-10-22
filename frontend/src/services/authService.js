import { apiClient } from './apiClient';

export const authService = {
  async login(email, password) {
    const data = await apiClient.post('/api/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('yaf_token', data.token);
      localStorage.setItem('yaf_user', JSON.stringify(data.user));
    }
    return data;
  },

  async signup(userData) {
    const data = await apiClient.post('/api/auth/signup', userData);
    if (data.token) {
      localStorage.setItem('yaf_token', data.token);
      localStorage.setItem('yaf_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getMe() {
    return apiClient.get('/api/auth/me');
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post('/api/auth/change-password', { currentPassword, newPassword });
  },

  logout() {
    localStorage.removeItem('yaf_token');
    localStorage.removeItem('yaf_user');
  },

  getCurrentUser() {
    try {
      const saved = localStorage.getItem('yaf_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('yaf_token'));
  }
};

export default authService;
