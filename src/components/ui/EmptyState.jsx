import React from 'react';

/**
 * EmptyState Component
 *
 * A placeholder component for empty states with icon, message, and optional action.
 *
 * Props:
 * - icon: React component or element (optional)
 * - title: Main message
 * - description: Secondary message (optional)
 * - action: React node for action button/link (optional)
 * - className: Additional CSS classes
 * - ...props: Any other div props
 */

const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        text-center
        py-12 px-6
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {/* Icon */}
      {icon && (
        <div className="mb-4 text-text-light opacity-40">
          {React.isValidElement(icon) ? (
            icon
          ) : (
            <div className="w-12 h-12 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      )}

      {/* Title */}
      <h3 className="text-[16px] font-semibold text-text mb-2 font-display">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[14px] text-text-muted max-w-sm mb-6">
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
