import { and, count, desc, eq } from 'drizzle-orm';
import { db } from './index';
import { entries, Entry, NewEntry } from './schema';

export class DuplicateEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEntryError';
  }
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: unknown }).code === '23505';

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

export type ListEntriesInput = { userId: number; page: number; pageSize: number };
export type EntryPage = { entries: Entry[]; total: number };

export const listEntriesByUser = async ({
  userId,
  page,
  pageSize,
}: ListEntriesInput): Promise<EntryPage> => {
  const offset = (page - 1) * pageSize;
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.date))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(entries).where(eq(entries.userId, userId)),
  ]);
  return { entries: rows, total: totalRows[0]?.value ?? 0 };
};

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
