import { and, asc, eq, inArray, notExists, notInArray, or } from 'drizzle-orm';
import { db } from './index';
import { links, notes, sources, Link, Note, Topic } from './schema';
import { setNoteTopics } from './topics';

// A target named in a create request that is not one of this user's notes. Raised rather than
// returned so the transaction rolls back on the way out: the note and its Links are created
// together or not at all (ADR 0014).
export class UnknownLinkTargetError extends Error {
  constructor() {
    super('Link target is not one of this user’s notes');
    this.name = 'UnknownLinkTargetError';
  }
}

export interface LinkDraftInput {
  targetNoteId: number;
  reason: string;
}

export interface NewPermanentNoteInput {
  userId: number;
  title: string;
  body: string;
  linkDrafts: LinkDraftInput[];
  // The Topics the note is filed under, by name. Inside the same transaction as the note and
  // its Links: a Topic typed in the composer is part of writing the note, not a second step
  // that could half-succeed (#87, ADR 0014).
  topicNames: string[];
}

// The one write path for a Permanent note, and it carries the first Links with it. There is no
// function here that inserts a bare Permanent note, because there is no moment at which one is
// allowed to exist (ADR 0014): the note and its Links go in inside one transaction, so a
// failure on either leaves neither.
export const createPermanentNoteWithLinks = async ({
  userId,
  title,
  body,
  linkDrafts,
  topicNames,
}: NewPermanentNoteInput): Promise<{ note: Note; links: Link[]; topics: Topic[] }> =>
  db.transaction(async (tx) => {
    const targetIds = [...new Set(linkDrafts.map((draft) => draft.targetNoteId))];
    // The targets are checked against this user's notes before anything is written, so another
    // user's note id answers as an unknown target rather than failing on the foreign key.
    const owned = await tx
      .select({ id: notes.id })
      .from(notes)
      .where(and(inArray(notes.id, targetIds), eq(notes.userId, userId)));
    if (owned.length !== targetIds.length) {
      throw new UnknownLinkTargetError();
    }
    const [note] = await tx
      .insert(notes)
      // `kind` is fixed at insert, and the table's CHECKs are what hold the rest of the shape:
      // a Permanent note carries no Source, excerpt or Locator, so none is passed (ADR 0012).
      .values({ userId, kind: 'permanent', title, body })
      .returning();
    if (!note) {
      throw new Error('Insert did not return a row');
    }
    const created = await tx
      .insert(links)
      .values(
        linkDrafts.map((draft) => ({
          originNoteId: note.id,
          targetNoteId: draft.targetNoteId,
          reason: draft.reason,
        })),
      )
      .returning();
    const topics = await setNoteTopics({
      userId,
      noteId: note.id,
      names: topicNames,
      executor: tx,
    });
    return { note, links: created, topics };
  });

// One row of a connections view, as it comes out of the database: the Link, the note at the
// other end, and that note's Source title when it has one. A Literature note has no title of
// its own, so the Source title is what a connections row names it by alongside its Locator and
// opening words (CONTEXT.md, Literature note).
export interface ConnectionRow {
  link: Link;
  other: Note;
  sourceTitle: string | null;
}

export interface ConnectionRows {
  connectsTo: ConnectionRow[];
  connectedFrom: ConnectionRow[];
}

// Direction is read off the row rather than stored as a flag: a Link whose origin is this note
// is outbound, one whose target is this note is inbound (ADR 0013). Hence two queries over the
// same shape rather than one with a case analysis in it.
const selectConnections = async ({
  noteIds,
  userId,
  direction,
}: {
  noteIds: number[];
  userId: number;
  direction: 'outbound' | 'inbound';
}) => {
  const [own, other] =
    direction === 'outbound'
      ? [links.originNoteId, links.targetNoteId]
      : [links.targetNoteId, links.originNoteId];
  return (
    db
      .select({ link: links, other: notes, sourceTitle: sources.title, ownNoteId: own })
      .from(links)
      .innerJoin(notes, eq(notes.id, other))
      .leftJoin(sources, eq(sources.id, notes.sourceId))
      .where(and(inArray(own, noteIds), eq(notes.userId, userId)))
      // Creation order, oldest first, as every other list in this module reads.
      .orderBy(asc(links.createdAt), asc(links.id))
  );
};

// Connections for a batch of notes in two queries rather than two per note, because the
// reading page asks for every card's connections at once. A note with none gets empty groups:
// absence of Links is not an error and not a missing key.
export const listConnectionsByNoteIds = async ({
  noteIds,
  userId,
}: {
  noteIds: number[];
  userId: number;
}): Promise<Map<number, ConnectionRows>> => {
  const grouped = new Map<number, ConnectionRows>(
    noteIds.map((id) => [id, { connectsTo: [], connectedFrom: [] }]),
  );
  if (noteIds.length === 0) {
    return grouped;
  }
  const [outbound, inbound] = await Promise.all([
    selectConnections({ noteIds, userId, direction: 'outbound' }),
    selectConnections({ noteIds, userId, direction: 'inbound' }),
  ]);
  outbound.forEach(({ link, other, sourceTitle, ownNoteId }) => {
    grouped.get(ownNoteId)?.connectsTo.push({ link, other, sourceTitle });
  });
  inbound.forEach(({ link, other, sourceTitle, ownNoteId }) => {
    grouped.get(ownNoteId)?.connectedFrom.push({ link, other, sourceTitle });
  });
  return grouped;
};

// Every Link one note is an end of, in either direction. Read in one query so the panel can
// mark its candidates with the Link that already connects them without asking per row: there
// is at most one Link per unordered pair, so the other end's id identifies it (ADR 0013).
export const listLinksForNote = async ({ noteId }: { noteId: number }): Promise<Link[]> =>
  db
    .select()
    .from(links)
    .where(or(eq(links.originNoteId, noteId), eq(links.targetNoteId, noteId)))
    .orderBy(asc(links.createdAt), asc(links.id));

// A Link read by id, with ownership established through the note at its origin: a Link carries
// no user of its own, and both of its ends are always the same user's notes.
export const findLinkById = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Link | undefined> => {
  const [row] = await db
    .select({ link: links })
    .from(links)
    .innerJoin(notes, eq(notes.id, links.originNoteId))
    .where(and(eq(links.id, id), eq(notes.userId, userId)));
  return row?.link;
};

// The unordered pair, matched in both directions. Uniqueness of the pair is a functional
// index over least/greatest, so this is how the application finds the Link that index would
// have refused a second of (ADR 0013).
const samePair = (a: number, b: number) =>
  or(
    and(eq(links.originNoteId, a), eq(links.targetNoteId, b)),
    and(eq(links.originNoteId, b), eq(links.targetNoteId, a)),
  );

export interface NewLinkInput {
  userId: number;
  originNoteId: number;
  targetNoteId: number;
  reason: string;
}

// The panel's write: a Link between two notes that both already exist, where the Permanent
// note composer's write creates the note and its Links together (ADR 0014).
//
// The pair is looked for in both directions before anything is inserted, because the unordered
// -pair uniqueness is a functional index and the user-facing move on a pair that is already
// linked is to add this end's reason to the Link that is there rather than to catch a
// constraint violation (ADR 0013). `created` is false in that case, so the caller can answer
// "here is the Link you already have" instead of "here is a new one".
export const createLink = async ({
  userId,
  originNoteId,
  targetNoteId,
  reason,
}: NewLinkInput): Promise<{ link: Link; created: boolean }> =>
  db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: notes.id })
      .from(notes)
      .where(and(inArray(notes.id, [originNoteId, targetNoteId]), eq(notes.userId, userId)));
    if (owned.length !== 2) {
      throw new UnknownLinkTargetError();
    }
    const [existing] = await tx.select().from(links).where(samePair(originNoteId, targetNoteId));
    if (existing) {
      // Which column this end owns is read off the row: the origin's reason is `reason`, the
      // other end's is `targetReason`, and each end edits only its own (ADR 0013).
      const linkingBack = existing.originNoteId !== originNoteId;
      const [updated] = await tx
        .update(links)
        .set(
          linkingBack
            ? { targetReason: reason, updatedAt: new Date() }
            : { reason, updatedAt: new Date() },
        )
        .where(eq(links.id, existing.id))
        .returning();
      if (!updated) {
        throw new Error('Update did not return a row');
      }
      return { link: updated, created: false };
    }
    const [created] = await tx
      .insert(links)
      .values({ originNoteId, targetNoteId, reason })
      .returning();
    if (!created) {
      throw new Error('Insert did not return a row');
    }
    return { link: created, created: true };
  });

// A reason edited in place by the end that wrote it. The end names the column rather than the
// caller passing one, so nothing outside this module has to know which is whose.
export const updateLinkReason = async ({
  id,
  end,
  reason,
}: {
  id: number;
  end: 'origin' | 'target';
  reason: string;
}): Promise<Link | undefined> => {
  const [updated] = await db
    .update(links)
    .set(end === 'origin' ? { reason, updatedAt: new Date() } : { targetReason: reason, updatedAt: new Date() })
    .where(eq(links.id, id))
    .returning();
  return updated;
};

// The mechanics of removing one Link, nothing more: whether the removal may happen is decided
// in front of this call by the orphan guard below, as everywhere else in this module
// (ADR 0012).
export const deleteLink = async ({ id }: { id: number }): Promise<boolean> => {
  const deleted = await db.delete(links).where(eq(links.id, id)).returning({ id: links.id });
  return deleted.length > 0;
};

// A Permanent note that a removal would leave with no Link at all, named so the refusal can
// say which idea it is protecting (ADR 0014).
export interface UnlinkedPermanentNote {
  id: number;
  title: string;
}

// The mandatory-Link guard of ADR 0014, in one place: given the notes whose Links are about to
// change and the Links about to disappear, it answers which Permanent notes among them would
// be left with none. The count is taken in either direction, since a Permanent note reachable
// only from another note's Links is linked.
//
// Stated as "which of these notes would end at zero" rather than "does this Link's removal
// orphan anything", so that the deletion guards - a note, a Source's whole batch of notes
// (#86) - run the same check by passing the Links their own cascade would take.
export const findPermanentNotesLeftUnlinked = async ({
  noteIds,
  userId,
  removedLinkIds,
}: {
  noteIds: number[];
  userId: number;
  removedLinkIds: number[];
}): Promise<UnlinkedPermanentNote[]> => {
  if (noteIds.length === 0) {
    return [];
  }
  const survivingLink = db
    .select({ id: links.id })
    .from(links)
    .where(
      and(
        or(eq(links.originNoteId, notes.id), eq(links.targetNoteId, notes.id)),
        removedLinkIds.length === 0 ? undefined : notInArray(links.id, removedLinkIds),
      ),
    );
  const rows = await db
    .select({ id: notes.id, title: notes.title })
    .from(notes)
    .where(
      and(
        inArray(notes.id, noteIds),
        eq(notes.userId, userId),
        eq(notes.kind, 'permanent'),
        notExists(survivingLink),
      ),
    )
    .orderBy(asc(notes.id));
  // `title` is NOT NULL on this kind by CHECK constraint; the fallback is the type system's
  // handover from a nullable column rather than a case that occurs.
  return rows.map((row) => ({ id: row.id, title: row.title ?? '' }));
};
