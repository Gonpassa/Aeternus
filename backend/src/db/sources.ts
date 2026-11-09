import { and, count, desc, eq, max, sql } from 'drizzle-orm';
import { db } from './index';
import { notes, sources, Source, NewSource } from './schema';

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
// is active. Unlike a status left unmaintained, a derived signal cannot go stale.
export type SourceWithNoteSummary = Source & { noteCount: number; lastNoteAt: string | null };

// Ordered by most recent Literature note, Sources with none last; within each band, most
// recently added first, which keeps a Source visible in the catalog the moment it is filed.
// Secondary sort by id keeps Sources added within the same clock tick in a stable order.
export const listSourcesByUser = async ({
  userId,
}: {
  userId: number;
}): Promise<SourceWithNoteSummary[]> => {
  const rows = await db
    .select({
      source: sources,
      noteCount: count(notes.id),
      lastNoteAt: max(notes.createdAt),
    })
    .from(sources)
    .leftJoin(notes, eq(notes.sourceId, sources.id))
    .where(eq(sources.userId, userId))
    .groupBy(sources.id)
    .orderBy(
      sql`max(${notes.createdAt}) desc nulls last`,
      desc(sources.createdAt),
      desc(sources.id),
    );
  return rows.map(({ source, noteCount, lastNoteAt }) => ({
    ...source,
    noteCount,
    // Serialized here rather than left to JSON.stringify so the field's type is the same
    // whether it came off this query or out of a response body.
    lastNoteAt: lastNoteAt === null ? null : new Date(lastNoteAt).toISOString(),
  }));
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

export type UpdateSourceInput = { id: number; userId: number } & NewSourceInput;

// Every field a Source has is editable, `kind` included: it is a label that changes no other
// field, so nothing is stranded by the change (#83, CONTEXT.md, Source).
export const updateSource = async ({
  id,
  userId,
  title,
  kind,
  author,
  url,
}: UpdateSourceInput): Promise<Source | undefined> => {
  const [updated] = await db
    .update(sources)
    .set({ title, kind, author, url, updatedAt: new Date() })
    .where(and(eq(sources.id, id), eq(sources.userId, userId)))
    .returning();
  return updated;
};

// The cascade, and only the cascade: deleting a Source takes its Literature notes with it
// through the foreign key's ON DELETE CASCADE (#70). Whether the deletion may happen at all
// is decided before this is called - the orphan guard of ADR 0014 sits in front of this
// function rather than inside it (ADR 0012).
export const deleteSource = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<boolean> => {
  const deleted = await db
    .delete(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, userId)))
    .returning({ id: sources.id });
  return deleted.length > 0;
};
