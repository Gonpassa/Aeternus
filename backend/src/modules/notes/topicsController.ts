import { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse } from '@nee3/shared-types';
import { listTopicsByUser, listNotesSharingTopicWith } from '../../db/topics';
import { findNoteById } from '../../db/notes';
import { toTopic, toTopicRelatedNote } from './serialize';
import { parseNoteId } from './params';
import { getUserId } from '../../types/request';

// The user's Topic vocabulary, for the autocomplete that creates Topics by typing: scoped to
// the authenticated user, with an optional q matched case-insensitively against Topic names.
// The same shape the Symbol vocabulary is read in, because it is the same kind of list.
export const listTopics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const query = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q : undefined;
  try {
    const rows = await listTopicsByUser({ userId: getUserId(req), query });
    res.status(200).json({ topics: rows.map(toTopic) });
  } catch (err) {
    next(err);
  }
};

// The notes sharing a Topic with this one: the link panel's middle tier, between the same-Source
// notes above and search below (#85). Kind-agnostic, because a tier of notes to link to is about
// a note rather than about a note of one kind, and a Literature note reaches the tier through
// the Topics it inherits from its Source (CONTEXT.md, Topic).
export const listTopicRelatedNotes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const noteId = parseNoteId(req);
  if (noteId === null) {
    res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    // The note is read first so another user's id answers "not found" rather than coming back
    // as an empty tier, which would read as a note whose Topics nothing else shares.
    const note = await findNoteById({ id: noteId, userId });
    if (!note) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    const rows = await listNotesSharingTopicWith({ noteId, userId });
    res.status(200).json({ notes: rows.map(toTopicRelatedNote) });
  } catch (err) {
    next(err);
  }
};
