import type { Note, NoteConnection } from '@nee3/shared-types';

// A digits-only position is shown as "p. N" and stored as typed, so the rendering lives here
// rather than in the column (CONTEXT.md, Locator). Anything else - "12:30", "loc. 418", "§4" -
// is already the user's own notation and is left exactly as they wrote it.
export const formatPosition = (position: string): string =>
  /^\d+$/.test(position) ? `p. ${position}` : position;

// A Locator renders as one string wherever a note appears ("Ch. 3 · p. 42"), with either half
// on its own a complete Locator.
export const formatLocator = ({
  section,
  position,
}: {
  section: string | null;
  position: string | null;
}): string =>
  [section, position === null ? null : formatPosition(position)]
    .filter((part): part is string => part !== null && part !== '')
    .join(' · ');

// How many of a note's own words identify it in a connections row. Long enough to recognize
// the note by, short enough that a row stays a row; the full body is one tap away on the card
// itself, so this is identification rather than a preview.
export const OPENING_WORDS_MAX = 80;

// A Literature note has no title, so its opening words are part of what names it (CONTEXT.md,
// Literature note). Cut on a word boundary where there is one, since a word sliced in half
// reads as a rendering fault rather than as an abbreviation.
export const openingWords = (body: string): string => {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENING_WORDS_MAX) {
    return collapsed;
  }
  const cut = collapsed.slice(0, OPENING_WORDS_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  // Trailing punctuation left in front of the ellipsis reads as a typo ("happens...."), so the
  // ellipsis replaces it rather than following it.
  return `${kept.replace(/[\s.,;:!?]+$/, '')}…`;
};

export interface NoteLabel {
  // The line that names the note: a Permanent note's own claim, or where a Literature note
  // was read from.
  heading: string;
  // The Literature note's opening words, which stand in for the title it does not have. Null
  // for a Permanent note, whose heading is already its own words.
  detail: string | null;
}

// What a connections row calls the note at the other end. A Permanent note is named by its
// title, since that is the claim it states. A Literature note has no title, so it is named by
// its Source's title, its Locator and its opening words, which is the identification
// CONTEXT.md gives it.
export const noteLabel = ({ other, sourceTitle }: NoteConnection): NoteLabel => {
  if (other.kind === 'permanent') {
    return { heading: other.title, detail: null };
  }
  const locator = formatLocator(other);
  return {
    heading: [sourceTitle, locator].filter((part) => part !== null && part !== '').join(' · '),
    detail: openingWords(other.body),
  };
};

// The kind in the module's own words, so a row says what sort of note it is reaching without
// relying on the shape of its label alone.
export const noteKindLabel = (note: Note): string =>
  note.kind === 'permanent' ? 'Permanent note' : 'Literature note';
