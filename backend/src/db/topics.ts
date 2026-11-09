import { and, asc, desc, eq, ilike, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { union } from 'drizzle-orm/pg-core';
import { db } from './index';
import { noteTopics, notes, sourceTopics, sources, topics, Note, Topic } from './schema';

// The transactional executor `db.transaction` hands its callback. Every function here takes one
// so attaching Topics can join the transaction that creates their carrier - a Permanent note and
// its Topics are written together or not at all - while a plain call passes `db` itself.
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

// Escape LIKE wildcards in user-typed autocomplete input so it matches literally.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

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
}): Promise<Topic[]> => {
  const conditions = [eq(topics.userId, userId)];
  if (query) {
    conditions.push(ilike(topics.name, `%${escapeLikePattern(query)}%`));
  }
  return db
    .select()
    .from(topics)
    .where(and(...conditions))
    .orderBy(topics.name);
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

export const listTopicsByNoteIds = async ({
  noteIds,
}: {
  noteIds: number[];
}): Promise<Map<number, Topic[]>> => {
  if (noteIds.length === 0) return new Map();
  const rows = await db
    .select({ carrierId: noteTopics.noteId, topic: topics })
    .from(noteTopics)
    .innerJoin(topics, eq(noteTopics.topicId, topics.id))
    .where(inArray(noteTopics.noteId, noteIds))
    .orderBy(asc(noteTopics.createdAt), asc(noteTopics.id));
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
