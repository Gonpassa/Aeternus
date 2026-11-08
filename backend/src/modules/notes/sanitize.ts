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
