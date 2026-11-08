import { describe, expect, it } from 'vitest';
import { cardLocator, formatLocator, formatPosition } from './FiledNote.utils.ts';

describe('formatPosition', () => {
  it('shows a digits-only position as a page', () => {
    expect(formatPosition('42')).toBe('p. 42');
  });

  it('leaves any other notation exactly as the user wrote it', () => {
    expect(formatPosition('12:30')).toBe('12:30');
    expect(formatPosition('loc. 418')).toBe('loc. 418');
    expect(formatPosition('p. 42')).toBe('p. 42');
  });
});

describe('formatLocator', () => {
  it('renders both halves as one string', () => {
    expect(formatLocator({ section: 'Ch. 3', position: '42' })).toBe('Ch. 3 · p. 42');
    expect(formatLocator({ section: 'Intro', position: '12:30' })).toBe('Intro · 12:30');
  });

  it('renders either half alone, since either one is a complete Locator', () => {
    expect(formatLocator({ section: 'Ch. 3', position: null })).toBe('Ch. 3');
    expect(formatLocator({ section: null, position: '42' })).toBe('p. 42');
  });
});

describe('cardLocator', () => {
  it('keeps the section on the tab and the position in the catalog number', () => {
    expect(cardLocator({ section: 'Ch. 3', position: '42' })).toEqual({
      tab: 'Ch. 3',
      catalogNumber: 'p. 42',
    });
  });

  it('moves the position up to the tab when there is no section to put there', () => {
    expect(cardLocator({ section: null, position: '42' })).toEqual({
      tab: 'p. 42',
      catalogNumber: '',
    });
  });

  it('leaves the catalog number empty when the note has no position', () => {
    expect(cardLocator({ section: 'Ch. 3', position: null })).toEqual({
      tab: 'Ch. 3',
      catalogNumber: '',
    });
  });
});
