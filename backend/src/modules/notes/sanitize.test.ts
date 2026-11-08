import {
  sanitizeLiteratureNoteInput,
  sanitizePermanentNoteInput,
  sanitizeSourceInput,
} from './sanitize';

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

describe('sanitizeLiteratureNoteInput', () => {
  it('trims the body at its ends', () => {
    expect(sanitizeLiteratureNoteInput({ body: '  A point.  ', position: '42' })).toMatchObject({
      body: 'A point.',
    });
  });

  // ADR 0017: line breaks the user typed are the one piece of structure a plain field
  // carries, and the only one the method has no objection to.
  it('keeps the line breaks inside a body and an excerpt', () => {
    expect(
      sanitizeLiteratureNoteInput({
        body: 'One thought.\n\nAnother.',
        excerpt: 'First line.\nSecond line.',
        position: '42',
      }),
    ).toMatchObject({
      body: 'One thought.\n\nAnother.',
      excerpt: 'First line.\nSecond line.',
    });
  });

  it('collapses whitespace in the one-line Locator halves', () => {
    expect(
      sanitizeLiteratureNoteInput({ body: 'A point.', section: '  Ch.   3  ', position: ' 42 ' }),
    ).toMatchObject({ section: 'Ch. 3', position: '42' });
  });

  // "p. N" is a rendering rule over a digits-only position, never a stored value.
  it('stores a position exactly as typed rather than formatting it', () => {
    expect(sanitizeLiteratureNoteInput({ body: 'A point.', position: '42' })).toMatchObject({
      position: '42',
    });
  });

  it('turns an absent, null or blank optional field into null', () => {
    expect(
      sanitizeLiteratureNoteInput({ body: 'A point.', section: '', position: '42', excerpt: null }),
    ).toMatchObject({ section: null, excerpt: null });
  });

  it('treats anything but true as unflagged', () => {
    expect(sanitizeLiteratureNoteInput({ body: 'A point.', position: '42' })).toMatchObject({
      openQuestion: false,
    });
    expect(
      sanitizeLiteratureNoteInput({ body: 'A point.', position: '42', openQuestion: true }),
    ).toMatchObject({ openQuestion: true });
  });

  it('leaves angle brackets in a body alone rather than filtering markup', () => {
    expect(
      sanitizeLiteratureNoteInput({ body: 'On <em>Hamlet</em>', position: '42' }),
    ).toMatchObject({ body: 'On <em>Hamlet</em>' });
  });
});

describe('sanitizePermanentNoteInput', () => {
  it('collapses the title and every reason to one line', () => {
    expect(
      sanitizePermanentNoteInput({
        title: '  Writing   is\nhow an idea is tested.  ',
        body: 'The idea.',
        links: [{ targetNoteId: 7, reason: '  Two\nwords.  ' }],
      }),
    ).toEqual({
      title: 'Writing is how an idea is tested.',
      body: 'The idea.',
      linkDrafts: [{ targetNoteId: 7, reason: 'Two words.' }],
    });
  });

  it('keeps the body\u2019s own line breaks, as a plain field carries them', () => {
    expect(
      sanitizePermanentNoteInput({
        title: 'A claim.',
        body: '  First line.\n\nSecond line.  ',
        links: [{ targetNoteId: 7, reason: 'Why.' }],
      }),
    ).toMatchObject({ body: 'First line.\n\nSecond line.' });
  });
});
