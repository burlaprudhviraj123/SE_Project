import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/authSlice';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Request interceptor: keep multipart/form-data safe whenever a FormData body is sent.
api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      if (config.headers['Content-Type'] == null) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't log out if 401 is on login/auth verify routes
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/verify-otp')) {
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const registerStudent = (data) => api.post('/auth/register', data);
export const verifyOtp = (data) => api.post('/auth/verify-otp', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const acceptStaffInvite = (data) => api.post('/auth/accept-invite', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);

// User APIs
export const getCurrentProfile = () => api.get('/user/profile');
export const updateProfile = (data) => api.put('/user/profile', data);
export const changePassword = (data) => api.put('/user/change-password', data);

// Admin APIs
export const inviteStaff = (data) => api.post('/admin/staff/invite', data);
export const getAdminDepartments = () => api.get('/admin/departments');
export const getAdminUsers = (page = 0, size = 10) => api.get(`/admin/users?page=${page}&size=${size}`);
export const toggleUserActive = (id, isActive) => api.put(`/admin/users/${id}/toggle-active?isActive=${isActive}`);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Officer & Grievance APIs
export const getOfficerDashboardStats = () => api.get('/dashboard/officer');
export const getAssignedGrievances = (scope) => api.get('/grievances/assigned', { params: scope ? { scope } : {} });
export const acceptGrievance = (id) => api.put(`/grievances/${id}/accept`);
export const updateGrievanceStatus = (id, data) => api.put(`/grievances/${id}/status`, data);
export const getGrievanceDetails = (id) => api.get(`/grievances/${id}`);
export const getGrievanceHistory = (id) => api.get(`/grievances/${id}/history`);
export const getMyGrievances = () => api.get('/grievances/my');

export default api;
