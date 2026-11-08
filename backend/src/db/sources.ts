import { and, desc, eq } from 'drizzle-orm';
import { db } from './index';
import { sources, Source, NewSource } from './schema';

export type NewSourceInput = Omit<NewSource, 'id' | 'createdAt' | 'updatedAt'>;

export const createSource = async (input: NewSourceInput): Promise<Source> => {
  const [created] = await db.insert(sources).values(input).returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// The note count and the last-note date are derived per request, never stored (#70): a
// Source has no status, and the recency of its Literature notes is the only signal that it
// is active. Both are constant here because the `notes` table arrives with the capture
// ticket - there is no Literature note anywhere yet, so every Source genuinely has none.
// When that table lands, these two come off a left join and the ordering below gains its
// first band; the response shape the client reads does not change.
export type SourceWithNoteSummary = Source & { noteCount: number; lastNoteAt: string | null };

// Ordered by most recent Literature note, Sources with none last. Every Source is currently
// in that second band, so this is its tie-break: most recently added first, which keeps a
// Source visible in the catalog the moment it is filed. Secondary sort by id keeps Sources
// added within the same clock tick in a stable order.
export const listSourcesByUser = async ({
  userId,
}: {
  userId: number;
}): Promise<SourceWithNoteSummary[]> => {
  const rows = await db
    .select()
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(desc(sources.createdAt), desc(sources.id));
  return rows.map((row) => ({ ...row, noteCount: 0, lastNoteAt: null }));
};

export const findSourceById = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Source | undefined> => {
  const [row] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, userId)));
  return row;
};
