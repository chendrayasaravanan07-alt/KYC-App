import axios from 'axios';
import Constants from 'expo-constants';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl ||
                   process.env.EXPO_PUBLIC_API_URL ||
                   'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      removeToken();
      // Navigate to login - this will be handled by context
    }
    return Promise.reject(error);
  }
);

// Token management
const getToken = () => {
  try {
    // For now, use AsyncStorage would be imported
    return localStorage.getItem('authToken'); // Fallback for web
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const removeToken = () => {
  try {
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

const setToken = (token) => {
  try {
    localStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

// API Services
export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success) {
        const { token, user } = response.data.data;
        setToken(token);
        return { success: true, user, token };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed'
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed'
      };
    }
  },

  logout: async () => {
    try {
      removeToken();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Logout failed' };
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      if (response.data.success) {
        const { token } = response.data.data;
        setToken(token);
        return { success: true, token };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Token refresh failed'
      };
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        return { success: true, user: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Profile fetch failed'
      };
    }
  },
};

// KYC Services
export const kycService = {
  submitApplication: async (kycData) => {
    try {
      const response = await api.post('/kyc/submit', kycData);
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'KYC submission failed'
      };
    }
  },

  uploadDocument: async (formData, onProgress) => {
    try {
      const response = await api.post('/kyc/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress,
      });
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Document upload failed'
      };
    }
  },

  getStatus: async () => {
    try {
      const response = await api.get('/kyc/status');
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Status fetch failed'
      };
    }
  },

  getApplicationDetails: async (kycId) => {
    try {
      const response = await api.get(`/kyc/${kycId}`);
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Application fetch failed'
      };
    }
  },

  uploadPhoto: async (formData, type = 'selfie') => {
    try {
      const response = await api.post(`/kyc/upload-photo?type=${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Photo upload failed'
      };
    }
  },
};

// Liveness Detection Services
export const livenessService = {
  startLiveness: async () => {
    try {
      const response = await api.post('/kyc/liveness/start');
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Liveness start failed'
      };
    }
  },

  submitLiveness: async (challengeData) => {
    try {
      const response = await api.post('/kyc/liveness/submit', challengeData);
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Liveness submission failed'
      };
    }
  },
};

// File Upload Utilities
export const fileUploadService = {
  uploadFile: async (uri, type, onProgress) => {
    try {
      const formData = new FormData();

      // Determine file type from URI
      const fileType = uri.split('.').pop().toLowerCase();
      const mimeType = getMimeType(fileType);

      formData.append('file', {
        uri,
        type: mimeType,
        name: `file.${fileType}`,
      });

      formData.append('type', type);

      const response = await api.post('/kyc/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(progress);
          }
        },
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'File upload failed'
      };
    }
  },

  validateImage: async (uri) => {
    try {
      // Basic image validation on client side
      const response = await fetch(uri);
      const blob = await response.blob();

      // Check file size (max 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        return {
          success: false,
          error: 'File size too large. Maximum size is 10MB.'
        };
      }

      // Check file type
      if (!blob.type.startsWith('image/')) {
        return {
          success: false,
          error: 'Invalid file type. Please upload an image.'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Image validation failed'
      };
    }
  },
};

// Helper function to get MIME type
const getMimeType = (extension) => {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

// Push Notification Services
export const notificationService = {
  registerForPushNotifications: async () => {
    try {
      // This would use Expo's push notifications
      // For now, return success
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Push notification registration failed'
      };
    }
  },

  sendPushToken: async (token) => {
    try {
      const response = await api.post('/notifications/register', { token });
      if (response.data.success) {
        return { success: true };
      }
      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Push token registration failed'
      };
    }
  },
};

// Utility functions
export const apiUtils = {
  handleApiError: (error) => {
    if (error.response) {
      return {
        message: error.response.data?.message || 'Server error',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        status: null,
        data: null,
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        status: null,
        data: null,
      };
    }
  },

  isAuthenticated: () => {
    return !!getToken();
  },

  getAuthToken: () => {
    return getToken();
  },
};

export default api;