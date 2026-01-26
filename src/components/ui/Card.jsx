import React from 'react';

/**
 * Card Component
 *
 * A flexible card container with multiple variants.
 *
 * Variants:
 * - standard: Default card styling
 * - elevated: Interactive card with hover effects
 * - active: Selected/active state (accent border)
 * - success: Completed state (success border)
 * - accent: Highlighted card with accent background
 *
 * Props:
 * - variant: 'standard' | 'elevated' | 'active' | 'success' | 'accent' (default: 'standard')
 * - padding: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 * - onClick: Optional click handler (makes card interactive)
 * - children: React node
 * - className: Additional CSS classes
 * - ...props: Any other div props
 */

const Card = ({
  variant = 'standard',
  padding = 'md',
  onClick,
  children,
  className = '',
  ...props
}) => {
  // Base styles
  const baseStyles = `
    bg-surface
    rounded-2xl
    shadow-sm
  `;

  // Variant styles
  const variantStyles = {
    standard: `
      border border-border-light
    `,
    elevated: `
      border border-border-light
      hover:border-border hover:shadow-md
      transition-all duration-300
      cursor-pointer
    `,
    active: `
      border-2 border-accent
      shadow-md
    `,
    success: `
      border border-success-border
      bg-success-bg
    `,
    accent: `
      bg-accent-light
      border border-accent/40
    `,
  };

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5 md:p-6',
  };

  const combinedStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      className={combinedStyles}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
