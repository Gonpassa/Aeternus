import {
  LITERATURE_NOTE_BODY_MAX,
  LITERATURE_NOTE_EXCERPT_MAX,
  NOTE_POSITION_MAX,
  NOTE_SECTION_MAX,
  SOURCE_AUTHOR_MAX,
  SOURCE_TITLE_MAX,
  SOURCE_URL_MAX,
  validateLiteratureNoteInput,
  validateSourceInput,
} from './validation';

describe('validateSourceInput', () => {
  const valid = { title: 'How to Take Smart Notes', kind: 'book' };

  it('accepts a title and a kind on their own', () => {
    expect(validateSourceInput(valid)).toEqual({ valid: true });
  });

  it('accepts an author and a url alongside them', () => {
    expect(
      validateSourceInput({ ...valid, author: 'Sönke Ahrens', url: 'https://example.com/smart' }),
    ).toEqual({ valid: true });
  });

  it.each([undefined, null, '', '   '])('treats an absent author (%p) as fine', (author) => {
    expect(validateSourceInput({ ...valid, author })).toEqual({ valid: true });
  });

  it.each([undefined, null, '', '   '])('treats an absent url (%p) as fine', (url) => {
    expect(validateSourceInput({ ...valid, url })).toEqual({ valid: true });
  });

  describe('title', () => {
    it.each([undefined, null, '', '   ', 42])('rejects a missing title (%p)', (title) => {
      expect(validateSourceInput({ ...valid, title })).toEqual({
        valid: false,
        error: 'A Source needs a title.',
      });
    });

    it('accepts a title exactly at the ceiling', () => {
      expect(validateSourceInput({ ...valid, title: 'a'.repeat(SOURCE_TITLE_MAX) })).toEqual({
        valid: true,
      });
    });

    it('rejects a title one character over the ceiling, naming the limit', () => {
      expect(validateSourceInput({ ...valid, title: 'a'.repeat(SOURCE_TITLE_MAX + 1) })).toEqual({
        valid: false,
        error: 'A Source title is at most 140 characters.',
      });
    });

    it('measures the ceiling against the trimmed title', () => {
      const title = `  ${'a'.repeat(SOURCE_TITLE_MAX)}  `;
      expect(validateSourceInput({ ...valid, title })).toEqual({ valid: true });
    });
  });

  describe('kind', () => {
    it.each(['book', 'article', 'video', 'other'])('accepts %s', (kind) => {
      expect(validateSourceInput({ ...valid, kind })).toEqual({ valid: true });
    });

    it.each([undefined, null, '', 'podcast', 7])('rejects an unknown kind (%p)', (kind) => {
      expect(validateSourceInput({ ...valid, kind })).toEqual({
        valid: false,
        error: 'A Source is a book, an article, a video, or something else.',
      });
    });
  });

  describe('author', () => {
    it('accepts an author exactly at the ceiling', () => {
      expect(validateSourceInput({ ...valid, author: 'a'.repeat(SOURCE_AUTHOR_MAX) })).toEqual({
        valid: true,
      });
    });

    it('rejects an author one character over the ceiling, naming the limit', () => {
      expect(validateSourceInput({ ...valid, author: 'a'.repeat(SOURCE_AUTHOR_MAX + 1) })).toEqual({
        valid: false,
        error: 'An author is at most 140 characters.',
      });
    });

    it('rejects an author that is not a string', () => {
      expect(validateSourceInput({ ...valid, author: 42 })).toEqual({
        valid: false,
        error: 'An author is at most 140 characters.',
      });
    });
  });

  describe('url', () => {
    it.each(['http://example.com', 'https://example.com/a/b?c=d#e'])('accepts %s', (url) => {
      expect(validateSourceInput({ ...valid, url })).toEqual({ valid: true });
    });

    it.each(['example.com', 'ftp://example.com', 'javascript:alert(1)', 'not a url at all'])(
      'rejects %p, which is not an http(s) link',
      (url) => {
        expect(validateSourceInput({ ...valid, url })).toEqual({
          valid: false,
          error: 'A Source link must start with http:// or https://.',
        });
      },
    );

    it('rejects a url over the ceiling, naming the limit', () => {
      const url = `https://example.com/${'a'.repeat(SOURCE_URL_MAX)}`;
      expect(validateSourceInput({ ...valid, url })).toEqual({
        valid: false,
        error: 'A Source link is at most 2,000 characters.',
      });
    });

    it('rejects a url that is not a string', () => {
      expect(validateSourceInput({ ...valid, url: 42 })).toEqual({
        valid: false,
        error: 'A Source link must start with http:// or https://.',
      });
    });
  });
});

describe('validateLiteratureNoteInput', () => {
  const valid = { body: 'Reading is not understanding.', position: '42' };

  it('accepts a body with a position alone', () => {
    expect(validateLiteratureNoteInput(valid)).toEqual({ valid: true });
  });

  it('accepts a body with a section alone, since either half is a complete Locator', () => {
    expect(
      validateLiteratureNoteInput({ body: 'Reading is not understanding.', section: 'Ch. 3' }),
    ).toEqual({ valid: true });
  });

  it('accepts both halves together', () => {
    expect(validateLiteratureNoteInput({ ...valid, section: 'Ch. 3' })).toEqual({ valid: true });
  });

  it('accepts an excerpt and an open-question flag alongside them', () => {
    expect(
      validateLiteratureNoteInput({
        ...valid,
        excerpt: "The author's own words.",
        openQuestion: true,
      }),
    ).toEqual({ valid: true });
  });

  it("rejects a note with nothing of the user's own in it", () => {
    expect(validateLiteratureNoteInput({ ...valid, body: '   ' })).toEqual({
      valid: false,
      error: 'A note needs a few words of your own.',
    });
  });

  it('rejects a note with neither half of a Locator', () => {
    expect(validateLiteratureNoteInput({ body: 'Reading is not understanding.' })).toEqual({
      valid: false,
      error: 'A note needs a section or a position - either one will do.',
    });
  });

  it('counts a blank Locator half as absent rather than as given', () => {
    expect(validateLiteratureNoteInput({ body: 'A point.', section: '  ', position: '' })).toEqual({
      valid: false,
      error: 'A note needs a section or a position - either one will do.',
    });
  });

  it('names the ceiling when the body runs over it', () => {
    expect(
      validateLiteratureNoteInput({ ...valid, body: 'a'.repeat(LITERATURE_NOTE_BODY_MAX + 1) }),
    ).toEqual({ valid: false, error: 'A note is at most 4,000 characters.' });
  });

  it('names the ceiling when the excerpt runs over it', () => {
    expect(
      validateLiteratureNoteInput({
        ...valid,
        excerpt: 'a'.repeat(LITERATURE_NOTE_EXCERPT_MAX + 1),
      }),
    ).toEqual({ valid: false, error: 'An excerpt is at most 4,000 characters.' });
  });

  it('names the ceiling when a Locator half runs over it', () => {
    expect(
      validateLiteratureNoteInput({ ...valid, section: 'a'.repeat(NOTE_SECTION_MAX + 1) }),
    ).toEqual({ valid: false, error: `A section is at most ${NOTE_SECTION_MAX} characters.` });
    expect(
      validateLiteratureNoteInput({
        body: 'A point.',
        position: 'a'.repeat(NOTE_POSITION_MAX + 1),
      }),
    ).toEqual({ valid: false, error: `A position is at most ${NOTE_POSITION_MAX} characters.` });
  });

  it('treats an omitted open-question flag as unflagged rather than as malformed', () => {
    expect(validateLiteratureNoteInput({ ...valid, openQuestion: undefined })).toEqual({
      valid: true,
    });
  });

  it('rejects an open-question flag that is not a boolean', () => {
    expect(validateLiteratureNoteInput({ ...valid, openQuestion: 'yes' })).toEqual({
      valid: false,
      error: 'An open question is either flagged or not.',
    });
  });
});
