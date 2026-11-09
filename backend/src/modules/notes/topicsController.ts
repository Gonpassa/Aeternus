import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  RenameTopicRequest,
  TopicMergeConflictResponse,
} from '@nee3/shared-types';
import {
  deleteTopic as deleteTopicRecord,
  findTopicById,
  listNotesSharingTopicWith,
  listTopicCarriers,
  listTopicsByUser,
  renameTopic as renameTopicRecord,
} from '../../db/topics';
import { findNoteById } from '../../db/notes';
import { toTopicListEntry, toTopicPermanentNote, toTopicRelatedNote } from './serialize';
import { parseNoteId, parseTopicId } from './params';
import { validateTopicName } from './validation';
import { sanitizeTopicName } from './sanitize';
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
    res.status(200).json({ topics: rows.map(toTopicListEntry) });
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

// The Topic view: the Topic itself, the Permanent notes carrying it most-linked first, and the
// Sources carrying it (#88). A Topic is a place rather than a filter state, which is why it
// has its own route and its own payload - and why a Topic nobody carries any more answers with
// empty groups rather than a 404 (CONTEXT.md, Topic).
export const getTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const topicId = parseTopicId(req);
  if (topicId === null) {
    res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const topic = await findTopicById({ id: topicId, userId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
      return;
    }
    const { permanentNotes, sources } = await listTopicCarriers({ topicId, userId });
    res.status(200).json({
      topic: toTopicListEntry(topic),
      permanentNotes: permanentNotes.map(toTopicPermanentNote),
      sources,
    });
  } catch (err) {
    next(err);
  }
};

// Renaming a Topic, which is also how two are merged: a name that already belongs to another
// Topic folds this one into it rather than being refused as a duplicate, so there is no
// separate merge endpoint (CONTEXT.md, Topic). The response says which of the two happened.
export const renameTopic = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const topicId = parseTopicId(req);
  if (topicId === null) {
    res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
    return;
  }
  const { name, merge } = req.body as RenameTopicRequest;
  const validation = validateTopicName(name);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const renamed = await renameTopicRecord({
      topicId,
      userId,
      name: sanitizeTopicName(name),
      merge: merge === true,
    });
    if (!renamed) {
      res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
      return;
    }
    // The rename turned out to be a merge the request had not agreed to. The Topic the name
    // already belongs to is handed back so the client can confirm against its real carrier
    // counts and ask again, rather than folding two Topics together unasked (#88).
    if ('conflict' in renamed) {
      const mergeTarget = await findTopicById({ id: renamed.conflict.id, userId });
      if (!mergeTarget) {
        res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
        return;
      }
      res.status(409).json({
        error: `“${renamed.conflict.name}” already exists, so renaming merges the two.`,
        mergeTarget: toTopicListEntry(mergeTarget),
      } satisfies TopicMergeConflictResponse);
      return;
    }
    // Read back with its counts, because a merge changed them: the surviving Topic now wears
    // every carrier of both.
    const topic = await findTopicById({ id: renamed.topic.id, userId });
    if (!topic) {
      res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ topic: toTopicListEntry(topic), merged: renamed.merged });
  } catch (err) {
    next(err);
  }
};

// Deleting a Topic takes the word out of the vocabulary and off every carrier, and touches no
// note: the carriers keep everything else they wear (CONTEXT.md, Topic).
export const deleteTopic = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const topicId = parseTopicId(req);
  if (topicId === null) {
    res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const deleted = await deleteTopicRecord({ topicId, userId: getUserId(req) });
    if (!deleted) {
      res.status(404).json({ error: 'Topic not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
