import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { ToastProvider, useToastContext } from './ToastContext';
import React from 'react';

// Wrapper component for hook testing
const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

describe('ToastContext', () => {
  it('throws when used outside provider', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToastContext());
    }).toThrow('useToastContext must be used within ToastProvider');

    spy.mockRestore();
  });

  it('provides success, error, warning, info, pr methods', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper });

    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.info).toBe('function');
    expect(typeof result.current.pr).toBe('function');
  });

  it('renders toast container', () => {
    const { container } = render(
      <ToastProvider>
        <div>App Content</div>
      </ToastProvider>
    );

    expect(screen.getByText('App Content')).toBeDefined();
  });

  it('success creates a toast notification', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper });

    act(() => {
      result.current.success('Workout saved!');
    });

    // The toast should be rendered in the DOM
    expect(screen.getByText('Workout saved!')).toBeDefined();
  });

  it('error creates an error toast', () => {
    const { result } = renderHook(() => useToastContext(), { wrapper });

    act(() => {
      result.current.error('Something went wrong');
    });

    expect(screen.getByText('Something went wrong')).toBeDefined();
  });
});
