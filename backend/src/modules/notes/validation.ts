import { SOURCE_KINDS, type SourceKind } from '@nee3/shared-types';

export type ValidationResult = { valid: true } | { valid: false; error: string };

// Generous maxima, kept here rather than as column types so the ceiling is a sanity bound
// with a message in the module's voice instead of a Postgres error (ADR 0012, ADR 0017).
// They are set where a real Source never reaches them: a title or an author that runs past
// 140 characters is not a title or an author, and 2,000 is the length browsers themselves
// stop guaranteeing for a URL.
export const SOURCE_TITLE_MAX = 140;
export const SOURCE_AUTHOR_MAX = 140;
export const SOURCE_URL_MAX = 2000;
export const NOTE_SECTION_MAX = 140;
export const NOTE_POSITION_MAX = 140;
export const LITERATURE_NOTE_BODY_MAX = 4000;
export const LITERATURE_NOTE_EXCERPT_MAX = 4000;

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const isWithin = (value: unknown, max: number): boolean =>
  typeof value === 'string' && trimmed(value).length <= max;

// Absent, null and blank all mean "not given" for an optional field: a form submits an
// untouched input as the empty string, and sanitize.ts turns all three into a null column.
// A non-string is none of those - it falls through to the field's own check and is refused.
const isOmitted = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const isSourceKind = (value: unknown): value is SourceKind =>
  typeof value === 'string' && (SOURCE_KINDS as readonly string[]).includes(value);

// `url` is held to http(s) rather than merely to a length. A Source's link is rendered as a
// link, so a `javascript:` or `data:` scheme would be an injection surface, and a bare
// "example.com" would resolve against this app's own origin.
const isHttpUrl = (value: unknown): boolean =>
  typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());

export const validateSourceInput = (input: {
  title?: unknown;
  kind?: unknown;
  author?: unknown;
  url?: unknown;
}): ValidationResult => {
  if (trimmed(input.title) === '') {
    return { valid: false, error: 'A Source needs a title.' };
  }
  if (!isWithin(input.title, SOURCE_TITLE_MAX)) {
    return { valid: false, error: `A Source title is at most ${SOURCE_TITLE_MAX} characters.` };
  }
  if (!isSourceKind(input.kind)) {
    return { valid: false, error: 'A Source is a book, an article, a video, or something else.' };
  }
  if (!isOmitted(input.author) && !isWithin(input.author, SOURCE_AUTHOR_MAX)) {
    return { valid: false, error: `An author is at most ${SOURCE_AUTHOR_MAX} characters.` };
  }
  if (!isOmitted(input.url)) {
    if (!isHttpUrl(input.url)) {
      return { valid: false, error: 'A Source link must start with http:// or https://.' };
    }
    if (!isWithin(input.url, SOURCE_URL_MAX)) {
      return {
        valid: false,
        error: `A Source link is at most ${SOURCE_URL_MAX.toLocaleString('en-US')} characters.`,
      };
    }
  }
  return { valid: true };
};

// A Literature note's shape, checked here in the module's voice above the CHECK constraints
// that state the same requirements in the database (ADR 0012). The Locator rule is the one
// worth reading twice: section and position are each optional, and at least one of the two
// is required, because either alone is a complete Locator (CONTEXT.md, Locator).
export const validateLiteratureNoteInput = (input: {
  body?: unknown;
  section?: unknown;
  position?: unknown;
  excerpt?: unknown;
  openQuestion?: unknown;
}): ValidationResult => {
  if (trimmed(input.body) === '') {
    return { valid: false, error: 'A note needs a few words of your own.' };
  }
  if (!isWithin(input.body, LITERATURE_NOTE_BODY_MAX)) {
    return {
      valid: false,
      error: `A note is at most ${LITERATURE_NOTE_BODY_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  if (isOmitted(input.section) && isOmitted(input.position)) {
    return { valid: false, error: 'A note needs a section or a position - either one will do.' };
  }
  if (!isOmitted(input.section) && !isWithin(input.section, NOTE_SECTION_MAX)) {
    return { valid: false, error: `A section is at most ${NOTE_SECTION_MAX} characters.` };
  }
  if (!isOmitted(input.position) && !isWithin(input.position, NOTE_POSITION_MAX)) {
    return { valid: false, error: `A position is at most ${NOTE_POSITION_MAX} characters.` };
  }
  if (!isOmitted(input.excerpt) && !isWithin(input.excerpt, LITERATURE_NOTE_EXCERPT_MAX)) {
    return {
      valid: false,
      error: `An excerpt is at most ${LITERATURE_NOTE_EXCERPT_MAX.toLocaleString('en-US')} characters.`,
    };
  }
  // Absent means false - the flag is set while writing or afterwards, so an omitted flag is
  // an unflagged note rather than a malformed request. Anything other than a boolean is not.
  if (input.openQuestion !== undefined && typeof input.openQuestion !== 'boolean') {
    return { valid: false, error: 'An open question is either flagged or not.' };
  }
  return { valid: true };
};
