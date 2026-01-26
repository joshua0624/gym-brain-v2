import React from 'react';

/**
 * SegmentedControl Component
 *
 * A tab switcher component for selecting between multiple options.
 *
 * Props:
 * - options: Array of option objects with { value, label } structure
 * - value: Currently selected value
 * - onChange: Function called when selection changes (receives value)
 * - fullWidth: boolean (default: true)
 * - size: 'sm' | 'md' (default: 'md')
 * - className: Additional CSS classes
 * - ...props: Any other div props
 *
 * Example usage:
 * <SegmentedControl
 *   options={[
 *     { value: 'date', label: 'By Date' },
 *     { value: 'exercise', label: 'By Exercise' },
 *   ]}
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 * />
 */

const SegmentedControl = ({
  options = [],
  value,
  onChange,
  fullWidth = true,
  size = 'md',
  className = '',
  ...props
}) => {
  const handleClick = (optionValue) => {
    if (onChange) {
      onChange(optionValue);
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'p-0.5 text-[12px]',
    md: 'p-1 text-[13px]',
  };

  const buttonSizeStyles = {
    sm: 'py-1.5',
    md: 'py-2.5',
  };

  const containerStyles = `
    flex
    bg-bg-alt
    rounded-xl
    gap-0
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : 'inline-flex'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={containerStyles} {...props}>
      {options.map((option) => {
        const isActive = option.value === value;

        const buttonStyles = `
          flex-1
          ${buttonSizeStyles[size]}
          rounded-lg
          font-medium
          transition-all duration-200
          ${isActive
            ? 'bg-surface text-text font-semibold shadow-sm'
            : 'bg-transparent text-text-muted hover:text-text'
          }
        `.trim().replace(/\s+/g, ' ');

        return (
          <button
            key={option.value}
            type="button"
            className={buttonStyles}
            onClick={() => handleClick(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
