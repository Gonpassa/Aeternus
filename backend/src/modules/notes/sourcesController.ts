import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateSourceRequest,
  SourceKind,
  UpdateSourceRequest,
} from '@nee3/shared-types';
import { validateSourceInput } from './validation';
import { sanitizeSourceInput } from './sanitize';
import {
  createSource as createSourceRecord,
  deleteSource as deleteSourceRecord,
  findSourceById,
  listSourcesByUser,
  updateSource as updateSourceRecord,
} from '../../db/sources';
import { listNotesBySource, listSectionsBySource } from '../../db/notes';
import { toLiteratureNote } from './serialize';
import { parseSourceId } from './params';
import { getUserId } from '../../types/request';

export const listSources = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sources = await listSourcesByUser({ userId: getUserId(req) });
    res.status(200).json({ sources });
  } catch (err) {
    next(err);
  }
};

export const createSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateSourceInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { title, kind, author, url } = req.body as CreateSourceRequest;
  try {
    const source = await createSourceRecord({
      userId: getUserId(req),
      // Validation has established both of these; the cast is the handover from
      // `unknown`-typed body parsing to the validated shape, as in the dreams module.
      ...sanitizeSourceInput({ title: title as string, kind: kind as SourceKind, author, url }),
    });
    res.status(201).json({ source });
  } catch (err) {
    next(err);
  }
};

// The reading page's payload, in one request: the Source, its notes oldest-first, and the
// distinct sections of those notes for the capture card's tab suggestions. The sections are
// folded in here rather than given their own endpoint so capture never waits on a second
// round trip (#72). Topics fold in with their own ticket.
export const getSource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const source = await findSourceById({ id: sourceId, userId });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    const [rows, sections] = await Promise.all([
      listNotesBySource({ sourceId, userId }),
      listSectionsBySource({ sourceId, userId }),
    ]);
    res.status(200).json({ source, notes: rows.map(toLiteratureNote), sections });
  } catch (err) {
    next(err);
  }
};

// A Source is correctable after the fact, every field of it: a title mistyped while filing
// should not have to be lived with, and `kind` is a label that changes no other field, so
// changing it strands nothing (#83, CONTEXT.md, Source). As on create, there is no status.
export const updateSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateSourceInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { title, kind, author, url } = req.body as UpdateSourceRequest;
  try {
    const source = await updateSourceRecord({
      id: sourceId,
      userId: getUserId(req),
      // Validation has established both of these; the cast is the handover from
      // `unknown`-typed body parsing to the validated shape, as on create above.
      ...sanitizeSourceInput({ title: title as string, kind: kind as SourceKind, author, url }),
    });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ source });
  } catch (err) {
    next(err);
  }
};

// Read, guard, delete - the same three steps as deleting a note, in the same order. Deleting a
// Source takes its Literature notes with it (#70); the cascade lives in the foreign key, and
// the orphan guard of ADR 0014 belongs in front of it once Permanent notes exist (#86), where
// it is the same check applied across the batch of notes this Source cascades to.
export const deleteSource = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const sourceId = parseSourceId(req);
  if (sourceId === null) {
    res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const source = await findSourceById({ id: sourceId, userId: getUserId(req) });
    if (!source) {
      res.status(404).json({ error: 'Source not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteSourceRecord({ id: source.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
