import axios from 'axios';

// Create axios instance with base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// Dashboard services
export const dashboardService = {
  getStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/admin/analytics');
    return response.data;
  },
};

// KYC application services
export const kycService = {
  getApplications: async (params = {}) => {
    const response = await api.get('/admin/kyc/list', { params });
    return response.data;
  },

  getApplication: async (id) => {
    const response = await api.get(`/admin/kyc/${id}`);
    return response.data;
  },

  approveApplication: async (id, notes = '') => {
    const response = await api.post(`/admin/kyc/${id}/approve`, { notes });
    return response.data;
  },

  rejectApplication: async (id, reason, notes = '') => {
    const response = await api.post(`/admin/kyc/${id}/reject`, { reason, notes });
    return response.data;
  },

  updateRiskAssessment: async (id, riskData) => {
    const response = await api.put(`/admin/kyc/${id}/risk`, riskData);
    return response.data;
  },
};

// User management services
export const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  suspendUser: async (id, reason) => {
    const response = await api.post(`/admin/users/${id}/suspend`, { reason });
    return response.data;
  },

  activateUser: async (id) => {
    const response = await api.post(`/admin/users/${id}/activate`);
    return response.data;
  },
};

// Utility function to handle API errors
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.message || 'Server error occurred';
    return {
      message,
      status: error.response.status,
      data: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error. Please check your connection.',
      status: null,
      data: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: null,
      data: null,
    };
  }
};

export default api;