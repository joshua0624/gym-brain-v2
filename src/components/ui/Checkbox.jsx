import React from 'react';
import CheckIcon from '../../icons/CheckIcon';

/**
 * Checkbox Component
 *
 * A custom checkbox component with set number display (for workout tracking).
 * When unchecked, shows the set number. When checked, shows a checkmark.
 *
 * Props:
 * - checked: boolean (default: false)
 * - onChange: Function called when checkbox state changes
 * - setNumber: Set number to display when unchecked (optional)
 * - disabled: boolean (default: false)
 * - size: 'sm' | 'md' (default: 'md')
 * - className: Additional CSS classes
 * - ...props: Any other input props
 */

const Checkbox = ({
  checked = false,
  onChange,
  setNumber,
  disabled = false,
  size = 'md',
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange && !disabled) {
      onChange(e.target.checked);
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7',
  };

  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const iconSize = size === 'sm' ? 12 : 14;

  // Unchecked state styles
  const uncheckedStyles = `
    bg-bg-alt
    border-1.5 border-border
    text-text-muted
  `;

  // Checked state styles
  const checkedStyles = `
    bg-success
    border-success
  `;

  const containerStyles = `
    ${sizeStyles[size]}
    rounded-lg
    flex items-center justify-center
    ${textSize}
    font-semibold
    transition-all duration-200
    cursor-pointer
    hover:opacity-90
    ${checked ? checkedStyles : uncheckedStyles}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <label className="inline-block">
      {/* Hidden native checkbox for accessibility */}
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />

      {/* Custom checkbox display */}
      <div className={containerStyles}>
        {checked ? (
          <CheckIcon
            size={iconSize}
            className="text-white"
            strokeWidth={2.5}
          />
        ) : (
          setNumber && <span>{setNumber}</span>
        )}
      </div>
    </label>
  );
};

export default Checkbox;
