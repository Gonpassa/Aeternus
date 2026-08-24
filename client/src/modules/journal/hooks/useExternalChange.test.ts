import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExternalChange } from './useExternalChange.ts';

describe('useExternalChange', () => {
  it('does not fire on the initial render', () => {
    const onExternalChange = vi.fn();
    renderHook(({ value }) => useExternalChange(value, onExternalChange), {
      initialProps: { value: 'a' },
    });

    expect(onExternalChange).not.toHaveBeenCalled();
  });

  it('fires when the value changes to something the hook was not told about', () => {
    const onExternalChange = vi.fn();
    const { rerender } = renderHook(({ value }) => useExternalChange(value, onExternalChange), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });

    expect(onExternalChange).toHaveBeenCalledWith('b');
  });

  it('does not fire when the new value is an echo of one passed to notify', () => {
    const onExternalChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useExternalChange(value, onExternalChange),
      { initialProps: { value: 'a' } },
    );

    result.current.notify('b');
    rerender({ value: 'b' });

    expect(onExternalChange).not.toHaveBeenCalled();
  });

  it('does not fire while a related async lookup is in flight, even if the value changed', () => {
    const onExternalChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, skip }) => useExternalChange(value, onExternalChange, { skip }),
      { initialProps: { value: 'a', skip: true } },
    );

    rerender({ value: 'b', skip: true });

    expect(onExternalChange).not.toHaveBeenCalled();
  });

  it('fires once the skip condition clears, if the value differs from what was last known', () => {
    const onExternalChange = vi.fn();
    const { rerender } = renderHook(
      ({ value, skip }) => useExternalChange(value, onExternalChange, { skip }),
      { initialProps: { value: 'a', skip: true } },
    );

    rerender({ value: 'b', skip: true });
    rerender({ value: 'b', skip: false });

    expect(onExternalChange).toHaveBeenCalledWith('b');
  });

  it('supports a custom equality function', () => {
    const onExternalChange = vi.fn();
    const isEqual = (a: { id: number }, b: { id: number }) => a.id === b.id;
    const { rerender } = renderHook(
      ({ value }) => useExternalChange(value, onExternalChange, { isEqual }),
      { initialProps: { value: { id: 1 } } },
    );

    rerender({ value: { id: 1 } });
    expect(onExternalChange).not.toHaveBeenCalled();

    rerender({ value: { id: 2 } });
    expect(onExternalChange).toHaveBeenCalledWith({ id: 2 });
  });
});
