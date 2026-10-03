import { SOURCE_KINDS, type SourceKind } from '@nee3/shared-types';

// A Source's kind is a label only: it changes no fields, so these strings are the whole of
// what it means (CONTEXT.md, Source). "Other" over a longer phrase because the same string
// has to read as a card's die-cut tab and as a row in the New Source select.
export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  book: 'Book',
  article: 'Article',
  video: 'Video',
  other: 'Other',
};

// Derived from the shared tuple rather than listed again, so a kind added to the enum shows
// up in the form the moment its label exists - and fails to typecheck until it does.
export const SOURCE_KIND_OPTIONS = SOURCE_KINDS.map((kind) => ({
  value: kind,
  label: SOURCE_KIND_LABEL[kind],
}));
