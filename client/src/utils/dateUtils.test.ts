import { describe, expect, it } from 'vitest';
import { toIsoDate } from './dateUtils.ts';

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 5))).toBe('2026-08-05');
  });
});
