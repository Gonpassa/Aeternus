import { describe, expect, it } from 'vitest';
import { cardLocator } from './FiledNote.utils.ts';

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
