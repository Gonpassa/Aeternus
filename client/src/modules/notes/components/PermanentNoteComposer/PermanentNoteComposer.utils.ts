import { z } from 'zod';
import type { CreatePermanentNoteRequest } from '@nee3/shared-types';
import {
  LINK_REASON_MAX,
  LINK_REASON_REQUIRED,
  LINK_REASON_TOO_LONG,
} from '../../utils/linkReason.ts';
import { TOPIC_COUNT_MAX, TOPIC_NAME_MAX } from '../../utils/topicLimits.ts';

// The backend's modules/notes/validation.ts is the authority on these ceilings - it is what a
// request is actually held to - and they are mirrored here so an over-long field is answered
// as it is left rather than after a round trip. Both sides say the same number in the same
// voice; the numbers themselves are argued for where they are enforced.
export const PERMANENT_NOTE_TITLE_MAX = 280;
export const PERMANENT_NOTE_BODY_MAX = 8000;

// The target and its reason are one field group rather than two steps: a target picked without
// a reason blocks the save exactly as a missing Link does (ADR 0015), so the reason is part of
// the schema that validates the note.
export const permanentNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A Permanent note needs a title stating the idea as a claim.')
    .max(PERMANENT_NOTE_TITLE_MAX, `A title is at most ${PERMANENT_NOTE_TITLE_MAX} characters.`),
  body: z
    .string()
    .trim()
    .min(1, 'A Permanent note needs the idea written out.')
    .max(
      PERMANENT_NOTE_BODY_MAX,
      `A note is at most ${PERMANENT_NOTE_BODY_MAX.toLocaleString('en-US')} characters.`,
    ),
  // The reason's rule is shared with the browsable panel and the connections view's edit in
  // place, because it is the same line held to the same ceiling wherever it is written.
  reason: z.string().trim().min(1, LINK_REASON_REQUIRED).max(LINK_REASON_MAX, LINK_REASON_TOO_LONG),
  // A Permanent note is the one note kind that carries its own Topics, and carries them
  // optionally: an idea filed under no word yet is not an incomplete one (#87).
  topicNames: z
    .array(z.string().trim().min(1).max(TOPIC_NAME_MAX))
    .max(TOPIC_COUNT_MAX, `A note carries at most ${TOPIC_COUNT_MAX} Topics.`),
});

export type PermanentNoteValues = z.input<typeof permanentNoteSchema>;
export type PermanentNoteOutput = z.output<typeof permanentNoteSchema>;

export const BLANK_COMPOSER: PermanentNoteValues = {
  title: '',
  body: '',
  reason: '',
  topicNames: [],
};

// The note and its first Link in one request, because they are one transaction (ADR 0014).
// The target is the note the composer was opened from, so it is not a field the user fills in:
// finding other targets is a later ticket.
export const toCreateRequest = (
  values: PermanentNoteOutput,
  targetNoteId: number,
): CreatePermanentNoteRequest => ({
  title: values.title,
  body: values.body,
  links: [{ targetNoteId, reason: values.reason }],
  topicNames: values.topicNames,
});
