import React from 'react';

/**
 * ProgressBar Component
 *
 * An animated progress bar with optional label and value display.
 *
 * Props:
 * - progress: Progress percentage (0-100)
 * - label: Optional label to display before the bar
 * - showValue: Show value text after the bar (default: false)
 * - valueText: Custom value text (overrides default percentage)
 * - variant: 'default' | 'success' (default: 'default')
 * - size: 'sm' | 'md' (default: 'md')
 * - className: Additional CSS classes for container
 * - ...props: Any other div props
 */

const ProgressBar = ({
  progress = 0,
  label,
  showValue = false,
  valueText,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine bar color based on variant
  const barColor = variant === 'success' ? 'bg-success' : 'bg-accent';

  // Size styles
  const sizeStyles = {
    sm: 'h-1',
    md: 'h-1.5',
  };

  // Label size
  const labelSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <div className={`flex items-center gap-2.5 ${className}`} {...props}>
      {/* Label */}
      {label && (
        <span className={`${labelSize} text-text-muted w-16 shrink-0`}>
          {label}
        </span>
      )}

      {/* Progress Bar Container */}
      <div className={`flex-1 ${sizeStyles[size]} bg-bg-alt rounded-full overflow-hidden`}>
        {/* Progress Bar Fill */}
        <div
          className={`${sizeStyles[size]} ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Value Text */}
      {showValue && (
        <span className={`${labelSize} text-text-light w-10 text-right shrink-0`}>
          {valueText || `${Math.round(clampedProgress)}%`}
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
