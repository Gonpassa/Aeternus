import { and, asc, eq, inArray } from 'drizzle-orm';
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
