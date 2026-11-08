import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateLiteratureNoteRequest,
  CreatePermanentNoteRequest,
} from '@nee3/shared-types';
import { validateLiteratureNoteInput, validatePermanentNoteInput } from './validation';
import { sanitizeLiteratureNoteInput, sanitizePermanentNoteInput } from './sanitize';
import {
  EMPTY_CONNECTIONS,
  toConnections,
  toLink,
  toLiteratureNote,
  toNote,
  toPermanentNote,
} from './serialize';
import { parseNoteId, parseSourceId } from './params';
import { createLiteratureNote as createLiteratureNoteRecord, findNoteById } from '../../db/notes';
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
  const { title, body, links } = req.body as CreatePermanentNoteRequest;
  try {
    const created = await createPermanentNoteWithLinks({
      userId: getUserId(req),
      // Validation has established all three; the cast is the handover from `unknown`-typed
      // body parsing to the validated shape, as above.
      ...sanitizePermanentNoteInput({ title, body, links }),
    });
    res.status(201).json({
      note: toPermanentNote(created.note),
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
