import { sanitizeSourceInput } from './sanitize';

describe('sanitizeSourceInput', () => {
  it('trims the fields it keeps', () => {
    expect(
      sanitizeSourceInput({
        title: '  How to Take Smart Notes  ',
        kind: 'book',
        author: '  Sönke Ahrens ',
        url: ' https://example.com/smart ',
      }),
    ).toEqual({
      title: 'How to Take Smart Notes',
      kind: 'book',
      author: 'Sönke Ahrens',
      url: 'https://example.com/smart',
    });
  });

  it('collapses runs of whitespace inside a title, including newlines from a paste', () => {
    expect(
      sanitizeSourceInput({ title: 'How to\n\nTake   Smart\tNotes', kind: 'book' }),
    ).toMatchObject({ title: 'How to Take Smart Notes' });
  });

  it('collapses runs of whitespace inside an author', () => {
    expect(
      sanitizeSourceInput({ title: 'A', kind: 'book', author: 'Sönke   Ahrens' }),
    ).toMatchObject({ author: 'Sönke Ahrens' });
  });

  it.each([undefined, null, '', '   '])('stores an absent author (%p) as null', (author) => {
    expect(sanitizeSourceInput({ title: 'A', kind: 'book', author })).toMatchObject({
      author: null,
    });
  });

  it.each([undefined, null, '', '   '])('stores an absent url (%p) as null', (url) => {
    expect(sanitizeSourceInput({ title: 'A', kind: 'book', url })).toMatchObject({ url: null });
  });

  // ADR 0017: the Notes module keeps no HTML allow-list of its own. Markup a user types is
  // their text, stored and later rendered as written, not filtered and not interpreted.
  it('leaves angle brackets in a title alone rather than filtering markup', () => {
    expect(sanitizeSourceInput({ title: 'Notes on <em>Hamlet</em>', kind: 'book' })).toMatchObject({
      title: 'Notes on <em>Hamlet</em>',
    });
  });
});
