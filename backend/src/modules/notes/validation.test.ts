import {
  LINK_REASON_MAX,
  LITERATURE_NOTE_BODY_MAX,
  LITERATURE_NOTE_EXCERPT_MAX,
  NOTE_POSITION_MAX,
  NOTE_SECTION_MAX,
  PERMANENT_NOTE_BODY_MAX,
  PERMANENT_NOTE_TITLE_MAX,
  SOURCE_AUTHOR_MAX,
  SOURCE_TITLE_MAX,
  SOURCE_URL_MAX,
  validateLinkInput,
  validateLinkReason,
  validateLiteratureNoteInput,
  validatePermanentNoteInput,
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

    // A scheme is added rather than demanded: refusing "example.com" for want of "https://"
    // is friction the server can remove (#104).
    it.each(['example.com', 'www.example.com/a/b'])('accepts %p, typed without a scheme', (url) => {
      expect(validateSourceInput({ ...valid, url })).toEqual({ valid: true });
    });

    it.each(['ftp://example.com', 'javascript:alert(1)', 'not a url at all', 'example'])(
      'rejects %p, which is not a web address',
      (url) => {
        expect(validateSourceInput({ ...valid, url })).toEqual({
          valid: false,
          error: "A Source's web address needs to look like example.com or https://example.com.",
        });
      },
    );

    it('rejects a url over the ceiling, naming the limit', () => {
      const url = `https://example.com/${'a'.repeat(SOURCE_URL_MAX)}`;
      expect(validateSourceInput({ ...valid, url })).toEqual({
        valid: false,
        error: "A Source's web address is at most 2,000 characters.",
      });
    });

    it('rejects a url that is not a string', () => {
      expect(validateSourceInput({ ...valid, url: 42 })).toEqual({
        valid: false,
        error: "A Source's web address needs to look like example.com or https://example.com.",
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

describe('validatePermanentNoteInput', () => {
  const valid = {
    title: 'Writing is how an idea is tested, not how it is stored.',
    body: 'An idea that cannot be written down has not been had yet.',
    links: [{ targetNoteId: 7, reason: 'This is the claim that note was circling.' }],
  };

  it('accepts a titled, bodied note with one explained connection', () => {
    expect(validatePermanentNoteInput(valid)).toEqual({ valid: true });
  });

  it('requires a title stating the idea as a claim', () => {
    expect(validatePermanentNoteInput({ ...valid, title: '   ' })).toEqual({
      valid: false,
      error: 'A Permanent note needs a title stating the idea as a claim.',
    });
  });

  it('requires the idea written out', () => {
    expect(validatePermanentNoteInput({ ...valid, body: '' })).toEqual({
      valid: false,
      error: 'A Permanent note needs the idea written out.',
    });
  });

  it('names the ceilings when the title or the body runs over one', () => {
    expect(
      validatePermanentNoteInput({ ...valid, title: 'a'.repeat(PERMANENT_NOTE_TITLE_MAX + 1) }),
    ).toEqual({
      valid: false,
      error: `A title is at most ${PERMANENT_NOTE_TITLE_MAX} characters.`,
    });
    expect(
      validatePermanentNoteInput({ ...valid, body: 'a'.repeat(PERMANENT_NOTE_BODY_MAX + 1) }),
    ).toEqual({ valid: false, error: 'A note is at most 8,000 characters.' });
  });

  // The invariant of ADR 0014, stated where the request is held to it: an unlinked Permanent
  // note is not a state the app can be in, so there is nothing to accept and connect later.
  it.each([[[]], [undefined], [null], ['one'], [{}]])(
    'rejects %p in place of at least one connection',
    (links) => {
      expect(validatePermanentNoteInput({ ...valid, links })).toEqual({
        valid: false,
        error: 'A Permanent note needs at least one Link to a note already in the box.',
      });
    },
  );

  it('rejects a target picked without a reason, exactly as a missing Link is rejected', () => {
    expect(
      validatePermanentNoteInput({ ...valid, links: [{ targetNoteId: 7, reason: '  ' }] }),
    ).toEqual({
      valid: false,
      error: 'Every Link needs a line saying why the two belong together.',
    });
  });

  it('rejects a reason that will not stay one line', () => {
    expect(
      validatePermanentNoteInput({
        ...valid,
        links: [{ targetNoteId: 7, reason: 'a'.repeat(LINK_REASON_MAX + 1) }],
      }),
    ).toEqual({
      valid: false,
      error: `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
    });
  });

  it.each([[0], [-1], [1.5], ['7'], [undefined]])(
    'rejects %p as a target note id',
    (targetNoteId) => {
      expect(
        validatePermanentNoteInput({ ...valid, links: [{ targetNoteId, reason: 'Why.' }] }),
      ).toEqual({ valid: false, error: 'A Link needs a note to link to.' });
    },
  );

  it('rejects the same target twice, since a pair carries one Link', () => {
    expect(
      validatePermanentNoteInput({
        ...valid,
        links: [
          { targetNoteId: 7, reason: 'One reason.' },
          { targetNoteId: 7, reason: 'And another.' },
        ],
      }),
    ).toEqual({ valid: false, error: 'A note can only be linked once.' });
  });
});

describe('validateLinkInput', () => {
  const valid = { originNoteId: 1, targetNoteId: 2, reason: 'Both are about effort avoided.' };

  it('accepts a connection with a note at each end and a reason', () => {
    expect(validateLinkInput(valid)).toEqual({ valid: true });
  });

  it.each([
    ['a missing origin', { ...valid, originNoteId: undefined }],
    ['a missing target', { ...valid, targetNoteId: undefined }],
    ['a target that is not a whole number', { ...valid, targetNoteId: 2.5 }],
    ['a target that is not positive', { ...valid, targetNoteId: 0 }],
  ])('refuses %s', (_case, input) => {
    expect(validateLinkInput(input)).toEqual({
      valid: false,
      error: 'A Link needs a note at each end.',
    });
  });

  it('refuses a note connected to itself, which states nothing', () => {
    expect(validateLinkInput({ ...valid, targetNoteId: valid.originNoteId })).toEqual({
      valid: false,
      error: 'A note cannot be linked to itself.',
    });
  });

  it('holds the reason to the same rule it is held to in the composer', () => {
    expect(validateLinkInput({ ...valid, reason: '   ' })).toEqual({
      valid: false,
      error: 'Every Link needs a line saying why the two belong together.',
    });
    expect(validateLinkInput({ ...valid, reason: 'x'.repeat(LINK_REASON_MAX + 1) })).toEqual({
      valid: false,
      error: `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
    });
  });
});

describe('validateLinkReason', () => {
  it('accepts a rewritten line', () => {
    expect(validateLinkReason('What it was really about.')).toEqual({ valid: true });
  });

  it('refuses an emptied reason, since a Link cannot exist without one', () => {
    expect(validateLinkReason('   ')).toEqual({
      valid: false,
      error: 'Every Link needs a line saying why the two belong together.',
    });
    expect(validateLinkReason(undefined)).toEqual({
      valid: false,
      error: 'Every Link needs a line saying why the two belong together.',
    });
  });

  it('accepts a reason exactly at the ceiling and refuses one past it', () => {
    expect(validateLinkReason('x'.repeat(LINK_REASON_MAX))).toEqual({ valid: true });
    expect(validateLinkReason('x'.repeat(LINK_REASON_MAX + 1))).toEqual({
      valid: false,
      error: `A reason is at most ${LINK_REASON_MAX} characters - longer than that is a note of its own.`,
    });
  });
});
