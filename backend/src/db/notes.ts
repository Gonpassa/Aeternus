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

// A note read by id and owner, narrowed to the Literature kind: the Permanent kind shares this
// id space (ADR 0012), so an id that belongs to one must not be editable through the other's
// endpoint. Another user's id and a wrong-kind id are both simply "not found" here.
export const findLiteratureNoteOwnedByUser = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Note | undefined> => {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId), eq(notes.kind, 'literature')));
  return row;
};

export type UpdateLiteratureNoteInput = {
  id: number;
  userId: number;
  body: string;
  section: string | null;
  position: string | null;
  excerpt: string | null;
  openQuestion: boolean;
};

// Everything a Literature note was written with is editable; `kind` and `sourceId` are not in
// the input, because a note never changes kind and never moves between Sources (ADR 0012).
// Every column is written on every update rather than merged, so an emptied excerpt becomes a
// null column instead of staying as it was.
export const updateLiteratureNote = async ({
  id,
  userId,
  body,
  section,
  position,
  excerpt,
  openQuestion,
}: UpdateLiteratureNoteInput): Promise<Note | undefined> => {
  const [updated] = await db
    .update(notes)
    .set({ body, section, position, excerpt, openQuestion, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId), eq(notes.kind, 'literature')))
    .returning();
  return updated;
};

// The mechanics of removing one note, nothing more. As with a Source, whether the deletion may
// happen is decided in front of this call: the orphan guard of ADR 0014 arrives with #86. The
// owner is still named in the statement itself, so the destructive query is never wider than
// the read that authorised it.
export const deleteNote = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<boolean> => {
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });
  return deleted.length > 0;
};
