import { and, asc, desc, eq, ilike, inArray, ne, notInArray, or, sql } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';
import { db } from './index';
import {
  links,
  noteTopics,
  notes,
  sourceTopics,
  sources,
  topics,
  Note,
  Source,
  Topic,
} from './schema';

// The transactional executor `db.transaction` hands its callback. Every function here takes one
// so attaching Topics can join the transaction that creates their carrier - a Permanent note and
// its Topics are written together or not at all - while a plain call passes `db` itself.
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

// Escape LIKE wildcards in user-typed autocomplete input so it matches literally.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export interface TopicWithCounts extends Topic {
  permanentNoteCount: number;
  sourceCount: number;
}

// How many carriers wear a Topic, counted per row rather than joined and grouped: a Topic has
// two kinds of carrier, and one join over both would multiply the counts by each other. The
// vocabulary is one user's own words, so it is tens of rows and these subqueries are cheap.
const carrierCount = (join: typeof noteTopics | typeof sourceTopics) =>
  db
    .select({ count: sql<number>`count(*)` })
    .from(join)
    .where(eq(join.topicId, topics.id));

// Only a Permanent note carries a Topic of its own - a Literature note inherits its Source's
// (ADR 0012, which makes that a composite foreign key). The predicate is still spelled out
// wherever the count or the list claims to be of Permanent notes, so the claim is true of the
// query rather than only of the write path.
const permanentNoteCount = db
  .select({ count: sql<number>`count(*)` })
  .from(noteTopics)
  .where(and(eq(noteTopics.topicId, topics.id), eq(noteTopics.noteKind, 'permanent')));

const topicWithCountsColumns = {
  id: topics.id,
  userId: topics.userId,
  name: topics.name,
  createdAt: topics.createdAt,
  permanentNoteCount: sql<number>`(${permanentNoteCount})`.mapWith(Number),
  sourceCount: sql<number>`(${carrierCount(sourceTopics)})`.mapWith(Number),
};

// The user's whole Topic vocabulary, for autocomplete, with an optional q matched
// case-insensitively against any part of a name. A Topic nobody carries any more is still in
// here: the word was chosen deliberately, and it leaves the vocabulary only when deleted
// outright (CONTEXT.md, Topic - deletion itself is #88).
export const listTopicsByUser = async ({
  userId,
  query,
}: {
  userId: number;
  query?: string;
}): Promise<TopicWithCounts[]> => {
  const conditions = [eq(topics.userId, userId)];
  if (query) {
    conditions.push(ilike(topics.name, `%${escapeLikePattern(query)}%`));
  }
  return db
    .select(topicWithCountsColumns)
    .from(topics)
    .where(and(...conditions))
    .orderBy(topics.name);
};

// One Topic by id, scoped to its owner, so another user's id answers as a Topic that is not
// there rather than as one with no carriers.
export const findTopicById = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<TopicWithCounts | undefined> => {
  const [topic] = await db
    .select(topicWithCountsColumns)
    .from(topics)
    .where(and(eq(topics.id, id), eq(topics.userId, userId)));
  return topic;
};

export interface TopicCarrierRows {
  permanentNotes: Array<{ note: Note; linkCount: number }>;
  sources: Source[];
}

// What a Topic collects (CONTEXT.md, Topic view): the Permanent notes carrying it, most-linked
// first, and then the Sources carrying it. Literature notes are deliberately absent - they
// inherit their Source's Topics, so listing them here would repeat every Source's whole
// reading and bury the ideas the view exists to show.
export const listTopicCarriers = async ({
  topicId,
  userId,
}: {
  topicId: number;
  userId: number;
}): Promise<TopicCarrierRows> => {
  // Links at either end count the same: a Link is one connection between two notes, and which
  // end wrote it first says nothing about how connected the note is (ADR 0013).
  const linkCount = db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .where(or(eq(links.originNoteId, notes.id), eq(links.targetNoteId, notes.id)));

  const permanentNotes = await db
    .select({ note: notes, linkCount: sql<number>`(${linkCount})`.mapWith(Number) })
    .from(noteTopics)
    .innerJoin(notes, eq(notes.id, noteTopics.noteId))
    .where(
      and(
        eq(noteTopics.topicId, topicId),
        eq(noteTopics.noteKind, 'permanent'),
        eq(notes.userId, userId),
      ),
    )
    // Most-linked first - the uncurated front door, with no pinned entry note above it (#88) -
    // then newest first among notes tied on count, so the order is total and stable.
    .orderBy(desc(sql`(${linkCount})`), desc(notes.createdAt), asc(notes.id));

  const carryingSources = await db
    .select({ source: sources })
    .from(sourceTopics)
    .innerJoin(sources, eq(sources.id, sourceTopics.sourceId))
    .where(and(eq(sourceTopics.topicId, topicId), eq(sources.userId, userId)))
    // By title: a Source has no lifecycle to order by here, and the reading page's own
    // recency ordering belongs to the catalog rather than to a Topic's shelf.
    .orderBy(asc(sources.title), asc(sources.id));

  return { permanentNotes, sources: carryingSources.map((row) => row.source) };
};

// Renaming is also the merge: a name that already belongs to another of this user's Topics
// folds this one into it, because two Topics meaning the same word are one Topic
// (CONTEXT.md, Topic). `merged` says which of the two happened, and `topic` is the survivor.
// Undefined means there is no such Topic of this user's.
export const renameTopic = async ({
  topicId,
  userId,
  name,
  merge = false,
}: {
  topicId: number;
  userId: number;
  name: string;
  // Whether the caller agreed to a merge. A rename into a name another Topic already wears is
  // the merge (CONTEXT.md, Topic), and because it takes one of the two out of the vocabulary it
  // is not performed on an unconfirmed request: `conflict` is returned instead so the caller can
  // ask first.
  merge?: boolean;
}): Promise<{ topic: Topic; merged: boolean } | { conflict: Topic } | undefined> =>
  db.transaction(async (tx) => {
    const [own] = await tx
      .select()
      .from(topics)
      .where(and(eq(topics.id, topicId), eq(topics.userId, userId)));
    if (!own) return undefined;

    const [existing] = await tx
      .select()
      .from(topics)
      .where(
        and(
          eq(topics.userId, userId),
          ne(topics.id, topicId),
          sql`lower(${topics.name}) = lower(${name})`,
        ),
      );

    // No other Topic wears the name, so this is a plain rename - including a rename that only
    // changes the casing of the Topic's own name, which the unique index allows because the
    // row excluded above is this one.
    if (!existing) {
      const [renamed] = await tx
        .update(topics)
        .set({ name })
        .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
        .returning();
      if (!renamed) {
        throw new Error('Topic rename did not return a row');
      }
      return { topic: renamed, merged: false };
    }

    if (!merge) {
      return { conflict: existing };
    }

    // The merge: every carrier of this Topic is moved onto the one that already has the name,
    // and this row goes. A carrier already wearing both ends up wearing it once, which is what
    // the unique index per pair means (ADR 0012).
    const carriedNotes = await tx
      .select({ noteId: noteTopics.noteId, noteKind: noteTopics.noteKind })
      .from(noteTopics)
      .where(eq(noteTopics.topicId, topicId));
    if (carriedNotes.length > 0) {
      await tx
        .insert(noteTopics)
        .values(carriedNotes.map((row) => ({ ...row, topicId: existing.id })))
        .onConflictDoNothing();
    }
    const carryingSources = await tx
      .select({ sourceId: sourceTopics.sourceId })
      .from(sourceTopics)
      .where(eq(sourceTopics.topicId, topicId));
    if (carryingSources.length > 0) {
      await tx
        .insert(sourceTopics)
        .values(carryingSources.map((row) => ({ ...row, topicId: existing.id })))
        .onConflictDoNothing();
    }
    // The join rows of the Topic being folded away go with it, by the cascade on topic_id.
    await tx.delete(topics).where(and(eq(topics.id, topicId), eq(topics.userId, userId)));

    return { topic: existing, merged: true };
  });

// Deleting a Topic is deleting a word, not the things that wore it: the cascade on topic_id
// takes the join rows, and no note or Source is touched (CONTEXT.md, Topic). False means
// there was no such Topic of this user's.
export const deleteTopic = async ({
  topicId,
  userId,
}: {
  topicId: number;
  userId: number;
}): Promise<boolean> => {
  const deleted = await db
    .delete(topics)
    .where(and(eq(topics.id, topicId), eq(topics.userId, userId)))
    .returning({ id: topics.id });
  return deleted.length > 0;
};

// Case-insensitive resolve-or-create, as the Symbol vocabulary resolves a name: "water"
// resolves to an existing "Water" - casing must never split the vocabulary - while a genuinely
// new name is stored with the casing the user first typed. The unique index on
// (user_id, lower(name)) makes the insert race-safe: on conflict with a concurrent insert,
// re-select the row that won.
export const findOrCreateTopic = async ({
  userId,
  name,
  executor = db,
}: {
  userId: number;
  name: string;
  executor?: Executor;
}): Promise<Topic> => {
  const findExisting = () =>
    executor
      .select()
      .from(topics)
      .where(and(eq(topics.userId, userId), sql`lower(${topics.name}) = lower(${name})`));

  const [existing] = await findExisting();
  if (existing) return existing;

  const [created] = await executor
    .insert(topics)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [winner] = await findExisting();
  if (!winner) {
    throw new Error('Topic insert conflicted but no existing row was found');
  }
  return winner;
};

// Names resolved to records in the order they were given, so the attachment order on a carrier
// is the order the user typed them in. Two names that differ only in casing resolve to the same
// Topic, so the result is deduplicated by id rather than by name.
const resolveTopicNames = async ({
  userId,
  names,
  executor,
}: {
  userId: number;
  names: string[];
  executor: Executor;
}): Promise<Topic[]> => {
  const resolved: Topic[] = [];
  for (const name of names) {
    // Sequential rather than in parallel: two names in one request that resolve to the same new
    // Topic would otherwise race each other into the unique index.
    // eslint-disable-next-line no-await-in-loop
    const topic = await findOrCreateTopic({ userId, name, executor });
    if (!resolved.some((already) => already.id === topic.id)) {
      resolved.push(topic);
    }
  }
  return resolved;
};

// The whole set a Source should end up carrying, as the rest of a Source is written whole (#83):
// Topics missing from the set are detached, and the ones in it are attached if they are not
// already. Detaching touches only the join row - the Topic itself stays in the vocabulary.
export const setSourceTopics = async ({
  userId,
  sourceId,
  names,
  executor = db,
}: {
  userId: number;
  sourceId: number;
  names: string[];
  executor?: Executor;
}): Promise<Topic[]> => {
  const resolved = await resolveTopicNames({ userId, names, executor });
  const keepIds = resolved.map((topic) => topic.id);
  await executor
    .delete(sourceTopics)
    .where(
      keepIds.length === 0
        ? eq(sourceTopics.sourceId, sourceId)
        : and(eq(sourceTopics.sourceId, sourceId), notInArray(sourceTopics.topicId, keepIds)),
    );
  if (resolved.length > 0) {
    await executor
      .insert(sourceTopics)
      .values(resolved.map((topic) => ({ sourceId, topicId: topic.id })))
      // Already-carried Topics stay as they are, keeping the row they were first attached with.
      .onConflictDoNothing();
  }
  return resolved;
};

// A Permanent note's own Topics, attached by the same whole-set rule. The `permanent` kind is
// written into the join row because the composite foreign key into notes(id, kind) is what makes
// "only a Permanent note carries Topics" a database constraint (ADR 0012).
export const setNoteTopics = async ({
  userId,
  noteId,
  names,
  executor = db,
}: {
  userId: number;
  noteId: number;
  names: string[];
  executor?: Executor;
}): Promise<Topic[]> => {
  const resolved = await resolveTopicNames({ userId, names, executor });
  const keepIds = resolved.map((topic) => topic.id);
  await executor
    .delete(noteTopics)
    .where(
      keepIds.length === 0
        ? eq(noteTopics.noteId, noteId)
        : and(eq(noteTopics.noteId, noteId), notInArray(noteTopics.topicId, keepIds)),
    );
  if (resolved.length > 0) {
    await executor
      .insert(noteTopics)
      .values(
        resolved.map((topic) => ({ noteId, noteKind: 'permanent' as const, topicId: topic.id })),
      )
      .onConflictDoNothing();
  }
  return resolved;
};

// Many carriers' Topics in one query rather than one query per carrier: the catalog reads every
// Source's Topics at once. Carriers with none are absent from the map rather than mapped to an
// empty array, which is the caller's default to supply.
const groupByCarrier = <T extends { carrierId: number; topic: Topic }>(
  rows: T[],
): Map<number, Topic[]> => {
  const grouped = new Map<number, Topic[]>();
  rows.forEach(({ carrierId, topic }) => {
    const already = grouped.get(carrierId);
    if (already) {
      already.push(topic);
    } else {
      grouped.set(carrierId, [topic]);
    }
  });
  return grouped;
};

export const listTopicsBySourceIds = async ({
  sourceIds,
}: {
  sourceIds: number[];
}): Promise<Map<number, Topic[]>> => {
  if (sourceIds.length === 0) return new Map();
  const rows = await db
    .select({ carrierId: sourceTopics.sourceId, topic: topics })
    .from(sourceTopics)
    .innerJoin(topics, eq(sourceTopics.topicId, topics.id))
    .where(inArray(sourceTopics.sourceId, sourceIds))
    // Attachment order, so a carrier's Topics read in the order they were put on it.
    .orderBy(asc(sourceTopics.createdAt), asc(sourceTopics.id));
  return groupByCarrier(rows);
};

export interface TopicRelatedNoteRow {
  note: Note;
  sourceTitle: string | null;
  topics: Topic[];
}

// The notes that share a Topic with one note: the link panel's middle tier (#85). A note's own
// Topics are the ones it carries if it is a Permanent note, or its Source's if it is a Literature
// note, because a Literature note inherits rather than carries (CONTEXT.md, Topic). The same
// inheritance decides which notes come back: a Permanent note matches on its own Topics, a
// Literature note on its Source's, so a shared Topic collects every note that carries or
// inherits it.
export const listNotesSharingTopicWith = async ({
  noteId,
  userId,
}: {
  noteId: number;
  userId: number;
}): Promise<TopicRelatedNoteRow[]> => {
  // Which Topics this note is in the tier through: the ones it carries if it is a Permanent
  // note, or its Source's if it is a Literature note. The union covers both without the caller
  // having to know which kind it is holding.
  const ownTopicIds = union(
    db
      .select({ topicId: noteTopics.topicId })
      .from(noteTopics)
      .where(eq(noteTopics.noteId, noteId)),
    db
      .select({ topicId: sourceTopics.topicId })
      .from(sourceTopics)
      .innerJoin(notes, eq(notes.sourceId, sourceTopics.sourceId))
      .where(eq(notes.id, noteId)),
  );

  // Every (note, Topic) pair in which the note carries or inherits one of those Topics. Carried
  // and inherited are two selects over the same shape rather than one query with a case analysis
  // in it, and the union collapses a note that reaches a Topic both ways to one pair.
  const carried = union(
    db
      .select({ noteId: noteTopics.noteId, topicId: noteTopics.topicId })
      .from(noteTopics)
      .where(inArray(noteTopics.topicId, ownTopicIds)),
    db
      .select({ noteId: notes.id, topicId: sourceTopics.topicId })
      .from(sourceTopics)
      .innerJoin(notes, eq(notes.sourceId, sourceTopics.sourceId))
      .where(inArray(sourceTopics.topicId, ownTopicIds)),
  ).as('carried');

  const rows = await db
    .select({
      note: notes,
      sourceTitle: sources.title,
      topic: topics,
    })
    .from(carried)
    .innerJoin(notes, eq(notes.id, carried.noteId))
    // The Topic that put the note in the tier travels with it, so the panel can say why the row
    // is being offered rather than leaving the user to guess.
    .innerJoin(topics, eq(topics.id, carried.topicId))
    .leftJoin(sources, eq(sources.id, notes.sourceId))
    .where(and(eq(notes.userId, userId), ne(notes.id, noteId)))
    // Permanent notes before Literature notes - an idea is the more useful thing to link to -
    // then newest first within each band, which is how a panel's list is read.
    .orderBy(
      sql`(${notes.kind} = 'permanent') desc`,
      desc(notes.createdAt),
      asc(notes.id),
      asc(carried.topicId),
    );

  const assembled: TopicRelatedNoteRow[] = [];
  rows.forEach(({ note, sourceTitle, topic }) => {
    const already = assembled.find((row) => row.note.id === note.id);
    if (already) {
      already.topics.push(topic);
    } else {
      assembled.push({ note, sourceTitle, topics: [topic] });
    }
  });
  return assembled;
};
