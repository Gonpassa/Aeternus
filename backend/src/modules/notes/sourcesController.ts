import { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse, CreateSourceRequest, SourceKind } from '@nee3/shared-types';
import { validateSourceInput } from './validation';
import { sanitizeSourceInput } from './sanitize';
import {
  createSource as createSourceRecord,
  findSourceById,
  listSourcesByUser,
} from '../../db/sources';
import { getUserId } from '../../types/request';

// Held to a whole positive number rather than merely to "not NaN": the column is an
// integer, so `/sources/Infinity` would otherwise reach the query as a bind parameter and
// come back as a 500 where the honest answer is that there is no such Source.
const parseSourceId = (req: Request): number | null => {
  const id = Number(req.params.sourceId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

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

// The reading page's payload. It carries the Source alone for now: its Literature notes, its
// Topics and the capture form's section list fold in with their own tickets (#65).
export const getSource = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    res.status(200).json({ source });
  } catch (err) {
    next(err);
  }
};
