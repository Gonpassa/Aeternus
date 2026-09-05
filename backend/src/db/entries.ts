import { and, asc, desc, eq, gt, gte, lt, lte } from 'drizzle-orm';
import { db } from './index';
import { entries, Entry, NewEntry } from './schema';

export class DuplicateEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEntryError';
  }
}

const hasUniqueViolationCode = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: unknown }).code === '23505';

const isUniqueViolation = (err: unknown): boolean =>
  hasUniqueViolationCode(err) ||
  (err instanceof Error && hasUniqueViolationCode((err as { cause?: unknown }).cause));

export type NewEntryInput = Omit<NewEntry, 'id' | 'createdAt' | 'updatedAt'>;

export const createEntry = async (input: NewEntryInput): Promise<Entry> => {
  try {
    const [created] = await db.insert(entries).values(input).returning();
    if (!created) {
      throw new Error('Insert did not return a row');
    }
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DuplicateEntryError('An entry already exists for this date');
    }
    throw err;
  }
};

export const listEntriesByUser = async ({ userId }: { userId: number }): Promise<Entry[]> =>
  db.select().from(entries).where(eq(entries.userId, userId)).orderBy(desc(entries.date));

export const findEntryById = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Entry | undefined> => {
  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)));
  return row;
};

export const findEntryByDate = async ({
  userId,
  date,
}: {
  userId: number;
  date: string;
}): Promise<Entry | undefined> => {
  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), eq(entries.date, date)));
  return row;
};

export type ChronologicalNeighborIds = {
  nextEntryId: number | null;
  previousEntryId: number | null;
};

// Resolves the requesting user's chronological neighbor entries for a given date - the
// entry with the next-later date (nextEntryId) and the entry with the next-earlier date
// (previousEntryId). Scoped to (userId, date), which already carries a unique constraint,
// so both lookups stay effectively constant-cost regardless of the user's total entry count.
// See docs/adr/0006-entry-navigation-adjacency-query.md.
export const findChronologicalNeighborIds = async ({
  userId,
  date,
}: {
  userId: number;
  date: string;
}): Promise<ChronologicalNeighborIds> => {
  const [[nextRow], [previousRow]] = await Promise.all([
    db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.userId, userId), gt(entries.date, date)))
      .orderBy(asc(entries.date))
      .limit(1),
    db
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.userId, userId), lt(entries.date, date)))
      .orderBy(desc(entries.date))
      .limit(1),
  ]);
  return {
    nextEntryId: nextRow?.id ?? null,
    previousEntryId: previousRow?.id ?? null,
  };
};

export type UpdateEntryInput = { id: number; userId: number } & Omit<
  NewEntry,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export const updateEntry = async ({
  id,
  userId,
  ...rest
}: UpdateEntryInput): Promise<Entry | undefined> => {
  try {
    const [updated] = await db
      .update(entries)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DuplicateEntryError('An entry already exists for this date');
    }
    throw err;
  }
};

export const deleteEntry = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<boolean> => {
  const deleted = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return deleted.length > 0;
};

export type ListEntriesByRangeInput = { userId: number; start: string; end: string };

export const listEntriesByRange = async ({
  userId,
  start,
  end,
}: ListEntriesByRangeInput): Promise<Entry[]> =>
  db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.date, start), lte(entries.date, end)))
    .orderBy(desc(entries.date));

const STREAK_LOOKBACK_LIMIT = 366;
const RECENT_ENTRIES_LIMIT = 5;

export type RecentEntry = Pick<Entry, 'id' | 'date' | 'title' | 'primaryMood'>;
export type JournalSummaryData = { recentEntries: RecentEntry[]; entryDates: string[] };

export const getJournalSummaryData = async ({
  userId,
  asOf,
}: {
  userId: number;
  asOf: string;
}): Promise<JournalSummaryData> => {
  const scope = and(eq(entries.userId, userId), lte(entries.date, asOf));
  const [recentEntries, dateRows] = await Promise.all([
    db
      .select({
        id: entries.id,
        date: entries.date,
        title: entries.title,
        primaryMood: entries.primaryMood,
      })
      .from(entries)
      .where(scope)
      .orderBy(desc(entries.date))
      .limit(RECENT_ENTRIES_LIMIT),
    db
      .select({ date: entries.date })
      .from(entries)
      .where(scope)
      .orderBy(desc(entries.date))
      .limit(STREAK_LOOKBACK_LIMIT),
  ]);
  return { recentEntries, entryDates: dateRows.map((row) => row.date) };
};
