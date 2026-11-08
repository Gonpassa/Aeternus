import { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse, CreateSourceRequest, SourceKind } from '@nee3/shared-types';
import { validateSourceInput } from './validation';
import { sanitizeSourceInput } from './sanitize';
import {
  createSource as createSourceRecord,
  findSourceById,
  listSourcesByUser,
} from '../../db/sources';
import { listNotesBySource, listSectionsBySource } from '../../db/notes';
import { listConnectionsByNoteIds } from '../../db/links';
import { EMPTY_CONNECTIONS, toConnections, toLiteratureNote } from './serialize';
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

// The reading page's payload, in one request: the Source, its notes oldest-first with the
// connections each is read with, and the distinct sections of those notes for the capture
// card's tab suggestions. Both are folded in here rather than given their own endpoints so
// capture never waits on a second round trip and no card fetches its own Links (#72). Topics
// fold in with their own ticket.
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
    // Every card's connections in two queries rather than two per card: the stream asks for
    // all of them at once, and a note with no Links gets empty groups rather than no key.
    const connections = await listConnectionsByNoteIds({
      noteIds: rows.map((row) => row.id),
      userId,
    });
    const notes = rows.map((row) => {
      const rowConnections = connections.get(row.id);
      return {
        ...toLiteratureNote(row),
        connections: rowConnections ? toConnections(rowConnections) : EMPTY_CONNECTIONS,
      };
    });
    res.status(200).json({ source, notes, sections });
  } catch (err) {
    next(err);
  }
};
