import React from 'react';
import SearchIcon from '../../icons/SearchIcon';

/**
 * SearchInput Component
 *
 * A search input field with an icon prefix.
 *
 * Props:
 * - placeholder: Placeholder text (default: 'Search...')
 * - value: Input value
 * - onChange: Change handler
 * - onClear: Optional clear handler (shows clear button when provided and value exists)
 * - disabled: boolean (default: false)
 * - fullWidth: boolean (default: true)
 * - className: Additional CSS classes for container
 * - ...props: Any other input props
 */

const SearchInput = ({
  placeholder = 'Search...',
  value,
  onChange,
  onClear,
  disabled = false,
  fullWidth = true,
  className = '',
  ...props
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
  };

  const containerStyles = `
    flex items-center gap-2.5
    bg-surface
    border border-border
    rounded-xl
    px-3.5 py-2.5
    focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20
    transition-all duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={containerStyles}>
      {/* Search Icon */}
      <SearchIcon className="w-4.5 h-4.5 text-text-muted shrink-0" />

      {/* Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="
          flex-1
          bg-transparent
          text-[14px] text-text
          placeholder:text-text-muted
          outline-none
          disabled:cursor-not-allowed
        "
        {...props}
      />

      {/* Clear Button */}
      {onClear && value && (
        <button
          type="button"
          onClick={handleClear}
          className="
            w-5 h-5
            flex items-center justify-center
            text-text-muted
            hover:text-text
            transition-colors duration-200
            shrink-0
          "
          aria-label="Clear search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchInput;
