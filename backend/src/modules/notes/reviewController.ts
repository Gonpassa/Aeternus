import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  RecordReviewAnswerRequest,
  ReviewDueCountResponse,
  ReviewQueueResponse,
} from '@nee3/shared-types';
import {
  countNotesNeverAnswered,
  findOwnedLinkAndNote,
  listReviewQueue,
  recordReviewAnswer,
} from '../../db/reviewAnswers';
import { findNoteById } from '../../db/notes';
import { listTopicsBySourceIds } from '../../db/topics';
import { validateReviewAnswerInput } from './validation';
import { toReviewAnswer, toReviewQueueNote } from './serialize';
import { getUserId } from '../../types/request';

// The whole queue in one payload: three bands in order, and the one number the module has.
// Nothing is paged, because a pass ends at the end of the first band rather than at the end of
// a page, and the bands behind it are a standing invitation rather than a list to work through
// (ADR 0016).
export const getReviewQueue = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = getUserId(req);
  try {
    const rows = await listReviewQueue({ userId });
    // A Literature note inherits its Source's Topics, so the Topics are read per Source rather
    // than per note - one query for the whole queue, however many notes share a Source.
    const bySource = await listTopicsBySourceIds({
      sourceIds: [
        ...new Set(
          rows
            .map((row) => row.note.sourceId)
            .filter((sourceId): sourceId is number => sourceId !== null),
        ),
      ],
    });
    res.status(200).json({
      notes: rows.map((row) =>
        toReviewQueueNote(row, (row.note.sourceId && bySource.get(row.note.sourceId)) || []),
      ),
      // The length of the first band, which is also what the badge reads: a pass ends where
      // the never-answered notes end, and that is what lets "N due" reach zero.
      dueCount: rows.filter((row) => row.band === 'never-answered').length,
    } satisfies ReviewQueueResponse);
  } catch (err) {
    next(err);
  }
};

// The badge's own read. The rail carries "Review · N due" on every page of the app, and
// pulling the whole queue to render one number would make every page wait on it.
export const getReviewDueCount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dueCount = await countNotesNeverAnswered({ userId: getUserId(req) });
    res.status(200).json({ dueCount } satisfies ReviewDueCountResponse);
  } catch (err) {
    next(err);
  }
};

// Appending one Answer, and the only write this history has: there is no endpoint that
// rewrites or removes a row, because a second look at the same note is a second row and the
// first was not wrong (ADR 0011).
//
// The Answer arrives once the Link or the Permanent note already exists, which is what makes
// "recorded on completion, never on intent" a property of the protocol rather than a promise
// the client keeps: an abandoned composer simply never sends this, and the note stays due.
export const createReviewAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateReviewAnswerInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { noteId, answer, producedLinkId, producedNoteId } = req.body as RecordReviewAnswerRequest;
  const userId = getUserId(req);
  try {
    // Narrowed to the Literature kind: Review asks its question of a note written while
    // reading, so a Permanent note's id through this door is simply not found rather than
    // refused - the same answer an id belonging to someone else gets.
    const note = await findNoteById({ id: noteId, userId });
    if (!note || note.kind !== 'literature') {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    const produced = await findOwnedLinkAndNote({
      userId,
      linkId: producedLinkId ?? null,
      noteId: producedNoteId ?? null,
    });
    // What the Answer claims to have produced has to be this user's, and it has to exist: a row
    // naming something that was never there is not history, it is a wrong fact in a table that
    // is never corrected.
    if (producedLinkId != null && produced.link === null) {
      res.status(400).json({
        error: 'That connection could not be found.',
      } satisfies ApiErrorResponse);
      return;
    }
    if (producedNoteId != null && produced.note === null) {
      res.status(400).json({
        error: 'That Permanent note could not be found.',
      } satisfies ApiErrorResponse);
      return;
    }
    const recorded = await recordReviewAnswer({
      noteId: note.id,
      answer,
      producedLinkId: produced.link?.id ?? null,
      producedNoteId: produced.note?.id ?? null,
    });
    res.status(201).json({ reviewAnswer: toReviewAnswer(recorded) });
  } catch (err) {
    next(err);
  }
};
