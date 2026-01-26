import React from 'react';

/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 *
 * Variants:
 * - primary: Main action button (accent background)
 * - secondary: Secondary action (outlined)
 * - ghost: Minimal button (transparent, hover background)
 * - icon: Icon-only button (square, centered)
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'icon' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - fullWidth: boolean (default: false)
 * - disabled: boolean (default: false)
 * - loading: boolean (default: false)
 * - children: React node
 * - className: Additional CSS classes
 * - onClick: Click handler
 * - type: 'button' | 'submit' | 'reset' (default: 'button')
 * - ...props: Any other button props
 */

const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  children,
  className = '',
  onClick,
  type = 'button',
  ariaLabel,
  ...props
}) => {
  // Base styles that apply to all buttons
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold
    transition-all duration-200
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
    focus:outline-none focus:ring-2 focus:ring-accent/30
  `;

  // Variant styles
  const variantStyles = {
    primary: `
      bg-accent text-white
      hover:bg-accent-hover
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-surface text-text
      border border-border
      hover:bg-surface-hover hover:border-accent
    `,
    ghost: `
      bg-transparent text-accent
      hover:bg-accent-light
    `,
    icon: `
      bg-surface text-text-muted
      border border-border
      hover:bg-surface-hover hover:text-text
    `,
  };

  // Size styles
  const sizeStyles = {
    sm: variant === 'icon' ? 'w-8 h-8' : 'px-3 py-2 text-[13px] rounded-lg',
    md: variant === 'icon' ? 'w-10 h-10' : 'px-4 py-3 text-[15px] rounded-xl',
    lg: variant === 'icon' ? 'w-12 h-12' : 'px-5 py-3.5 text-[16px] rounded-xl',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Icon buttons are always square
  const iconStyles = variant === 'icon' ? 'rounded-xl' : '';

  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${widthStyles}
    ${iconStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      className={combinedStyles}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel || (variant === 'icon' && typeof children === 'object' ? 'Button' : undefined)}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
