/**
 * API Client for GymBrAIn
 *
 * CLIENT-SIDE ONLY - Never import backend code here
 * Handles JWT token management, HTTP requests, and error handling
 */

import axios from 'axios';
import { workoutDB } from './indexedDB';
import { queueOperation, removeQueueItem, generateUUID } from './syncManager';

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
   * Get all workouts (offline-first)
   */
  getAll: async (params = {}) => {
    try {
      // Try network first
      const response = await apiClient.get('/workouts', { params });

      // Cache in IndexedDB for offline access
      if (response.data.workouts) {
        for (const workout of response.data.workouts) {
          await workoutDB.save({
            ...workout,
            sync_status: 'synced',
          });
        }
      }

      return response.data;
    } catch (error) {
      // Offline fallback - read from IndexedDB
      if (!navigator.onLine || error.code === 'ERR_NETWORK') {
        const localWorkouts = await workoutDB.getAll();
        return { workouts: localWorkouts || [] };
      }
      throw error;
    }
  },

  /**
   * Get single workout by ID (offline-first)
   */
  getById: async (workoutId) => {
    try {
      // Try network first
      const response = await apiClient.get(`/workouts/${workoutId}`);

      // Cache in IndexedDB
      await workoutDB.save({
        ...response.data.workout,
        sync_status: 'synced',
      });

      return response.data;
    } catch (error) {
      // Offline fallback - read from IndexedDB
      if (!navigator.onLine || error.code === 'ERR_NETWORK') {
        const localWorkout = await workoutDB.get(workoutId);
        if (localWorkout) {
          return { workout: localWorkout };
        }
      }
      throw error;
    }
  },

  /**
   * Create new workout (with optimistic update)
   */
  create: async (workoutData) => {
    console.log('[API] Creating workout:', workoutData.id || 'new');

    // 1. Generate UUID if not provided
    const workoutId = workoutData.id || generateUUID();
    const optimisticWorkout = {
      ...workoutData,
      id: workoutId,
      sync_status: 'local',
      updated_at: new Date().toISOString(),
    };

    // 2. Optimistic update to IndexedDB
    await workoutDB.save(optimisticWorkout);
    console.log('[API] Saved to IndexedDB with sync_status: local');

    // 3. Queue for sync (get queue item ID)
    const queueItemId = await queueOperation('CREATE_WORKOUT', {
      ...workoutData,
      id: workoutId,
    });

    // 4. Attempt immediate sync if online
    if (navigator.onLine) {
      try {
        console.log('[API] Attempting immediate sync...');
        const payload = {
          ...workoutData,
          id: workoutId,
        };

        console.log('[API] Sending payload:', {
          id: payload.id,
          name: payload.name,
          exerciseCount: payload.exercises?.length || 0,
          firstExercise: payload.exercises?.[0] ? {
            exercise_id: payload.exercises[0].exercise_id,
            setCount: payload.exercises[0].sets?.length || 0,
            firstSet: payload.exercises[0].sets?.[0]
          } : null
        });

        const response = await apiClient.post('/workouts', payload);

        console.log('[API] Immediate sync successful!');
        console.log('[API] Server response:', response.data);

        // Extract workout from response (server returns { workout: {...} })
        const serverWorkout = response.data.workout || response.data;

        // Success: Reconcile IndexedDB
        await workoutDB.save({
          ...serverWorkout,
          sync_status: 'synced',
        });

        // CRITICAL: Remove from queue since sync succeeded
        await removeQueueItem(queueItemId);
        console.log('[API] Removed from sync queue');

        return serverWorkout;
      } catch (error) {
        // Failure: Queue will retry
        console.warn('[API] Immediate sync failed, queued for later:', error.message);
        return optimisticWorkout;
      }
    }

    // 5. Offline: Return optimistic version
    console.log('[API] Offline - returning optimistic workout');
    return optimisticWorkout;
  },

  /**
   * Update workout (with optimistic update)
   */
  update: async (workoutId, workoutData) => {
    const optimisticWorkout = {
      ...workoutData,
      id: workoutId,
      sync_status: 'local',
      updated_at: new Date().toISOString(),
    };

    // 1. Optimistic update to IndexedDB
    await workoutDB.save(optimisticWorkout);

    // 2. Queue for sync (get queue item ID)
    const queueItemId = await queueOperation('UPDATE_WORKOUT', {
      ...workoutData,
      id: workoutId,
    });

    // 3. Attempt immediate sync if online
    if (navigator.onLine) {
      try {
        const response = await apiClient.put(`/workouts/${workoutId}`, workoutData);

        // Extract workout from response
        const serverWorkout = response.data.workout || response.data;

        // Success: Reconcile IndexedDB
        await workoutDB.save({
          ...serverWorkout,
          sync_status: 'synced',
        });

        // Remove from queue since sync succeeded
        await removeQueueItem(queueItemId);

        return serverWorkout;
      } catch (error) {
        // Failure: Queue will retry
        console.warn('[API] Immediate update sync failed, queued for later:', error.message);
        return optimisticWorkout;
      }
    }

    // 4. Offline: Return optimistic version
    return optimisticWorkout;
  },

  /**
   * Delete workout (with optimistic update)
   */
  delete: async (workoutId) => {
    // 1. Optimistic delete from IndexedDB
    await workoutDB.delete(workoutId);

    // 2. Queue for sync (get queue item ID)
    const queueItemId = await queueOperation('DELETE_WORKOUT', {
      id: workoutId,
    });

    // 3. Attempt immediate sync if online
    if (navigator.onLine) {
      try {
        const response = await apiClient.delete(`/workouts/${workoutId}`);

        // Remove from queue since sync succeeded
        await removeQueueItem(queueItemId);

        return response.data;
      } catch (error) {
        // Failure: Queue will retry
        console.warn('[API] Immediate delete sync failed, queued for later:', error.message);
        return { success: true };
      }
    }

    // 4. Offline: Return success
    return { success: true };
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
   * Sync offline workouts (with optimistic update)
   */
  sync: async (syncData) => {
    const { completedWorkouts, deleteDraftIds } = syncData;

    // Process each workout with optimistic updates
    for (const workout of completedWorkouts) {
      const workoutId = workout.id || generateUUID();
      const optimisticWorkout = {
        ...workout,
        id: workoutId,
        sync_status: 'local',
        updated_at: new Date().toISOString(),
      };

      // Save to IndexedDB
      await workoutDB.save(optimisticWorkout);
      console.log('[API] Saved workout to IndexedDB:', workoutId);
    }

    // Queue for sync
    const queueItemId = await queueOperation('SYNC_WORKOUTS', syncData);

    // Attempt immediate sync if online
    if (navigator.onLine) {
      try {
        console.log('[API] Attempting immediate sync to /workouts/sync...');
        const response = await apiClient.post('/workouts/sync', syncData);

        console.log('[API] Sync successful!', response.data);

        // Update each workout as synced
        for (const workout of completedWorkouts) {
          const syncedWorkout = response.data.syncedWorkouts?.find(
            sw => sw.clientId === workout.id
          );

          if (syncedWorkout) {
            // Get full workout data from server
            const fullWorkout = await apiClient.get(`/workouts/${syncedWorkout.serverId}`);

            await workoutDB.save({
              ...fullWorkout.data.workout,
              sync_status: 'synced',
            });
          }
        }

        // Remove from queue
        await removeQueueItem(queueItemId);
        console.log('[API] Removed from sync queue');

        return response.data;
      } catch (error) {
        console.warn('[API] Immediate sync failed, queued for later:', error.message);
        return { success: false, error: error.message };
      }
    }

    // Offline: Return optimistic response
    console.log('[API] Offline - workouts queued for sync');
    return { success: true, queued: true };
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
    const response = await apiClient.get(`/stats/progress/${exerciseId}`);
    return response.data;
  },

  /**
   * Get personal records
   */
  getPRs: async (exerciseId = null) => {
    const params = exerciseId ? { exerciseId } : {};
    const response = await apiClient.get('/stats/prs', { params });
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
