import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateLiteratureNoteRequest,
  CreatePermanentNoteRequest,
  UpdateLiteratureNoteRequest,
} from '@nee3/shared-types';
import {
  validateLiteratureNoteInput,
  validatePermanentNoteInput,
  validateTopicNames,
} from './validation';
import {
  sanitizeLiteratureNoteInput,
  sanitizePermanentNoteInput,
  sanitizeTopicNames,
} from './sanitize';
import {
  EMPTY_CONNECTIONS,
  toConnections,
  toLink,
  toLiteratureNote,
  toNote,
  toPermanentNote,
  toTopic,
} from './serialize';
import { parseNoteId, parseSourceId } from './params';
import {
  createLiteratureNote as createLiteratureNoteRecord,
  deleteNote as deleteNoteRecord,
  findLiteratureNoteOwnedByUser,
  findNoteById,
  updateLiteratureNote as updateLiteratureNoteRecord,
} from '../../db/notes';
import {
  UnknownLinkTargetError,
  createPermanentNoteWithLinks,
  listConnectionsByNoteIds,
} from '../../db/links';
import { findSourceById } from '../../db/sources';
import { getUserId } from '../../types/request';

// Capture is nested under its Source because capture only happens with a Source open: there
// is no global new-note action (#68, #73).
export const createLiteratureNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateLiteratureNoteInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  const { body, section, position, excerpt, openQuestion } =
    req.body as CreateLiteratureNoteRequest;
  try {
    // The Source is read first so another user's id answers "not found" rather than failing
    // on the foreign key, as it does on the reading page above.
    const source = await findSourceById({ id: sourceId, userId });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    const note = await createLiteratureNoteRecord({
      userId,
      sourceId,
      // Validation has established the body; the cast is the handover from `unknown`-typed
      // body parsing to the validated shape, as in the dreams module.
      ...sanitizeLiteratureNoteInput({
        body: body as string,
        section,
        position,
        excerpt,
        openQuestion,
      }),
    });
    res.status(201).json({ note: toLiteratureNote(note) });
  } catch (err) {
    next(err);
  }
};

// A filed note is fully editable after capture: writing it closed-book is a discipline at the
// moment of capture, not a constraint on the stored text (CONTEXT.md, Literature note). The
// payload is the whole note rather than a patch of it, which is what lets an emptied excerpt
// mean "there is no excerpt" - it is held to the same rules capture is, the Locator included.
export const updateLiteratureNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const noteId = parseNoteId(req);
  if (noteId === null) {
    res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateLiteratureNoteInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { body, section, position, excerpt, openQuestion } =
    req.body as UpdateLiteratureNoteRequest;
  try {
    const note = await updateLiteratureNoteRecord({
      id: noteId,
      userId: getUserId(req),
      // Validation has established the body; the cast is the handover from `unknown`-typed
      // body parsing to the validated shape, as on capture above.
      ...sanitizeLiteratureNoteInput({
        body: body as string,
        section,
        position,
        excerpt,
        openQuestion,
      }),
    });
    // Another user's note, a note that is gone, and a Permanent note's id are one answer: the
    // update is scoped to the owner and to the Literature kind, so a miss is "not found".
    if (!note) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ note: toLiteratureNote(note) });
  } catch (err) {
    next(err);
  }
};

// Deleting a note is read, guard, delete - three steps, deliberately distinct. The orphan
// guard of ADR 0014 belongs between the second and the third once Permanent notes exist
// (#86): a Literature note is a legitimate Link endpoint, so deleting one can orphan an idea
// written elsewhere - and now that Permanent notes exist (#84), it genuinely can: the Link
// cascades away with the note, which can leave a Permanent note holding none. The guard stays
// #86's to write; the read it needs already happens here, and the delete below is only the
// mechanics.
export const deleteLiteratureNote = async (
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
    const note = await findLiteratureNoteOwnedByUser({ id: noteId, userId });
    if (!note) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteNoteRecord({ id: note.id, userId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// A Permanent note and its first Links in one request, because they are one transaction: there
// is no endpoint that creates a bare Permanent note and no save-and-link-later, since an
// unlinked Permanent note is not a state the app can be in (ADR 0014). Not nested under a
// Source - a Permanent note belongs to none - and not nested under the note it was written
// from either, because that note is one of its Link targets rather than its owner.
export const createPermanentNote = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validatePermanentNoteInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const topicValidation = validateTopicNames((req.body as CreatePermanentNoteRequest).topicNames);
  if (!topicValidation.valid) {
    res.status(400).json({ error: topicValidation.error } satisfies ApiErrorResponse);
    return;
  }
  const { title, body, links, topicNames } = req.body as CreatePermanentNoteRequest;
  try {
    const created = await createPermanentNoteWithLinks({
      userId: getUserId(req),
      // Validation has established all three; the cast is the handover from `unknown`-typed
      // body parsing to the validated shape, as above.
      ...sanitizePermanentNoteInput({ title, body, links }),
      // Optional, as on a Source: a Permanent note with no Topic is a note nobody has filed
      // under a word yet, not an incomplete one (#87).
      topicNames: sanitizeTopicNames(topicNames),
    });
    res.status(201).json({
      note: { ...toPermanentNote(created.note), topics: created.topics.map(toTopic) },
      links: created.links.map(toLink),
    });
  } catch (err) {
    // A target that is not this user's note is answered as a bad request naming the problem,
    // not as a 404 on the Permanent note - the note is what was being created, and it is the
    // connection that could not be made.
    if (err instanceof UnknownLinkTargetError) {
      res.status(400).json({
        error: 'That note could not be found to connect to.',
      } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

// Every note - either kind - is read with its connections, so this endpoint takes a note id
// and asks nothing about its kind. The reading page gets its Literature notes' connections
// folded into one payload; this is how the note at the other end of a row is read in turn,
// which is the only way a Literature note appears as the other end while the Permanent note
// has no page of its own yet.
export const getNoteConnections = async (
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
    // The note is read first so another user's id answers "not found" rather than returning
    // empty groups, which would read as a note with no connections.
    const note = await findNoteById({ id: noteId, userId });
    if (!note) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    const grouped = await listConnectionsByNoteIds({ noteIds: [noteId], userId });
    const rows = grouped.get(noteId);
    res.status(200).json({
      note: toNote(note),
      connections: rows ? toConnections(rows) : EMPTY_CONNECTIONS,
    });
  } catch (err) {
    next(err);
  }
};
