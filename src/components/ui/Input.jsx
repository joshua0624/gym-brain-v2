import React from 'react';

/**
 * Input Component
 *
 * A text input field with focus states, error handling, and labels.
 *
 * Props:
 * - label: Optional label text
 * - error: Error message to display
 * - helperText: Helper text below input
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - fullWidth: boolean (default: false)
 * - textAlign: 'left' | 'center' | 'right' (default: 'left')
 * - disabled: boolean (default: false)
 * - className: Additional CSS classes for input
 * - containerClassName: Additional CSS classes for container
 * - type: input type (default: 'text')
 * - placeholder: placeholder text
 * - value: input value
 * - onChange: change handler
 * - ...props: Any other input props
 */

const Input = React.forwardRef(({
  label,
  error,
  helperText,
  size = 'md',
  fullWidth = false,
  textAlign = 'left',
  disabled = false,
  className = '',
  containerClassName = '',
  type = 'text',
  placeholder = '—',
  value,
  onChange,
  ...props
}, ref) => {
  // Base input styles
  const baseStyles = `
    bg-bg
    border
    rounded-lg
    text-text
    placeholder:text-text-light
    focus:outline-none
    focus:ring-2
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-200
  `;

  // Error/default border styles
  const borderStyles = error
    ? 'border-error focus:border-error focus:ring-error/20'
    : 'border-border focus:border-accent focus:ring-accent/20';

  // Size styles
  const sizeStyles = {
    sm: 'h-7 px-2 text-[12px]',
    md: 'h-8 px-2 text-[13px]',
    lg: 'h-10 px-3 text-[14px]',
  };

  // Text alignment
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  const combinedInputStyles = `
    ${baseStyles}
    ${borderStyles}
    ${sizeStyles[size]}
    ${alignStyles[textAlign]}
    ${widthStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`.trim()}>
      {/* Label */}
      {label && (
        <label className="block text-[13px] font-medium text-text mb-1.5">
          {label}
        </label>
      )}

      {/* Input */}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={combinedInputStyles}
        {...props}
      />

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-[12px] text-error">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-[12px] text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
