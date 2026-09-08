import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@nee3/shared-types';
import { validateEmotionalBeatInput } from './validation';
import {
  findEmotionalBeatOwnedByUser,
  updateEmotionalBeat as updateEmotionalBeatRecord,
  deleteEmotionalBeat as deleteEmotionalBeatRecord,
} from '../../db/emotionalBeats';
import { getUserId } from '../../types/request';

const parseId = (req: Request): number | null => {
  const id = Number(req.params.id);
  return Number.isNaN(id) ? null : id;
};

export const updateEmotionalBeat = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Emotional beat not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateEmotionalBeatInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findEmotionalBeatOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Emotional beat not found' } satisfies ApiErrorResponse);
      return;
    }
    const { label } = req.body as { label: string };
    const emotionalBeat = await updateEmotionalBeatRecord({ id, label: label.trim() });
    res.status(200).json({ emotionalBeat });
  } catch (err) {
    next(err);
  }
};

export const deleteEmotionalBeat = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Emotional beat not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findEmotionalBeatOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Emotional beat not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteEmotionalBeatRecord({ id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
