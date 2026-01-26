import React from 'react';

/**
 * LoadingSpinner Component
 *
 * An animated loading spinner for loading states.
 *
 * Props:
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * - color: 'accent' | 'text' | 'white' (default: 'accent')
 * - fullScreen: boolean - Center in full screen (default: false)
 * - text: Optional loading text to display below spinner
 * - className: Additional CSS classes
 * - ...props: Any other div props
 */

const LoadingSpinner = ({
  size = 'md',
  color = 'accent',
  fullScreen = false,
  text,
  className = '',
  ...props
}) => {
  // Size styles
  const sizeStyles = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  // Color styles
  const colorStyles = {
    accent: 'text-accent',
    text: 'text-text',
    white: 'text-white',
  };

  // Text size
  const textSize = {
    xs: 'text-[11px]',
    sm: 'text-[12px]',
    md: 'text-[13px]',
    lg: 'text-[14px]',
    xl: 'text-[15px]',
  };

  const spinnerContent = (
    <div className={`flex flex-col items-center gap-3 ${className}`} {...props}>
      {/* Spinner */}
      <svg
        className={`animate-spin ${sizeStyles[size]} ${colorStyles[color]}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>

      {/* Loading Text */}
      {text && (
        <p className={`${textSize[size]} text-text-muted font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm z-50">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;
