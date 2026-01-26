/**
 * API Client for GymBrAIn
 *
 * CLIENT-SIDE ONLY - Never import backend code here
 * Handles JWT token management, HTTP requests, and error handling
 */

import axios from 'axios';

// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get stored access token from localStorage
 */
const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

/**
 * Get stored refresh token from localStorage
 */
const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Store tokens in localStorage
 */
const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

/**
 * Clear tokens from localStorage
 */
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

/**
 * Create axios instance with default config
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - attach JWT token to requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - handle token refresh on 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Request new access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        setTokens(accessToken, refreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Register new user
   */
  register: async (username, email, password) => {
    const response = await apiClient.post('/auth/register', {
      username,
      email,
      password,
    });
    const { accessToken, refreshToken, user } = response.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  /**
   * Login user
   */
  login: async (usernameOrEmail, password, rememberMe = false) => {
    const response = await apiClient.post('/auth/login', {
      usernameOrEmail,
      password,
      rememberMe,
    });
    const { accessToken, refreshToken, user } = response.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },

  /**
   * Logout user
   */
  logout: () => {
    clearTokens();
    window.location.href = '/login';
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  /**
   * Get current user from localStorage
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!getAccessToken();
  },
};

/**
 * Exercise API
 */
export const exerciseAPI = {
  /**
   * Get all exercises
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/exercises', { params });
    return response.data;
  },

  /**
   * Create custom exercise
   */
  create: async (exerciseData) => {
    const response = await apiClient.post('/exercises', exerciseData);
    return response.data;
  },

  /**
   * Archive custom exercise
   */
  archive: async (exerciseId) => {
    const response = await apiClient.put(`/exercises/${exerciseId}/archive`);
    return response.data;
  },
};

/**
 * Workout API
 */
export const workoutAPI = {
  /**
   * Get all workouts
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/workouts', { params });
    return response.data;
  },

  /**
   * Get single workout by ID
   */
  getById: async (workoutId) => {
    const response = await apiClient.get(`/workouts/${workoutId}`);
    return response.data;
  },

  /**
   * Create new workout
   */
  create: async (workoutData) => {
    const response = await apiClient.post('/workouts', workoutData);
    return response.data;
  },

  /**
   * Update workout
   */
  update: async (workoutId, workoutData) => {
    const response = await apiClient.put(`/workouts/${workoutId}`, workoutData);
    return response.data;
  },

  /**
   * Delete workout
   */
  delete: async (workoutId) => {
    const response = await apiClient.delete(`/workouts/${workoutId}`);
    return response.data;
  },

  /**
   * Get current draft
   */
  getDraft: async () => {
    const response = await apiClient.get('/workouts/draft');
    return response.data;
  },

  /**
   * Save draft
   */
  saveDraft: async (draftData) => {
    const response = await apiClient.post('/workouts/draft', draftData);
    return response.data;
  },

  /**
   * Delete draft
   */
  deleteDraft: async () => {
    const response = await apiClient.delete('/workouts/draft');
    return response.data;
  },

  /**
   * Sync offline workouts
   */
  sync: async (syncData) => {
    const response = await apiClient.post('/workouts/sync', syncData);
    return response.data;
  },
};

/**
 * Template API
 */
export const templateAPI = {
  /**
   * Get all templates
   */
  getAll: async () => {
    const response = await apiClient.get('/templates');
    return response.data;
  },

  /**
   * Get template by ID with exercises
   */
  getById: async (templateId) => {
    const response = await apiClient.get(`/templates/${templateId}`);
    return response.data;
  },

  /**
   * Get template exercises
   */
  getExercises: async (templateId) => {
    const response = await apiClient.get(`/templates/${templateId}/exercises`);
    return response.data;
  },

  /**
   * Create template
   */
  create: async (templateData) => {
    const response = await apiClient.post('/templates', templateData);
    return response.data;
  },

  /**
   * Update template
   */
  update: async (templateId, templateData) => {
    const response = await apiClient.put(`/templates/${templateId}`, templateData);
    return response.data;
  },

  /**
   * Delete template
   */
  delete: async (templateId) => {
    const response = await apiClient.delete(`/templates/${templateId}`);
    return response.data;
  },
};

/**
 * Progress API
 */
export const progressAPI = {
  /**
   * Get exercise progression data
   */
  getExerciseProgress: async (exerciseId) => {
    const response = await apiClient.get(`/progress/${exerciseId}`);
    return response.data;
  },

  /**
   * Get personal records
   */
  getPRs: async (exerciseId = null) => {
    const params = exerciseId ? { exerciseId } : {};
    const response = await apiClient.get('/prs', { params });
    return response.data;
  },

  /**
   * Get weekly stats
   */
  getWeeklyStats: async (week = null) => {
    const params = week ? { week } : {};
    const response = await apiClient.get('/stats/weekly', { params });
    return response.data;
  },
};

/**
 * AI Assistant API
 */
export const aiAPI = {
  /**
   * Send message to AI workout assistant
   */
  chat: async (message, context) => {
    const response = await apiClient.post('/ai/workout-assistant', {
      message,
      context,
    });
    return response.data;
  },
};

/**
 * User API
 */
export const userAPI = {
  /**
   * Export all user data
   */
  exportData: async () => {
    const response = await apiClient.get('/user/export');
    return response.data;
  },
};

/**
 * Export configured axios instance for custom requests
 */
export default apiClient;
