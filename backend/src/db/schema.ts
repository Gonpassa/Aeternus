import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  serial,
  text,
  date,
  integer,
  boolean,
  check,
  timestamp,
  unique,
  uniqueIndex,
  index,
  foreignKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const primaryMoodEnum = pgEnum('primary_mood', [
  'happy',
  'calm',
  'sad',
  'anxious',
  'angry',
  'steady',
]);

export const entries = pgTable(
  'entries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    title: text('title').notNull(),
    primaryMood: primaryMoodEnum('primary_mood').notNull(),
    specificEmotion: text('specific_emotion'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userDateUnique: unique().on(table.userId, table.date),
  }),
);

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;

// No unique(userId, date) constraint, unlike entries above - a user may record more
// than one dream on the same date.
export const dreams = pgTable('dreams', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  narrative: text('narrative').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Dream = typeof dreams.$inferSelect;
export type NewDream = typeof dreams.$inferInsert;

// The row's own id is embedded as data-anchor-id in the narrative HTML by a custom Tiptap
// mark - see ADR-0007. No separate mark-id column; the mark and this row share one id.
export const anchors = pgTable('anchors', {
  id: serial('id').primaryKey(),
  dreamId: integer('dream_id')
    .notNull()
    .references(() => dreams.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Anchor = typeof anchors.$inferSelect;
export type NewAnchor = typeof anchors.$inferInsert;

export const emotionalBeats = pgTable('emotional_beats', {
  id: serial('id').primaryKey(),
  anchorId: integer('anchor_id')
    .notNull()
    .references(() => anchors.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type EmotionalBeat = typeof emotionalBeats.$inferSelect;
export type NewEmotionalBeat = typeof emotionalBeats.$inferInsert;

// A user's Symbol vocabulary (CONTEXT.md): unique per user on the lowercased name so
// casing never splits the vocabulary ("water" resolves to an existing "Water"), while
// `name` itself preserves the casing the user first typed.
export const symbols = pgTable(
  'symbols',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userLowerNameUnique: uniqueIndex('symbols_user_id_lower_name_unique').on(
      table.userId,
      sql`lower(${table.name})`,
    ),
  }),
);

// Named DreamSymbol (not Symbol) to avoid colliding with the ES global.
export type DreamSymbol = typeof symbols.$inferSelect;
export type NewDreamSymbol = typeof symbols.$inferInsert;

// Unique per (symbol, anchor): tagging the same symbol onto an anchor twice is
// meaningless, and without the constraint a double-submit would show duplicate specimen
// labels each with its own association list.
export const symbolAttachments = pgTable(
  'symbol_attachments',
  {
    id: serial('id').primaryKey(),
    symbolId: integer('symbol_id')
      .notNull()
      .references(() => symbols.id, { onDelete: 'cascade' }),
    anchorId: integer('anchor_id')
      .notNull()
      .references(() => anchors.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    symbolAnchorUnique: uniqueIndex('symbol_attachments_symbol_id_anchor_id_unique').on(
      table.symbolId,
      table.anchorId,
    ),
    // Lets associations.symbol_attachment_id + associations.anchor_id reference this pair
    // together as a composite FK below, so "this symbol tag belongs to this anchor" is a
    // declarative constraint rather than a hand-written trigger.
    idAnchorUnique: uniqueIndex('symbol_attachments_id_anchor_id_unique').on(
      table.id,
      table.anchorId,
    ),
  }),
);

export type SymbolAttachment = typeof symbolAttachments.$inferSelect;
export type NewSymbolAttachment = typeof symbolAttachments.$inferInsert;

// `personal` is the dreamer's own raw material; `cultural` marks mythological/cultural
// amplification so it stays visually and conceptually separate (CONTEXT.md, Association).
export const associationKindEnum = pgEnum('association_kind', ['personal', 'cultural']);

// Every Association belongs to exactly one Anchor; naming a Symbol at that Anchor
// (symbolAttachmentId) is an optional, downstream move, not a precondition - the ownership
// chain stays a single hop from the Anchor regardless of kind (CONTEXT.md, Association). A
// composite FK (symbolAttachmentId, anchorId) -> symbolAttachments(id, anchorId) enforces
// that a non-null symbolAttachmentId names an attachment on this same anchorId; Postgres
// skips that check entirely when symbolAttachmentId is null (MATCH SIMPLE), which is exactly
// the anchor-level case.
export const associations = pgTable(
  'associations',
  {
    id: serial('id').primaryKey(),
    anchorId: integer('anchor_id')
      .notNull()
      .references(() => anchors.id, { onDelete: 'cascade' }),
    symbolAttachmentId: integer('symbol_attachment_id'),
    content: text('content').notNull(),
    kind: associationKindEnum('kind').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    symbolAttachmentAnchorFk: foreignKey({
      columns: [table.symbolAttachmentId, table.anchorId],
      foreignColumns: [symbolAttachments.id, symbolAttachments.anchorId],
    }).onDelete('cascade'),
  }),
);

export type Association = typeof associations.$inferSelect;
export type NewAssociation = typeof associations.$inferInsert;

export const analysisPassTypeEnum = pgEnum('analysis_pass_type', ['analytic', 'synthetic']);

// Append-only by design: no update or delete route exists, so the record of how a dream's
// understanding evolved stays trustworthy. anchorId is nullable (analytic passes may read
// the whole dream; synthetic passes always do) and set-null on anchor delete rather than
// cascading - a pass is part of the permanent analysis record, not an anchor attachment,
// so losing its anchor degrades it to a whole-dream reading instead of destroying it.
export const analysisPasses = pgTable('analysis_passes', {
  id: serial('id').primaryKey(),
  dreamId: integer('dream_id')
    .notNull()
    .references(() => dreams.id, { onDelete: 'cascade' }),
  anchorId: integer('anchor_id').references(() => anchors.id, { onDelete: 'set null' }),
  type: analysisPassTypeEnum('type').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AnalysisPass = typeof analysisPasses.$inferSelect;
export type NewAnalysisPass = typeof analysisPasses.$inferInsert;

export const sourceKindEnum = pgEnum('source_kind', ['book', 'article', 'video', 'other']);

// A Source is a first-class record rather than free text on a note (CONTEXT.md, Source), and
// it deliberately carries no status column: it has no lifecycle, and the recency of its
// Literature notes is the only signal that it is active. Text columns stay `text` here as
// everywhere else in this schema - the Notes module's generous maxima live in its
// validation.ts, where the message can be written in the module's voice (ADR 0012, ADR 0017).
export const sources = pgTable(
  'sources',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    kind: sourceKindEnum('kind').notNull(),
    author: text('author'),
    url: text('url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // The catalog is always one user's, ordered newest-activity-first; until Literature notes
    // exist that is creation order, which this index serves either way.
    userCreatedAtIdx: index('sources_user_id_created_at_idx').on(table.userId, table.createdAt),
  }),
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export const noteKindEnum = pgEnum('note_kind', ['literature', 'permanent']);

// Both note kinds live in this one table behind the `kind` discriminator, and the per-kind
// field requirements are CHECK constraints rather than NOT NULL columns (ADR 0012). That is
// what keeps `links`, `review_answers` and the later citations pointing at a single id space
// instead of branching over two. `kind` is fixed at insert: a Literature note never becomes a
// Permanent note, because the method's point is that the second is written from scratch.
//
// Only the Literature kind is written so far; the enum and both CHECKs land together because
// they are the definition of the table rather than a later addition to it.
export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: noteKindEnum('kind').notNull(),
    // Deleting a Source cascades to its Literature notes (#70). The cascade is the mechanics
    // that run once the orphan guard has passed, never the guard itself (ADR 0012).
    sourceId: integer('source_id').references(() => sources.id, { onDelete: 'cascade' }),
    title: text('title'),
    body: text('body').notNull(),
    // The author's exact words, kept in their own column precisely so the source's phrasing
    // and the user's own are never merged (CONTEXT.md, Excerpt).
    excerpt: text('excerpt'),
    // The two halves of the Locator, both free text. At least one is required on a Literature
    // note; either alone is a complete Locator. Rendering ("Ch. 3 · p. 42", a digits-only
    // position as "p. N") is a client-side rule over these two columns, never stored.
    section: text('section'),
    position: text('position'),
    openQuestion: boolean('open_question').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Lets a table that must reference one kind specifically do so declaratively: a composite
    // FK into (id, kind) plus a CHECK pinning its own kind column. `review_answers` will use
    // it for literature-only and `note_topics` for permanent-only, the same trick
    // `associations` already uses above.
    idKindUnique: uniqueIndex('notes_id_kind_unique').on(table.id, table.kind),
    userKindIdx: index('notes_user_id_kind_idx').on(table.userId, table.kind),
    // The reading stream: one Source's notes in creation order, oldest first.
    sourceCreatedAtIdx: index('notes_source_id_created_at_idx').on(table.sourceId, table.createdAt),
    // A Literature note is bound to one Source, has no title, and carries at least one half of
    // a Locator. The emptiness test is on the trimmed value because "   " is not a position.
    literatureShape: check(
      'notes_literature_shape',
      sql`${table.kind} <> 'literature' OR (
        ${table.sourceId} IS NOT NULL
        AND ${table.title} IS NULL
        AND (
          coalesce(btrim(${table.section}), '') <> ''
          OR coalesce(btrim(${table.position}), '') <> ''
        )
      )`,
    ),
    // A Permanent note is titled as a claim and bound to no Source. `open_question` is a
    // non-nullable defaulted boolean, so it is pinned to false here rather than absented.
    permanentShape: check(
      'notes_permanent_shape',
      sql`${table.kind} <> 'permanent' OR (
        ${table.title} IS NOT NULL
        AND ${table.sourceId} IS NULL
        AND ${table.excerpt} IS NULL
        AND ${table.section} IS NULL
        AND ${table.position} IS NULL
        AND ${table.openQuestion} = false
      )`,
    ),
  }),
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

// One row per Link, directed, with a reason from each end (ADR 0013). Direction is kept
// because the connections view groups by it and because each reason has to be attributable:
// `reason` is the origin's, written when the Link was made and required, and `targetReason`
// is written only if the other end later links back and finds this Link already there.
//
// Uniqueness of the unordered pair is a functional unique index over least/greatest, so the
// "at most one Link per pair" rule holds without the application normalizing the pair before
// every insert. Both foreign keys cascade, under the guard-then-cascade rule of ADR 0012: the
// cascade is the mechanics once a deletion is allowed, never the guard that allows it.
export const links = pgTable(
  'links',
  {
    id: serial('id').primaryKey(),
    originNoteId: integer('origin_note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    targetNoteId: integer('target_note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    targetReason: text('target_reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // At most one Link per unordered pair, so linking B to A when A to B already exists finds
    // the Link rather than making a second one. A functional index over least/greatest states
    // that directly, which is why nothing has to store the pair pre-normalized.
    pairUnique: uniqueIndex('links_unordered_pair_unique').on(
      sql`least(${table.originNoteId}, ${table.targetNoteId})`,
      sql`greatest(${table.originNoteId}, ${table.targetNoteId})`,
    ),
    // A note's Links are read from either end - `origin_note_id = :id OR target_note_id = :id`
    // - so both columns are indexed rather than only the pair expression above.
    originIdx: index('links_origin_note_id_idx').on(table.originNoteId),
    targetIdx: index('links_target_note_id_idx').on(table.targetNoteId),
    // A note linking to itself states nothing.
    notSelf: check('links_not_self', sql`${table.originNoteId} <> ${table.targetNoteId}`),
  }),
);

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;

// A user's Topic vocabulary (CONTEXT.md, Topic), following the Symbol vocabulary above rather
// than sharing its table: a Symbol and a Topic mean different things even when they are spelled
// the same, so "Water" as a dream Symbol and "Water" as a reading Topic are two records. Unique
// per user on the lowercased name so casing never splits the vocabulary, while `name` keeps the
// casing the user first typed. A Topic nobody carries any more stays here with a count of zero:
// the word was chosen deliberately, and removing it silently would lose that choice.
export const topics = pgTable(
  'topics',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userLowerNameUnique: uniqueIndex('topics_user_id_lower_name_unique').on(
      table.userId,
      sql`lower(${table.name})`,
    ),
  }),
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

// One join table per carrier rather than one polymorphic table over both: a Source and a note
// are different id spaces, and a nullable-columns-plus-CHECK table would state the same thing
// less well than two foreign keys do (ADR 0012). Unique per pair - carrying the same Topic
// twice says nothing - and the carrier column is indexed because a carrier's Topics are read
// far more often than a Topic's carriers.
export const sourceTopics = pgTable(
  'source_topics',
  {
    id: serial('id').primaryKey(),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id')
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    topicSourceUnique: uniqueIndex('source_topics_topic_id_source_id_unique').on(
      table.topicId,
      table.sourceId,
    ),
    sourceIdx: index('source_topics_source_id_idx').on(table.sourceId),
  }),
);

export type SourceTopic = typeof sourceTopics.$inferSelect;
export type NewSourceTopic = typeof sourceTopics.$inferInsert;

// Only a Permanent note carries its own Topics: a Literature note inherits its Source's, because
// tagging at capture time is the collecting the method warns against, and anything worth its own
// Topic is a Permanent note (CONTEXT.md, Topic). That restriction is declarative rather than a
// controller rule - the composite FK (noteId, noteKind) -> notes(id, kind) plus the CHECK pinning
// `noteKind` to 'permanent' is the same trick `associations` uses on its anchor (ADR 0012), so the
// database itself refuses a Topic attached to a Literature note.
export const noteTopics = pgTable(
  'note_topics',
  {
    id: serial('id').primaryKey(),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    noteId: integer('note_id').notNull(),
    noteKind: noteKindEnum('note_kind').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    noteKindFk: foreignKey({
      columns: [table.noteId, table.noteKind],
      foreignColumns: [notes.id, notes.kind],
    }).onDelete('cascade'),
    topicNoteUnique: uniqueIndex('note_topics_topic_id_note_id_unique').on(
      table.topicId,
      table.noteId,
    ),
    noteIdx: index('note_topics_note_id_idx').on(table.noteId),
    permanentOnly: check('note_topics_permanent_only', sql`${table.noteKind} = 'permanent'`),
  }),
);

export type NoteTopic = typeof noteTopics.$inferSelect;
export type NewNoteTopic = typeof noteTopics.$inferInsert;
