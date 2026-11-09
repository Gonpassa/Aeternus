import type {
  CreateLinkRequest,
  CreatePermanentNoteRequest,
  LiteratureNote,
} from '@nee3/shared-types';
import { useCreateLink } from './linkHooks.ts';
import { useCreatePermanentNote } from './noteHooks.ts';
import { useClearOpenQuestion, useRecordReviewAnswer } from './reviewHooks.ts';

// The three Answers as a pass performs them, which is more than three writes: two of them
// produce something first and are recorded only once that thing exists (ADR 0011), so the
// order matters and belongs here rather than in the route. A Permanent note is written with no
// Source in hand, because Review reaches its notes without a reading page.
export const useAnswerReview = () => {
  const recordAnswer = useRecordReviewAnswer();
  const createLink = useCreateLink();
  const writePermanentNote = useCreatePermanentNote();
  const clearOpenQuestion = useClearOpenQuestion();

  return {
    nothingHere: async (note: LiteratureNote) => {
      await recordAnswer.mutateAsync({ noteId: note.id, answer: 'nothing_here' });
    },
    link: async (note: LiteratureNote, input: CreateLinkRequest) => {
      const { link } = await createLink.mutateAsync(input);
      await recordAnswer.mutateAsync({
        noteId: note.id,
        answer: 'link_made',
        producedLinkId: link.id,
      });
    },
    writePermanentNote: async (note: LiteratureNote, input: CreatePermanentNoteRequest) => {
      const written = await writePermanentNote.mutateAsync(input);
      await recordAnswer.mutateAsync({
        noteId: note.id,
        answer: 'permanent_note_written',
        producedNoteId: written.note.id,
      });
    },
    // Not an Answer: it resolves nothing and records nothing (CONTEXT.md, Open question).
    clearOpenQuestion: async (note: LiteratureNote) => {
      await clearOpenQuestion.mutateAsync(note);
    },
  };
};
