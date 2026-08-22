import { sql } from 'drizzle-orm';
import { runMigrations } from './migrate';
import { db, pool } from './index';
import { createUser } from './users';
import { Entry } from './schema';
import {
  createEntry,
  listEntriesByUser,
  listEntriesByRange,
  findEntryById,
  findEntryByDate,
  updateEntry,
  deleteEntry,
  getJournalSummaryData,
  DuplicateEntryError,
} from './entries';

describe('entry service', () => {
  let userId: number;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE entries, users RESTART IDENTITY CASCADE`);
    const user = await createUser('alice', 'alice@example.com', 'secret123');
    userId = user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  const baseInput = {
    date: '2026-08-01',
    title: 'A good day',
    primaryMood: 'happy' as const,
    specificEmotion: 'content' as const,
    content: '<p>Hello</p>',
  };

  it('creates an entry scoped to the user', async () => {
    const entry = await createEntry({ userId, ...baseInput });
    expect(entry.title).toBe('A good day');
    expect(entry.userId).toBe(userId);
  });

  it('throws DuplicateEntryError for a second entry on the same date', async () => {
    await createEntry({ userId, ...baseInput });
    await expect(createEntry({ userId, ...baseInput, title: 'Different title' })).rejects.toThrow(
      DuplicateEntryError,
    );
  });

  it('lists entries for a user in reverse-chronological order with a total count', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    await createEntry({ userId, ...baseInput, date: '2026-08-03' });
    await createEntry({ userId, ...baseInput, date: '2026-08-02' });

    const { entries, total } = await listEntriesByUser({ userId, page: 1, pageSize: 20 });
    expect(total).toBe(3);
    expect(entries.map((e) => e.date)).toEqual(['2026-08-03', '2026-08-02', '2026-08-01']);
  });

  it('finds an entry by id scoped to the owning user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const found = await findEntryById({ id: created.id, userId });
    expect(found?.title).toBe('A good day');

    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const notFound = await findEntryById({ id: created.id, userId: otherUser.id });
    expect(notFound).toBeUndefined();
  });

  it('finds an entry by date scoped to the owning user', async () => {
    await createEntry({ userId, ...baseInput });
    const found = await findEntryByDate({ userId, date: '2026-08-01' });
    expect(found?.title).toBe('A good day');
    const notFound = await findEntryByDate({ userId, date: '2026-08-02' });
    expect(notFound).toBeUndefined();
  });

  it('updates an entry scoped to the owning user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const updated = await updateEntry({
      id: created.id,
      userId,
      ...baseInput,
      title: 'Updated title',
    });
    expect(updated?.title).toBe('Updated title');
  });

  it('returns undefined when updating an entry owned by another user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const result = await updateEntry({
      id: created.id,
      userId: otherUser.id,
      ...baseInput,
      title: 'Hacked',
    });
    expect(result).toBeUndefined();
  });

  it('deletes an entry scoped to the owning user and reports success', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const deleted = await deleteEntry({ id: created.id, userId });
    expect(deleted).toBe(true);
    expect(await findEntryById({ id: created.id, userId })).toBeUndefined();
  });

  it('returns false when deleting an entry owned by another user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const deleted = await deleteEntry({ id: created.id, userId: otherUser.id });
    expect(deleted).toBe(false);
  });

  it('lists entries within an inclusive date range, sorted ascending, scoped to the user', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    await createEntry({ userId, ...baseInput, date: '2026-08-15' });
    await createEntry({ userId, ...baseInput, date: '2026-08-31' });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    await createEntry({ userId: otherUser.id, ...baseInput, date: '2026-08-15' });

    const result = await listEntriesByRange({ userId, start: '2026-08-01', end: '2026-08-15' });

    expect(result.map((e: Entry) => e.date)).toEqual(['2026-08-01', '2026-08-15']);
  });

  it('returns an empty array when nothing falls in range', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    const result = await listEntriesByRange({ userId, start: '2026-09-01', end: '2026-09-30' });
    expect(result).toEqual([]);
  });

  it('excludes entries dated after asOf from the journal summary data', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    await createEntry({ userId, ...baseInput, date: '2026-08-15' });
    await createEntry({ userId, ...baseInput, date: '2026-08-31' });

    const result = await getJournalSummaryData({ userId, asOf: '2026-08-15' });

    expect(result.recentEntries.map((e) => e.date)).toEqual(['2026-08-15', '2026-08-01']);
    expect(result.entryDates).toEqual(['2026-08-15', '2026-08-01']);
  });
});
