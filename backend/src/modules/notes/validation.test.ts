import {
  SOURCE_AUTHOR_MAX,
  SOURCE_TITLE_MAX,
  SOURCE_URL_MAX,
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
