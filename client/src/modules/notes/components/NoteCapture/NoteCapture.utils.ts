import { z } from 'zod';
import type { CreateLiteratureNoteRequest } from '@nee3/shared-types';

// The backend's modules/notes/validation.ts is the authority on these ceilings - it is what a
// request is actually held to - and they are mirrored here so an over-long note is answered as
// the field is left rather than after a round trip. Both sides say the same number in the same
// voice; the numbers themselves are argued for where they are enforced.
export const NOTE_SECTION_MAX = 140;
export const NOTE_POSITION_MAX = 140;
export const LITERATURE_NOTE_BODY_MAX = 4000;
export const LITERATURE_NOTE_EXCERPT_MAX = 4000;

// Every field is trimmed before it is measured, as the server measures it. The Locator rule is
// the cross-field one: section and position are each optional and at least one is required,
// because either alone is a complete Locator (CONTEXT.md, Locator). It is reported on the
// position, which is the half the card expects to be filled in most often.
export const literatureNoteSchema = z
  .object({
    section: z
      .string()
      .trim()
      .max(NOTE_SECTION_MAX, `A section is at most ${NOTE_SECTION_MAX} characters.`),
    position: z
      .string()
      .trim()
      .max(NOTE_POSITION_MAX, `A position is at most ${NOTE_POSITION_MAX} characters.`),
    body: z
      .string()
      .trim()
      .min(1, 'A note needs a few words of your own.')
      .max(
        LITERATURE_NOTE_BODY_MAX,
        `A note is at most ${LITERATURE_NOTE_BODY_MAX.toLocaleString('en-US')} characters.`,
      ),
    excerpt: z
      .string()
      .trim()
      .max(
        LITERATURE_NOTE_EXCERPT_MAX,
        `An excerpt is at most ${LITERATURE_NOTE_EXCERPT_MAX.toLocaleString('en-US')} characters.`,
      ),
    openQuestion: z.boolean(),
  })
  .refine((values) => values.section !== '' || values.position !== '', {
    message: 'A note needs a section or a position - either one will do.',
    path: ['position'],
  });

export type NoteCaptureValues = z.input<typeof literatureNoteSchema>;
export type NoteCaptureOutput = z.output<typeof literatureNoteSchema>;

export const BLANK_CARD: NoteCaptureValues = {
  section: '',
  position: '',
  body: '',
  excerpt: '',
  openQuestion: false,
};

// A blank optional field is not a different state from "not given" for a Locator half or an
// excerpt - all three reach the API as null, as they are stored. The position is sent exactly
// as typed: "p. N" is a rendering rule, never a stored value.
export const toCreateRequest = (values: NoteCaptureOutput): CreateLiteratureNoteRequest => ({
  body: values.body,
  section: values.section === '' ? null : values.section,
  position: values.position === '' ? null : values.position,
  excerpt: values.excerpt === '' ? null : values.excerpt,
  openQuestion: values.openQuestion,
});

// The tab and the catalog number are written straight onto the card, so both strip the Input
// recipe's box down to bare text. Shared rather than copied: `Input` applies its recipe through
// `css`, which outranks style props, so every field written on a card needs this same removal.
export const WRITTEN_ON_CARD = {
  height: 'auto',
  padding: '0',
  background: 'transparent',
  border: 'none',
  borderRadius: '0',
} as const;
