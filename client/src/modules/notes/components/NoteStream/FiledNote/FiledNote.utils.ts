// A digits-only position is shown as "p. N" and stored as typed, so the rendering lives here
// rather than in the column (CONTEXT.md, Locator). Anything else - "12:30", "loc. 418",
// "§4" - is already the user's own notation and is left exactly as they wrote it.
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

// The card's anatomy keeps the section on the tab and the position in the catalog number. A
// note with no section would leave the tab blank, so the position moves up to it and the
// catalog number is left empty - the card says where it came from exactly once either way.
export const cardLocator = (note: {
  section: string | null;
  position: string | null;
}): { tab: string; catalogNumber: string } => {
  const position =
    note.position === null || note.position === '' ? '' : formatPosition(note.position);
  if (note.section === null || note.section === '') {
    return { tab: position, catalogNumber: '' };
  }
  return { tab: note.section, catalogNumber: position };
};
