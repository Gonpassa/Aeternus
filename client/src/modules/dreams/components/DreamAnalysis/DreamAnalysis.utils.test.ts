import { describe, expect, it } from 'vitest';
import {
  anchorsInDocumentOrder,
  parseNarrativeAnchors,
  truncateExcerpt,
} from './DreamAnalysis.utils.ts';

describe('parseNarrativeAnchors', () => {
  it('maps each anchor id to the text its mark spans carry', () => {
    const html =
      '<p>I was <span data-anchor-id="7">flying over</span> a city ' +
      '<span data-anchor-id="9">made of glass</span>.</p>';

    expect(parseNarrativeAnchors(html).excerpts).toEqual({ 7: 'flying over', 9: 'made of glass' });
  });

  it('concatenates multiple spans carrying the same anchor id', () => {
    // A mark split across inline boundaries (e.g. by bold text) renders as sibling spans.
    const html =
      '<p><span data-anchor-id="7">falling </span><strong>' +
      '<span data-anchor-id="7">endlessly</span></strong></p>';

    expect(parseNarrativeAnchors(html).excerpts).toEqual({ 7: 'falling endlessly' });
  });

  it('ignores spans whose anchor id is not an integer', () => {
    expect(parseNarrativeAnchors('<p><span data-anchor-id="oops">text</span></p>')).toEqual({
      excerpts: {},
      documentOrder: [],
    });
  });

  it('returns an empty parse for narrative without anchors', () => {
    expect(parseNarrativeAnchors('<p>No anchors here.</p>')).toEqual({
      excerpts: {},
      documentOrder: [],
    });
  });

  it('reports anchor ids in the order their marks appear in the narrative', () => {
    const html =
      '<p><span data-anchor-id="9">the ending</span></p>' +
      '<p><span data-anchor-id="7">the opening</span></p>';

    expect(parseNarrativeAnchors(html).documentOrder).toEqual([9, 7]);
  });

  it('lists an anchor split across several spans once, at its first appearance', () => {
    const html =
      '<p><span data-anchor-id="7">falling </span>' +
      '<span data-anchor-id="9">past</span>' +
      '<span data-anchor-id="7"> endlessly</span></p>';

    expect(parseNarrativeAnchors(html).documentOrder).toEqual([7, 9]);
  });
});

describe('anchorsInDocumentOrder', () => {
  it('sorts anchors by where their passage appears, not by the order they arrive in', () => {
    // The API returns anchors in creation order; anchoring the closing paragraph first
    // would otherwise put its margin note above the opening paragraph's.
    const anchors = [{ id: 9 }, { id: 7 }];

    expect(anchorsInDocumentOrder(anchors, [7, 9])).toEqual([{ id: 7 }, { id: 9 }]);
  });

  it('keeps anchors with no mark in the narrative last, in the order given', () => {
    const anchors = [{ id: 4 }, { id: 9 }, { id: 5 }, { id: 7 }];

    expect(anchorsInDocumentOrder(anchors, [7, 9])).toEqual([
      { id: 7 },
      { id: 9 },
      { id: 4 },
      { id: 5 },
    ]);
  });

  it('leaves the input array untouched', () => {
    const anchors = [{ id: 9 }, { id: 7 }];
    anchorsInDocumentOrder(anchors, [7, 9]);

    expect(anchors).toEqual([{ id: 9 }, { id: 7 }]);
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
