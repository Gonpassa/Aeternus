import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateLiteratureNoteRequest,
  UpdateLiteratureNoteRequest,
} from '@nee3/shared-types';
import { validateLiteratureNoteInput } from './validation';
import { sanitizeLiteratureNoteInput } from './sanitize';
import { toLiteratureNote } from './serialize';
import { parseNoteId, parseSourceId } from './params';
import {
  createLiteratureNote as createLiteratureNoteRecord,
  deleteNote as deleteNoteRecord,
  findLiteratureNoteOwnedByUser,
  updateLiteratureNote as updateLiteratureNoteRecord,
} from '../../db/notes';
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
// written elsewhere. Nothing can be orphaned yet, so the guard is absent rather than stubbed -
// but the read that it needs already happens here, and the delete below is only the mechanics.
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
  try {
    const note = await findLiteratureNoteOwnedByUser({ id: noteId, userId: getUserId(req) });
    if (!note) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteNoteRecord({ id: note.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
