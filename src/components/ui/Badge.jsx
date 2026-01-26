import React from 'react';

/**
 * Badge Component
 *
 * A small label component for status indicators and tags.
 *
 * Variants:
 * - default: Standard badge with accent colors
 * - success: Green badge for completed/success states
 * - warning: Gold badge for warnings
 * - error: Red badge for errors
 * - neutral: Gray badge for neutral information
 * - muscle: Muscle tag styling (for exercise library)
 *
 * Props:
 * - variant: 'default' | 'success' | 'warning' | 'error' | 'neutral' | 'muscle' (default: 'default')
 * - size: 'sm' | 'md' (default: 'md')
 * - children: Badge content
 * - className: Additional CSS classes
 * - ...props: Any other span props
 */

const Badge = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = `
    inline-block
    font-semibold
    whitespace-nowrap
  `;

  // Variant styles
  const variantStyles = {
    default: `
      bg-accent-light
      text-accent
    `,
    success: `
      bg-success-bg
      text-success
    `,
    warning: `
      bg-warning/10
      text-warning
    `,
    error: `
      bg-error/10
      text-error
    `,
    neutral: `
      bg-bg-alt
      text-text-muted
    `,
    muscle: `
      bg-bg-alt
      text-text
      font-normal
    `,
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] rounded-md',
    md: 'px-2.5 py-1 text-[11px] rounded-md',
  };

  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span
      className={combinedStyles}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
