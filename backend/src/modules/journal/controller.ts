import { Request, Response, NextFunction } from 'express';
import {
  ApiErrorResponse,
  CreateEntryRequest,
  EntryRangeQuery,
  JournalSummaryResponse,
  PrimaryMood,
  UpdateEntryRequest,
} from '@nee3/shared-types';
import {
  validateEntryInput,
  validateRangeQuery,
  normalizeSpecificEmotion,
  parseAsOf,
  PRIMARY_MOODS,
} from './validation';
import { sanitizeEntryContent } from './sanitize';
import {
  createEntry as createEntryRecord,
  updateEntry as updateEntryRecord,
  deleteEntry as deleteEntryRecord,
  findEntryById,
  findEntryByDate,
  listEntriesByUser,
  listEntriesByRange,
  getJournalSummaryData,
  RecentEntry,
  DuplicateEntryError,
} from '../../db/entries';

const getUserId = (req: Request): number => (req.user as Express.User).id;

const subtractOneDayUTC = (dateStr: string): string => {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const computeStreak = (entryDates: string[], asOf: string): number => {
  const dateSet = new Set(entryDates);
  let cursor = dateSet.has(asOf) ? asOf : subtractOneDayUTC(asOf);
  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    cursor = subtractOneDayUTC(cursor);
  }
  return streak;
};

const buildMoodSnapshot = (recentEntries: RecentEntry[]): Record<PrimaryMood, number> => {
  const snapshot = Object.fromEntries(PRIMARY_MOODS.map((mood) => [mood, 0])) as Record<
    PrimaryMood,
    number
  >;
  recentEntries.forEach((entry) => {
    snapshot[entry.primaryMood] += 1;
  });
  return snapshot;
};

export const listEntries = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const entries = await listEntriesByUser({ userId: getUserId(req) });
    res.status(200).json({ entries });
  } catch (err) {
    next(err);
  }
};

export const getEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const entry = await findEntryById({ id, userId: getUserId(req) });
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const getEntryByDate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { date } = req.params;
  if (!date) {
    res.status(404).json({ error: 'No entry found for this date' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const entry = await findEntryByDate({ userId: getUserId(req), date });
    if (!entry) {
      res.status(404).json({ error: 'No entry found for this date' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const getEntriesByRange = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateRangeQuery(req.query);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { start, end } = req.query as unknown as EntryRangeQuery;
  try {
    const rangeEntries = await listEntriesByRange({ userId: getUserId(req), start, end });
    res.status(200).json(rangeEntries);
  } catch (err) {
    next(err);
  }
};

export const createEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateEntryInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, title, primaryMood, specificEmotion, content } = req.body as CreateEntryRequest;
  try {
    const entry = await createEntryRecord({
      userId: getUserId(req),
      date,
      title,
      primaryMood,
      specificEmotion: normalizeSpecificEmotion(specificEmotion),
      content: sanitizeEntryContent(content),
    });
    res.status(201).json({ entry });
  } catch (err) {
    if (err instanceof DuplicateEntryError) {
      res.status(409).json({ error: err.message } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

export const updateEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateEntryInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  const { date, title, primaryMood, specificEmotion, content } = req.body as UpdateEntryRequest;
  try {
    const entry = await updateEntryRecord({
      id,
      userId: getUserId(req),
      date,
      title,
      primaryMood,
      specificEmotion: normalizeSpecificEmotion(specificEmotion),
      content: sanitizeEntryContent(content),
    });
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    if (err instanceof DuplicateEntryError) {
      res.status(409).json({ error: err.message } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

export const deleteEntry = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const deleted = await deleteEntryRecord({ id, userId: getUserId(req) });
    if (!deleted) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const getJournalSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const asOfResult = parseAsOf(req.query);
  if (!asOfResult.valid) {
    res.status(400).json({ error: asOfResult.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const { recentEntries, entryDates } = await getJournalSummaryData({
      userId: getUserId(req),
      asOf: asOfResult.asOf,
    });
    const response: JournalSummaryResponse = {
      recentEntries,
      streak: { current: computeStreak(entryDates, asOfResult.asOf) },
      moodSnapshot: buildMoodSnapshot(recentEntries),
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
};
