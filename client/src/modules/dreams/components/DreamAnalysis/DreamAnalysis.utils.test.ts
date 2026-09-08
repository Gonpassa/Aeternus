import { describe, expect, it } from 'vitest';
import { computeMissingAnchorIds } from './DreamAnalysis.utils.ts';

describe('computeMissingAnchorIds', () => {
  it('returns known ids that are no longer present', () => {
    expect(computeMissingAnchorIds([1, 2, 3], [1, 3])).toEqual([2]);
  });

  it('returns an empty array when all known ids are still present', () => {
    expect(computeMissingAnchorIds([1, 2], [1, 2, 5])).toEqual([]);
  });

  it('returns an empty array when there are no known ids', () => {
    expect(computeMissingAnchorIds([], [1, 2])).toEqual([]);
  });

  it('returns all known ids when none are present', () => {
    expect(computeMissingAnchorIds([1, 2], [])).toEqual([1, 2]);
  });
});
