import { MongoClient, ObjectId } from 'mongodb';
import { eq, or } from 'drizzle-orm';
import { PrimaryMood } from '@nee3/shared-types';
import { db, pool } from '../db/index';
import { users, NewUser } from '../db/schema';
import { createEntry, DuplicateEntryError } from '../db/entries';

type MongoUser = {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
};

type MongoEntry = {
  _id: ObjectId;
  title?: string;
  month: string | number;
  day: string | number;
  year: string | number;
  time?: string;
  mood?: string;
  entry?: string;
  userId: string;
};

const MOOD_MAP: Record<string, { primaryMood: PrimaryMood; specificEmotion: string | null }> = {
  sad: { primaryMood: 'sad', specificEmotion: null },
  happy: { primaryMood: 'happy', specificEmotion: null },
  neutral: { primaryMood: 'steady', specificEmotion: null },
};

export const resolveMood = (
  mongoMood: string | undefined,
): { primaryMood: PrimaryMood; specificEmotion: string | null } =>
  MOOD_MAP[mongoMood ?? ''] ?? {
    primaryMood: 'steady' as const,
    specificEmotion: mongoMood ?? null,
  };

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toParagraphHtml = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('') || '<p></p>';

const toIsoDate = (
  year: string | number,
  month: string | number,
  day: string | number,
): string | null => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  if (y < 1000 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Reject dates that overflow into the next month (e.g. Feb 30), which Date would
  // otherwise silently roll forward instead of flagging as invalid.
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== d) {
    return null;
  }
  return iso;
};

const migrateUsers = async (mongoUsers: MongoUser[]): Promise<Map<string, number>> => {
  const idMap = new Map<string, number>();

  for (const mongoUser of mongoUsers) {
    if (!mongoUser.username || !mongoUser.email) {
      continue;
    }
    const username = mongoUser.username.toLowerCase();
    const email = mongoUser.email.toLowerCase();

    // eslint-disable-next-line no-await-in-loop
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)));

    if (existing) {
      idMap.set(mongoUser._id.toString(), existing.id);
      // eslint-disable-next-line no-continue
      continue;
    }

    const newUser: NewUser = {
      username,
      email,
      // The Mongo password is already a bcrypt hash - preserved as-is so migrated
      // users can log in with their existing password unchanged.
      password: mongoUser.password,
    };
    // eslint-disable-next-line no-await-in-loop
    const [created] = await db.insert(users).values(newUser).returning({ id: users.id });
    if (!created) {
      throw new Error(`Failed to insert migrated user "${username}"`);
    }
    idMap.set(mongoUser._id.toString(), created.id);
  }

  return idMap;
};

const migrateEntries = async (
  mongoEntries: MongoEntry[],
  userIdMap: Map<string, number>,
): Promise<{
  created: number;
  skippedDuplicate: number;
  skippedNoUser: number;
  skippedInvalidDate: number;
}> => {
  let created = 0;
  let skippedDuplicate = 0;
  let skippedNoUser = 0;
  let skippedInvalidDate = 0;

  for (const mongoEntry of mongoEntries) {
    const userId = userIdMap.get(mongoEntry.userId);
    if (!userId) {
      skippedNoUser += 1;
      // eslint-disable-next-line no-console
      console.warn(
        `Skipping entry "${mongoEntry._id.toString()}": unknown userId ${mongoEntry.userId}`,
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const date = toIsoDate(mongoEntry.year, mongoEntry.month, mongoEntry.day);
    if (!date) {
      skippedInvalidDate += 1;
      // eslint-disable-next-line no-console
      console.warn(
        `Skipping entry "${mongoEntry._id.toString()}": invalid date (year=${mongoEntry.year}, month=${mongoEntry.month}, day=${mongoEntry.day})`,
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const mood = resolveMood(mongoEntry.mood);

    try {
      // eslint-disable-next-line no-await-in-loop
      await createEntry({
        userId,
        date,
        title: mongoEntry.title?.trim() || 'Untitled entry',
        primaryMood: mood.primaryMood,
        specificEmotion: mood.specificEmotion,
        content: toParagraphHtml(mongoEntry.entry ?? ''),
      });
      created += 1;
    } catch (err) {
      if (err instanceof DuplicateEntryError) {
        skippedDuplicate += 1;
        // eslint-disable-next-line no-console
        console.warn(
          `Skipping entry "${mongoEntry._id.toString()}": an entry already exists for user ${userId} on ${date}`,
        );
      } else {
        throw err;
      }
    }
  }

  return { created, skippedDuplicate, skippedNoUser, skippedInvalidDate };
};

const run = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      'MONGO_URI environment variable is required (points at the Harmonee Mongo database)',
    );
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const mongoDb = client.db();

  try {
    const mongoUsers = await mongoDb.collection<MongoUser>('users').find().toArray();
    const mongoEntries = await mongoDb.collection<MongoEntry>('entries').find().toArray();

    const invalidDateEntries = mongoEntries.filter(
      (entry) => !toIsoDate(entry.year, entry.month, entry.day),
    );

    // eslint-disable-next-line no-console
    console.log(
      `Dry run: found ${mongoUsers.length} user(s) and ${mongoEntries.length} entry(ies) in Mongo. ${invalidDateEntries.length} entry(ies) have an invalid date and will be skipped.`,
    );
    invalidDateEntries.forEach((entry) => {
      // eslint-disable-next-line no-console
      console.warn(
        `  invalid date on entry "${entry._id.toString()}": year=${entry.year}, month=${entry.month}, day=${entry.day}`,
      );
    });

    const userIdMap = await migrateUsers(mongoUsers);
    const { created, skippedDuplicate, skippedNoUser, skippedInvalidDate } = await migrateEntries(
      mongoEntries,
      userIdMap,
    );

    // eslint-disable-next-line no-console
    console.log(
      `Migrated ${userIdMap.size} user(s). Entries: ${created} created, ${skippedDuplicate} skipped (duplicate date), ${skippedNoUser} skipped (unknown user), ${skippedInvalidDate} skipped (invalid date).`,
    );
  } finally {
    await client.close();
  }
};

if (require.main === module) {
  run()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => {
      void pool.end();
    });
}

export { run as migrateMongoJournal };
