import React, { useEffect } from 'react';
import XIcon from '../../icons/XIcon';
import { useFocusTrap, useFocusReturn } from '../../hooks/useFocusTrap';

/**
 * Modal Component
 *
 * A modal/dialog wrapper with backdrop and close functionality.
 *
 * Props:
 * - isOpen: boolean - Controls modal visibility
 * - onClose: Function - Called when modal should close
 * - title: string - Modal title (optional)
 * - children: React node - Modal content
 * - size: 'sm' | 'md' | 'lg' | 'full' (default: 'md')
 * - showCloseButton: boolean - Show X button in header (default: true)
 * - closeOnBackdropClick: boolean - Close when clicking backdrop (default: true)
 * - closeOnEscape: boolean - Close when pressing Escape (default: true)
 * - className: Additional CSS classes for modal content
 * - ...props: Any other div props
 */

const Modal = ({
  isOpen = false,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  ariaLabel,
  ariaDescribedBy,
  ...props
}) => {
  // Focus management
  const focusTrapRef = useFocusTrap(isOpen);
  const storeFocus = useFocusReturn();

  // Store previous focus when modal opens
  useEffect(() => {
    if (isOpen) {
      storeFocus();
    }
  }, [isOpen, storeFocus]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && closeOnBackdropClick && onClose) {
      onClose();
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'max-w-full mx-4',
  };

  const modalStyles = `
    bg-surface
    rounded-2xl
    shadow-xl
    w-full
    ${sizeStyles[size]}
    max-h-[90vh]
    overflow-y-auto
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeInUp"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title || 'Dialog'}
      aria-describedby={ariaDescribedBy}
    >
      <div
        ref={focusTrapRef}
        className={modalStyles}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
            {title && (
              <h2 className="text-[18px] font-semibold text-text font-display">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="
                  w-8 h-8
                  flex items-center justify-center
                  text-text-muted
                  hover:text-text
                  hover:bg-bg-alt
                  rounded-lg
                  transition-colors duration-200
                  ml-auto
                "
                aria-label="Close modal"
              >
                <XIcon size={18} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
