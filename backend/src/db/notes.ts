import { and, asc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from './index';
import { notes, Note, NewNote } from './schema';

export type NewLiteratureNoteInput = Omit<
  NewNote,
  'id' | 'kind' | 'title' | 'createdAt' | 'updatedAt'
> & { sourceId: number };

// `kind` is set here rather than passed in: it is fixed at insert, and a Literature note
// never becomes a Permanent one (ADR 0012). `title` is left out of the input type for the
// same reason - the table's CHECK forbids it on this kind.
export const createLiteratureNote = async (input: NewLiteratureNoteInput): Promise<Note> => {
  const [created] = await db
    .insert(notes)
    .values({ ...input, kind: 'literature' })
    .returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// The reading stream: creation order, oldest first, with no reordering and no sorting by
// Locator (#68). Secondary sort by id keeps notes filed within the same clock tick stable.
export const listNotesBySource = async ({
  sourceId,
  userId,
}: {
  sourceId: number;
  userId: number;
}): Promise<Note[]> =>
  db
    .select()
    .from(notes)
    .where(and(eq(notes.sourceId, sourceId), eq(notes.userId, userId)))
    .orderBy(asc(notes.createdAt), asc(notes.id));

// The sections this Source's notes already use, for the capture card's tab suggestions. Most
// recently used first, so the section the user is reading in is the first one offered.
export const listSectionsBySource = async ({
  sourceId,
  userId,
}: {
  sourceId: number;
  userId: number;
}): Promise<string[]> => {
  const rows = await db
    .select({ section: notes.section })
    .from(notes)
    .where(
      and(
        eq(notes.sourceId, sourceId),
        eq(notes.userId, userId),
        isNotNull(notes.section),
        sql`btrim(${notes.section}) <> ''`,
      ),
    )
    .orderBy(sql`max(${notes.createdAt}) desc`)
    .groupBy(notes.section);
  return rows.map((row) => row.section).filter((section): section is string => section !== null);
};
