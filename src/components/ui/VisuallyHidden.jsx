import React from 'react';

/**
 * Visually Hidden Component
 *
 * Hides content visually but keeps it accessible to screen readers.
 * Use for:
 * - Skip links
 * - Icon button labels
 * - Form labels that are visually represented by placeholders
 * - Additional context for screen readers
 *
 * Props:
 * - children: React node - Content to hide visually
 * - as: string - HTML element to render (default: 'span')
 * - ...props: Any other props for the element
 */

const VisuallyHidden = ({ children, as: Component = 'span', ...props }) => {
  return (
    <Component
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default VisuallyHidden;
