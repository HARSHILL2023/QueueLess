import api from './api';

/**
 * Platform administration endpoints.
 *
 * Every call reuses the shared axios instance so the existing bearer-token and
 * 401-refresh interceptors apply. The backend independently enforces
 * role === 'admin' on all of these routes.
 */
export const adminAPI = {
  getOverview: (days = 30) => api.get('/admin/overview', { params: { days } }),

  getHospitals: (params) => api.get('/admin/hospitals', { params }),
  getHospital: (id) => api.get(`/admin/hospitals/${id}`),
  createHospital: (data) => api.post('/admin/hospitals', data),
  updateHospital: (id, data) => api.patch(`/hospitals/${id}`, data),
  approveHospital: (id) => api.patch(`/admin/hospitals/${id}/approve`),
  rejectHospital: (id, reason) => api.patch(`/admin/hospitals/${id}/reject`, { reason }),
  setHospitalStatus: (id, status, reason = '') =>
    api.patch(`/admin/hospitals/${id}/status`, { status, reason }),

  getPatients: (params) => api.get('/admin/patients', { params }),
  getPatient: (id) => api.get(`/admin/patients/${id}`),

  getStaff: (params) => api.get('/admin/staff', { params }),
  getStaffMember: (id) => api.get(`/admin/staff/${id}`),

  setUserStatus: (id, status, reason = '') =>
    api.patch(`/admin/users/${id}/status`, { status, reason }),

  getActivity: (params) => api.get('/admin/activity', { params }),
};

export default adminAPI;
