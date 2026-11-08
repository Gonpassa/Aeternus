import { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse, CreateLiteratureNoteRequest } from '@nee3/shared-types';
import { validateLiteratureNoteInput } from './validation';
import { sanitizeLiteratureNoteInput } from './sanitize';
import { toLiteratureNote } from './serialize';
import { parseSourceId } from './params';
import { createLiteratureNote as createLiteratureNoteRecord } from '../../db/notes';
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
