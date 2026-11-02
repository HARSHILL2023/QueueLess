import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
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
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          
          localStorage.setItem('accessToken', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// Staff API
export const staffAPI = {
  getProfile: () => api.get('/staff/profile'),
  updateProfile: (data) => api.patch('/staff/profile', data),
  getDashboardStats: () => api.get('/staff/dashboard/stats'),
};

// Queue API (Staff)
export const queueAPI = {
  getDepartmentQueue: (hospitalId, departmentId, params) => 
    api.get(`/queue/department/${hospitalId}/${departmentId}`, { params }),
  callNext: (hospitalId, departmentId) => api.post('/queue/call-next', { hospitalId, departmentId }),
  markServing: (tokenId) => api.patch(`/queue/token/${tokenId}/serving`),
  markCompleted: (tokenId) => api.patch(`/queue/token/${tokenId}/completed`),
  markNoShow: (tokenId) => api.patch(`/queue/token/${tokenId}/no-show`),
  getTokenDetails: (tokenId) => api.get(`/queue/token/${tokenId}`),
  getQueueStatus: (hospitalId) => api.get(`/queue/status/${hospitalId}`),
};

// Patient API (Staff view)
export const patientAPI = {
  getPatients: (params) => api.get('/staff/patients', { params }),
  getPatient: (id) => api.get(`/staff/patients/${id}`),
  updatePatient: (id, data) => api.patch(`/staff/patients/${id}`, data),
};

// Department API
export const departmentAPI = {
  getDepartments: (hospitalId) => api.get(`/hospitals/${hospitalId}/departments`),
  createDepartment: (hospitalId, data) => api.post(`/hospitals/${hospitalId}/departments`, data),
  updateDepartment: (hospitalId, departmentId, data) => api.patch(`/hospitals/${hospitalId}/departments/${departmentId}`, data),
  deleteDepartment: (hospitalId, departmentId) => api.delete(`/hospitals/${hospitalId}/departments/${departmentId}`),
  getDoctors: (hospitalId, departmentId) => api.get(`/hospitals/${hospitalId}/departments/${departmentId}/doctors`),
  addDoctor: (hospitalId, departmentId, data) => api.post(`/hospitals/${hospitalId}/departments/${departmentId}/doctors`, data),
  updateDoctor: (hospitalId, departmentId, doctorId, data) => api.patch(`/hospitals/${hospitalId}/departments/${departmentId}/doctors/${doctorId}`, data),
  removeDoctor: (hospitalId, departmentId, doctorId) => api.delete(`/hospitals/${hospitalId}/departments/${departmentId}/doctors/${doctorId}`),
};

// Staff Management API
export const staffManagementAPI = {
  getStaff: (hospitalId) => api.get(`/staff/hospital/${hospitalId}`),
  inviteStaff: (hospitalId, data) => api.post(`/staff/hospital/${hospitalId}/invite`, data),
  revokeInvitation: (hospitalId, invitationId) => api.delete(`/staff/hospital/${hospitalId}/invite/${invitationId}`),
  updateStaffRole: (hospitalId, staffId, data) => api.patch(`/staff/hospital/${hospitalId}/${staffId}`, data),
  removeStaff: (hospitalId, staffId) => api.delete(`/staff/hospital/${hospitalId}/${staffId}`),
};

// Hospital API
export const hospitalAPI = {
  getHospital: (id) => api.get(`/hospitals/${id}`),
  updateHospital: (id, data) => api.patch(`/hospitals/${id}`, data),
  getSettings: (id) => api.get(`/hospitals/${id}/settings`),
  updateSettings: (id, data) => api.patch(`/hospitals/${id}/settings`, data),
};