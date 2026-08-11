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

export const primaryMoodEnum = pgEnum('primary_mood', ['happy', 'calm', 'sad', 'anxious', 'angry']);
export const specificEmotionEnum = pgEnum('specific_emotion', [
  'content',
  'proud',
  'excited',
  'grateful',
  'peaceful',
  'relaxed',
  'relieved',
  'secure',
  'lonely',
  'disappointed',
  'hurt',
  'grieving',
  'nervous',
  'overwhelmed',
  'insecure',
  'worried',
  'frustrated',
  'irritated',
  'resentful',
  'jealous',
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
    specificEmotion: specificEmotionEnum('specific_emotion').notNull(),
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
