import { describe, expect, it } from 'vitest';
import { anchorExcerpts, truncateExcerpt } from './DreamAnalysis.utils.ts';

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
