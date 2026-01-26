/**
 * Toast Context
 *
 * Provides toast notification functionality throughout the app
 */

import { createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ToastNotification';

const ToastContext = createContext(null);

/**
 * Toast Provider Component
 */
export const ToastProvider = ({ children }) => {
  const { toasts, success, error, warning, info, pr, removeToast } = useToast();

  return (
    <ToastContext.Provider value={{ success, error, warning, info, pr }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {children}
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};
