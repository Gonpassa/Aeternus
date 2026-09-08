import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, CreateDreamRequest, UpdateDreamRequest } from '@nee3/shared-types';
import { validateDreamInput } from './validation';
import { sanitizeDreamNarrative } from './sanitize';
import {
  createDream as createDreamRecord,
  listDreamsByUser,
  findDreamById,
  updateDream as updateDreamRecord,
} from '../../db/dreams';
import { createAnchor as createAnchorRecord, listAnchorsByDream } from '../../db/anchors';
import { listEmotionalBeatsByAnchors } from '../../db/emotionalBeats';
import { getUserId } from '../../types/request';

const parseDreamId = (req: Request): number | null => {
  const id = Number(req.params.dreamId);
  return Number.isNaN(id) ? null : id;
};

export const listDreams = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dreams = await listDreamsByUser({ userId: getUserId(req) });
    res.status(200).json({ dreams });
  } catch (err) {
    next(err);
  }
};

export const createDream = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateDreamInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, narrative } = req.body as CreateDreamRequest;
  try {
    const dream = await createDreamRecord({
      userId: getUserId(req),
      date,
      narrative: sanitizeDreamNarrative(narrative),
    });
    res.status(201).json({ dream });
  } catch (err) {
    next(err);
  }
};

export const getDream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const dream = await findDreamById({ id: dreamId, userId: getUserId(req) });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    const dreamAnchors = await listAnchorsByDream({ dreamId });
    const beats = await listEmotionalBeatsByAnchors({
      anchorIds: dreamAnchors.map((anchor) => anchor.id),
    });
    const anchors = dreamAnchors.map((anchor) => ({
      ...anchor,
      emotionalBeats: beats.filter((beat) => beat.anchorId === anchor.id),
    }));
    res.status(200).json({ dream, anchors });
  } catch (err) {
    next(err);
  }
};

export const updateDream = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateDreamInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, narrative } = req.body as UpdateDreamRequest;
  try {
    const dream = await updateDreamRecord({
      id: dreamId,
      userId: getUserId(req),
      date,
      narrative: sanitizeDreamNarrative(narrative),
    });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ dream });
  } catch (err) {
    next(err);
  }
};

export const createAnchor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const dream = await findDreamById({ id: dreamId, userId: getUserId(req) });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    const anchor = await createAnchorRecord({ dreamId });
    res.status(201).json({ anchor });
  } catch (err) {
    next(err);
  }
};
