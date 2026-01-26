import React from 'react';

/**
 * Container Component
 *
 * Provides consistent max-width and padding across different screen sizes.
 * Centers content and handles responsive spacing.
 *
 * Props:
 * - size: 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'lg')
 * - padding: boolean - Add horizontal padding (default: true)
 * - className: Additional CSS classes
 * - children: React node
 * - ...props: Any other div props
 */

const Container = ({
  size = 'lg',
  padding = true,
  className = '',
  children,
  ...props
}) => {
  // Max-width based on size
  const sizeStyles = {
    sm: 'max-w-2xl',      // 672px
    md: 'max-w-3xl',      // 768px
    lg: 'max-w-5xl',      // 1024px
    xl: 'max-w-7xl',      // 1280px
    full: 'max-w-full',
  };

  // Responsive padding
  const paddingStyles = padding
    ? 'px-4 md:px-6 lg:px-8'
    : '';

  const containerStyles = `
    w-full
    mx-auto
    ${sizeStyles[size]}
    ${paddingStyles}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={containerStyles} {...props}>
      {children}
    </div>
  );
};

/**
 * Section Component
 *
 * Provides consistent vertical spacing between page sections.
 * Combines Container with vertical padding.
 */
export const Section = ({
  size = 'lg',
  spacing = 'normal',
  className = '',
  children,
  ...props
}) => {
  const spacingStyles = {
    tight: 'py-4 md:py-6',
    normal: 'py-6 md:py-8 lg:py-10',
    loose: 'py-8 md:py-12 lg:py-16',
  };

  return (
    <section className={`${spacingStyles[spacing]} ${className}`} {...props}>
      <Container size={size}>
        {children}
      </Container>
    </section>
  );
};

/**
 * PageWrapper Component
 *
 * Full-page wrapper with consistent background and safe areas.
 * Handles bottom navigation spacing on mobile.
 */
export const PageWrapper = ({
  hasBottomNav = true,
  className = '',
  children,
  ...props
}) => {
  const bottomPadding = hasBottomNav ? 'pb-24 md:pb-6' : 'pb-6';

  return (
    <div
      className={`
        min-h-screen
        bg-bg
        pt-6
        ${bottomPadding}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
