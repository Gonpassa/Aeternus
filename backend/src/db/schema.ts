import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  serial,
  text,
  date,
  integer,
  timestamp,
  unique,
  uniqueIndex,
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
