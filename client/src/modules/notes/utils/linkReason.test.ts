import { describe, expect, it } from 'vitest';
import type { Link } from '@nee3/shared-types';
import { LINK_REASON_MAX, attributeReasons, linkReasonError } from './linkReason.ts';

const link = (overrides: Partial<Link> = {}): Link => ({
  id: 1,
  originNoteId: 1,
  targetNoteId: 2,
  reason: 'What the origin said.',
  targetReason: null,
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  ...overrides,
});

describe('linkReasonError', () => {
  it('accepts a line of the user’s own words', () => {
    expect(linkReasonError('Both are about effort being avoided.')).toBeNull();
  });

  it('refuses a blank line, since a reason that cannot be written is the signal the Link is not real', () => {
    expect(linkReasonError('')).toBe(
      'Every connection needs a line saying why the two belong together.',
    );
    expect(linkReasonError('   ')).toBe(
      'Every connection needs a line saying why the two belong together.',
    );
  });

  it('accepts a reason exactly at the ceiling and refuses one past it', () => {
    expect(linkReasonError('x'.repeat(LINK_REASON_MAX))).toBeNull();
    expect(linkReasonError('x'.repeat(LINK_REASON_MAX + 1))).toBe(
      `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
    );
  });

  it('measures the trimmed line, as the server does', () => {
    expect(linkReasonError(`  ${'x'.repeat(LINK_REASON_MAX)}  `)).toBeNull();
  });
});

describe('attributeReasons', () => {
  it('gives the origin end its own line and the target’s back', () => {
    expect(attributeReasons(link({ targetReason: 'What the target said.' }), 1)).toEqual({
      ownReason: 'What the origin said.',
      otherReason: 'What the target said.',
    });
  });

  it('reads the same Link the other way round from the target end', () => {
    expect(attributeReasons(link({ targetReason: 'What the target said.' }), 2)).toEqual({
      ownReason: 'What the target said.',
      otherReason: 'What the origin said.',
    });
  });

  // A null targetReason is a fact about the Link - nobody has linked back - rather than
  // missing data (ADR 0013).
  it('leaves the target end with nothing of its own until it has linked back', () => {
    expect(attributeReasons(link(), 2)).toEqual({
      ownReason: null,
      otherReason: 'What the origin said.',
    });
  });

  it('has neither for a pair that is not connected', () => {
    expect(attributeReasons(null, 1)).toEqual({ ownReason: null, otherReason: null });
  });
});
