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
