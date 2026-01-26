import React from 'react';
import Button from './Button';
import SearchIcon from '../../icons/SearchIcon';

/**
 * Error State Component
 *
 * Displays error messages with optional retry functionality
 * Includes shake animation for validation errors
 *
 * Props:
 * - title: string - Error title (default: "Something went wrong")
 * - message: string - Error description
 * - onRetry: Function - Retry action handler (shows retry button if provided)
 * - retryText: string - Retry button text (default: "Try Again")
 * - variant: 'default' | 'validation' | 'network' (default: 'default')
 * - className: Additional CSS classes
 */

const ErrorState = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryText = 'Try Again',
  variant = 'default',
  className = '',
  children,
}) => {
  const variantStyles = {
    default: 'bg-surface border border-error/20',
    validation: 'bg-error/5 border border-error/30 animate-shake',
    network: 'bg-surface border border-warning/20',
  };

  return (
    <div
      className={`
        rounded-2xl p-6
        ${variantStyles[variant]}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="text-center max-w-md mx-auto">
        {/* Error Icon */}
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-error/10 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h3 className="text-[18px] font-semibold text-text font-display mb-2">
          {title}
        </h3>

        {/* Error Message */}
        {message && (
          <p className="text-[14px] text-text-muted mb-4">
            {message}
          </p>
        )}

        {/* Custom Content */}
        {children && (
          <div className="mb-4">
            {children}
          </div>
        )}

        {/* Retry Button */}
        {onRetry && (
          <Button
            variant="primary"
            size="md"
            onClick={onRetry}
          >
            {retryText}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * Inline Error Message
 * For form validation errors
 */
export const InlineError = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <p
      className={`text-[13px] text-error mt-1 animate-shake ${className}`}
      role="alert"
    >
      {message}
    </p>
  );
};

/**
 * Network Error State
 * Specific error for network/connectivity issues
 */
export const NetworkError = ({ onRetry }) => (
  <ErrorState
    variant="network"
    title="Connection Issue"
    message="Unable to connect. Please check your internet connection and try again."
    onRetry={onRetry}
    retryText="Retry Connection"
  >
    <div className="flex items-center justify-center gap-2 text-text-muted mb-4">
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
      <span className="text-[12px]">Offline</span>
    </div>
  </NetworkError>
);

/**
 * Not Found Error State
 * For 404 errors or missing data
 */
export const NotFoundError = ({ title = 'Not Found', message, onGoBack }) => (
  <ErrorState
    title={title}
    message={message || "The item you're looking for doesn't exist or has been removed."}
    onRetry={onGoBack}
    retryText="Go Back"
  >
    <div className="flex items-center justify-center mb-4">
      <div className="w-16 h-16 rounded-full bg-text-light/10 flex items-center justify-center">
        <SearchIcon size={32} className="text-text-muted" />
      </div>
    </div>
  </ErrorState>
);

export default ErrorState;
