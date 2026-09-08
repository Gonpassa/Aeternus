import {
  pgTable,
  pgEnum,
  serial,
  text,
  date,
  integer,
  timestamp,
  unique,
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
