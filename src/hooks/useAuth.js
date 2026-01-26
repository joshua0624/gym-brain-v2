/**
 * useAuth Hook
 *
 * Manages authentication state and provides auth methods
 */

import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const currentUser = authAPI.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authAPI.register(username, email, password);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login user
   */
  const login = useCallback(async (usernameOrEmail, password, rememberMe = false) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authAPI.login(usernameOrEmail, password, rememberMe);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    authAPI.logout();
    setUser(null);
  }, []);

  /**
   * Request password reset
   */
  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);

    try {
      await authAPI.forgotPassword(email);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset email';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reset password with token
   */
  const resetPassword = useCallback(async (token, newPassword) => {
    setLoading(true);
    setError(null);

    try {
      await authAPI.resetPassword(token, newPassword);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to reset password';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = useCallback(() => {
    return authAPI.isAuthenticated();
  }, []);

  return {
    user,
    loading,
    error,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    isAuthenticated,
  };
};

export default useAuth;
