import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { EntryFormValues } from '../components/EntryForm/EntryForm.utils.ts';
import { useRecoveryBuffer } from './useRecoveryBuffer.ts';

const values: EntryFormValues = {
  date: '2026-09-05',
  title: 'Unsaved title',
  primaryMood: 'calm',
  specificEmotion: null,
  content: '<p>Unsaved content</p>',
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRecoveryBuffer', () => {
  it('returns null when nothing has been written for the key', () => {
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    expect(result.current.read()).toBeNull();
  });

  it('round-trips values written under a key', () => {
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    result.current.write(values);

    expect(result.current.read()).toEqual(values);
  });

  it('overwrites a previously written value under the same key', () => {
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    result.current.write(values);
    result.current.write({ ...values, title: 'Second draft' });

    expect(result.current.read()).toEqual({ ...values, title: 'Second draft' });
  });

  it('keeps separate keys from colliding', () => {
    const { result: newBuffer } = renderHook(() => useRecoveryBuffer('new'));
    const { result: editBuffer } = renderHook(() => useRecoveryBuffer('entry:42'));

    newBuffer.current.write(values);

    expect(editBuffer.current.read()).toBeNull();
    expect(newBuffer.current.read()).toEqual(values);
  });

  it('clear removes the stored value so a later read returns null', () => {
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    result.current.write(values);
    result.current.clear();

    expect(result.current.read()).toBeNull();
  });

  it('is a no-op when the key is null - no write, no throw, read returns null', () => {
    const { result } = renderHook(() => useRecoveryBuffer(null));

    expect(() => result.current.write(values)).not.toThrow();
    expect(result.current.read()).toBeNull();
  });

  it('treats a buffer older than the expiry window as absent, and clears it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { result } = renderHook(() => useRecoveryBuffer('new'));
    result.current.write(values);

    vi.setSystemTime(new Date('2026-01-03T00:00:00.000Z')); // +48h

    expect(result.current.read()).toBeNull();
    // Expiry drops it entirely - a raw peek at storage confirms it isn't just filtered on read.
    expect(window.localStorage.length).toBe(0);
  });

  it('treats a buffer within the expiry window as present', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const { result } = renderHook(() => useRecoveryBuffer('new'));
    result.current.write(values);

    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z')); // +12h

    expect(result.current.read()).toEqual(values);
  });

  it('returns null rather than throwing when the stored value is not valid JSON', () => {
    window.localStorage.setItem('journal:entryForm:recoveryBuffer:new', 'not json');
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    expect(result.current.read()).toBeNull();
  });

  it('returns null when the stored values do not match the expected shape (e.g. a schema left over from an older release)', () => {
    window.localStorage.setItem(
      'journal:entryForm:recoveryBuffer:new',
      JSON.stringify({ values: { title: 'Missing other fields' }, savedAt: Date.now() }),
    );
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    expect(result.current.read()).toBeNull();
  });

  it('accepts a draft with an unset primary mood - shape validity is not submission validity', () => {
    const { result } = renderHook(() => useRecoveryBuffer('new'));

    result.current.write({ ...values, primaryMood: null, specificEmotion: null });

    expect(result.current.read()).toEqual({ ...values, primaryMood: null, specificEmotion: null });
  });

  it('picks up a key change - reading after the key prop changes reads the new key', () => {
    const { result, rerender } = renderHook(({ key }) => useRecoveryBuffer(key), {
      initialProps: { key: 'entry:1' },
    });
    result.current.write(values);

    rerender({ key: 'entry:2' });

    expect(result.current.read()).toBeNull();
  });
});
