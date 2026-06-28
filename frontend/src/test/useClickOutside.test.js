import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useClickOutside from '../hooks/useClickOutside';

describe('useClickOutside', () => {
  it('calls callback when clicking outside', () => {
    const callback = vi.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);

    renderHook(() => useClickOutside(ref, callback));

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(callback).toHaveBeenCalledTimes(1);

    document.body.removeChild(ref.current);
    document.body.removeChild(outside);
  });

  it('does not call callback when clicking inside', () => {
    const callback = vi.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);

    renderHook(() => useClickOutside(ref, callback));

    ref.current.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(callback).not.toHaveBeenCalled();

    document.body.removeChild(ref.current);
  });
});
