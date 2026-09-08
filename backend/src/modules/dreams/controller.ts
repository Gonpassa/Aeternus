import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, CreateDreamRequest } from '@nee3/shared-types';
import { validateDreamInput } from './validation';
import { sanitizeDreamNarrative } from './sanitize';
import { createDream as createDreamRecord, listDreamsByUser } from '../../db/dreams';

const getUserId = (req: Request): number => (req.user as Express.User).id;

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
