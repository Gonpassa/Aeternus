import { describe, expect, it } from 'vitest';
import { anchorExcerpts, computeMissingAnchorIds, truncateExcerpt } from './DreamAnalysis.utils.ts';

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

describe('anchorExcerpts', () => {
  it('maps each anchor id to the text its mark spans carry', () => {
    const html =
      '<p>I was <span data-anchor-id="7">flying over</span> a city ' +
      '<span data-anchor-id="9">made of glass</span>.</p>';

    expect(anchorExcerpts(html)).toEqual({ 7: 'flying over', 9: 'made of glass' });
  });

  it('concatenates multiple spans carrying the same anchor id', () => {
    // A mark split across inline boundaries (e.g. by bold text) renders as sibling spans.
    const html =
      '<p><span data-anchor-id="7">falling </span><strong>' +
      '<span data-anchor-id="7">endlessly</span></strong></p>';

    expect(anchorExcerpts(html)).toEqual({ 7: 'falling endlessly' });
  });

  it('ignores spans whose anchor id is not an integer', () => {
    expect(anchorExcerpts('<p><span data-anchor-id="oops">text</span></p>')).toEqual({});
  });

  it('returns an empty map for narrative without anchors', () => {
    expect(anchorExcerpts('<p>No anchors here.</p>')).toEqual({});
  });
});

describe('truncateExcerpt', () => {
  it('returns short excerpts unchanged', () => {
    expect(truncateExcerpt('a short excerpt')).toBe('a short excerpt');
  });

  it('clips long excerpts at the budget with an ellipsis', () => {
    expect(truncateExcerpt('abcdefghij', 4)).toBe('abcd…');
  });

  it('trims trailing whitespace left by the clip', () => {
    expect(truncateExcerpt('abc defghij', 4)).toBe('abc…');
  });
});
