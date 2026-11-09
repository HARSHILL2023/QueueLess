import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          
          await SecureStore.setItemAsync('accessToken', token);
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        // Redirect to login would be handled by auth state
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.patch('/users/change-password', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Queue API
export const queueAPI = {
  getToken: (hospitalId, departmentId, notes) => api.post('/queue/token', { hospitalId, departmentId, notes }),
  getActiveToken: () => api.get('/queue/token/active'),
  getTokenStatus: (tokenId) => api.get(`/queue/token/${tokenId}`),
  cancelToken: (tokenId, reason) => api.delete(`/queue/token/${tokenId}`, { data: { reason } }),
  getQueueStatus: (hospitalId) => api.get(`/queue/status/${hospitalId}`),
  getHistory: () => api.get('/queue/history'),
  // Staff endpoints
  callNext: (hospitalId, departmentId) => api.post('/queue/call-next', { hospitalId, departmentId }),
  markServing: (tokenId) => api.patch(`/queue/token/${tokenId}/serving`),
  markCompleted: (tokenId, notes) => api.patch(`/queue/token/${tokenId}/completed`, { notes }),
  markNoShow: (tokenId) => api.patch(`/queue/token/${tokenId}/no-show`),
  getDepartmentQueue: (hospitalId, departmentId) => api.get(`/queue/department/${hospitalId}/${departmentId}`),
};

// Hospital API
export const hospitalAPI = {
  getHospitals: (params) => api.get('/hospitals', { params }),
  getHospital: (id) => api.get(`/hospitals/${id}`),
  getDepartments: (hospitalId) => api.get(`/hospitals/${hospitalId}/departments`),
  getDoctors: (hospitalId, departmentId) => api.get(`/hospitals/${hospitalId}/departments/${departmentId}/doctors`),
};

// Department API alias
export const departmentAPI = {
  getDepartments: (hospitalId) => api.get(`/hospitals/${hospitalId}/departments`),
  getDoctors: (hospitalId, departmentId) => api.get(`/hospitals/${hospitalId}/departments/${departmentId}/doctors`),
};

// Staff API (invitation-based)
export const staffAPI = {
  acceptInvitation: (token, data) => api.post(`/staff/invitations/${token}/accept`, data),
  getInvitation: (token) => api.get(`/staff/invitations/${token}`),
  getStaffProfile: () => api.get('/staff/profile'),
  updateStaffProfile: (data) => api.patch('/staff/profile', data),
};

// Admin API (for platform admins)
export const adminAPI = {
  getPendingHospitals: () => api.get('/admin/hospitals/pending'),
  approveHospital: (id) => api.patch(`/admin/hospitals/${id}/approve`),
  rejectHospital: (id, reason) => api.patch(`/admin/hospitals/${id}/reject`, { reason }),
  getAllHospitals: () => api.get('/admin/hospitals'),
  getAnalytics: () => api.get('/admin/analytics'),
};