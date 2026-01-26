/**
 * Toast Notification Component
 *
 * Shows success, error, warning, and info messages
 */

import { useEffect } from 'react';
import { TOAST_DURATION } from '../lib/constants';
import { CheckIcon, XIcon, TrophyIcon } from '../icons';

// Info icon (i in circle)
const InfoIcon = ({ size = 20, color = 'currentColor', strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

// Warning icon (triangle with !)
const WarningIcon = ({ size = 20, color = 'currentColor', strokeWidth = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ToastNotification = ({ type = 'info', message, onClose, duration }) => {
  const autoDuration = duration || TOAST_DURATION[type] || 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, autoDuration);

    return () => clearTimeout(timer);
  }, [autoDuration, onClose]);

  const styles = {
    success: 'bg-success-bg border-success-border text-success',
    error: 'bg-error/10 border-error text-error',
    warning: 'bg-warning/10 border-warning text-warning',
    info: 'bg-accent-light border-accent text-accent',
    pr: 'bg-warning/10 border-warning text-warning',
  };

  const renderIcon = (iconType) => {
    const iconProps = { size: 20, strokeWidth: 2 };

    switch (iconType) {
      case 'success':
        return <CheckIcon {...iconProps} />;
      case 'error':
        return <XIcon {...iconProps} />;
      case 'warning':
        return <WarningIcon {...iconProps} />;
      case 'info':
        return <InfoIcon {...iconProps} />;
      case 'pr':
        return <TrophyIcon {...iconProps} />;
      default:
        return <InfoIcon {...iconProps} />;
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md rounded-xl border-2 p-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${styles[type]}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {renderIcon(type)}
        </div>
        <div className="flex-1">
          <p className="font-medium leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-bg-alt rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <XIcon size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

/**
 * Toast Container - manages multiple toasts
 */
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastNotification;
