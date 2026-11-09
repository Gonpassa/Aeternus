import type { SourceKind } from '@nee3/shared-types';

// The Notes module's sanitizer trims and normalizes text rather than filtering markup
// (ADR 0017): every field in the module is plain text, so there is no HTML allow-list here
// to keep in step with an editor, and angle brackets a user types are simply their text.

// One space for any run of whitespace, so a title pasted across two lines files as one line.
const collapse = (value: string): string => value.trim().replace(/\s+/g, ' ');

// Absent, null and blank all become a null column: an untouched optional input arrives as
// the empty string, and "" is not a different state from "not given" for an author or a link.
const optional = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = collapse(value);
  return normalized === '' ? null : normalized;
};

export interface SanitizedSourceInput {
  title: string;
  kind: SourceKind;
  author: string | null;
  url: string | null;
}

export const sanitizeSourceInput = (input: {
  title: string;
  kind: SourceKind;
  author?: unknown;
  url?: unknown;
}): SanitizedSourceInput => ({
  title: collapse(input.title),
  kind: input.kind,
  author: optional(input.author),
  // A link is trimmed but never otherwise rewritten - no case folding, no trailing-slash
  // normalizing - so it still resolves to exactly what the user pasted.
  url: typeof input.url === 'string' && input.url.trim() !== '' ? input.url.trim() : null,
});

// A note's own text keeps the line breaks the user typed - the one piece of structure a plain
// field carries, and the only one the method has no objection to (ADR 0017). So the body and
// the excerpt are trimmed at their ends and otherwise left exactly as written, where the
// one-line fields above collapse their whitespace.
const multiline = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export interface SanitizedLiteratureNoteInput {
  body: string;
  section: string | null;
  position: string | null;
  excerpt: string | null;
  openQuestion: boolean;
}

export const sanitizeLiteratureNoteInput = (input: {
  body: string;
  section?: unknown;
  position?: unknown;
  excerpt?: unknown;
  openQuestion?: unknown;
}): SanitizedLiteratureNoteInput => ({
  body: input.body.trim(),
  section: optional(input.section),
  // Whitespace is normalized the way every other one-line field here is, but the notation
  // itself is never rewritten: "p. N" is a rendering rule over a digits-only position, and
  // what is stored stays the user's own notation (CONTEXT.md, Locator).
  position: optional(input.position),
  excerpt: multiline(input.excerpt),
  openQuestion: input.openQuestion === true,
});

export interface SanitizedLinkDraft {
  targetNoteId: number;
  reason: string;
}

export interface SanitizedPermanentNoteInput {
  title: string;
  body: string;
  linkDrafts: SanitizedLinkDraft[];
}

// The title collapses its whitespace like every other one-line field, and the body keeps the
// line breaks it was typed with. A reason is one line by definition, so it collapses too.
export const sanitizePermanentNoteInput = (input: {
  title: string;
  body: string;
  links: { targetNoteId: number; reason: string }[];
}): SanitizedPermanentNoteInput => ({
  title: collapse(input.title),
  body: input.body.trim(),
  linkDrafts: input.links.map((link) => ({
    targetNoteId: link.targetNoteId,
    reason: collapse(link.reason),
  })),
});

// Topic names are one-line fields, so they collapse their whitespace like a title does. A blank
// name is refused before this runs, by validateTopicNames; dropping one here as well is defence
// in depth for a caller that sanitizes without validating. Casing is never rewritten: the vocabulary resolves a name case-insensitively, and the
// casing that reaches the database is the one the user typed (CONTEXT.md, Topic).
export const sanitizeTopicNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  value.forEach((raw) => {
    if (typeof raw !== 'string') return;
    const name = collapse(raw);
    // Deduplicated case-insensitively here as well as in the database, so the same name typed
    // twice in one payload is one Topic rather than a conflict resolved downstream.
    if (name !== '' && !names.some((already) => already.toLowerCase() === name.toLowerCase())) {
      names.push(name);
    }
  });
  return names;
};

// A reason is one line by definition, so it collapses its whitespace exactly as it does when
// it travels with a Permanent note.
export const sanitizeLinkReason = (reason: string): string => collapse(reason);
