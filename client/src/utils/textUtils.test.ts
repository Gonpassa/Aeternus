import { describe, expect, it } from 'vitest';
import { excerpt } from './textUtils.ts';

describe('excerpt', () => {
  it('returns input shorter than the limit unchanged, without an ellipsis', () => {
    expect(excerpt('<p>A short dream.</p>', 160)).toBe('A short dream.');
  });

  it('returns input exactly at the limit unchanged, without an ellipsis', () => {
    const text = `${'a'.repeat(156)} end`;
    expect(excerpt(`<p>${text}</p>`, 160)).toBe(text);
  });

  it('cuts at a word boundary instead of mid-word, and appends an ellipsis', () => {
    const result = excerpt('<p>The lighthouse keeper was counting moths</p>', 20);
    expect(result).toBe('The lighthouse…');
  });

  it('keeps a word whose last character lands exactly on the limit', () => {
    expect(excerpt('<p>abcde fghij klmno</p>', 11)).toBe('abcde fghij…');
  });

  it('hard-cuts a single unbroken word longer than the limit', () => {
    expect(excerpt('<p>abcdefghijklmnop</p>', 10)).toBe('abcdefghij…');
  });

  it('strips HTML tags before measuring', () => {
    expect(excerpt('<p>It was a <strong>calm</strong> dream.</p>', 160)).toBe(
      'It was a calm dream.',
    );
  });

  it('collapses runs of whitespace across tag boundaries', () => {
    expect(excerpt('<p>First   line</p>\n<p>Second\tline</p>', 160)).toBe('First line Second line');
  });
});
