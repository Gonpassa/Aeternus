import { formatPosition } from '../../../utils/noteLabel.ts';

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
