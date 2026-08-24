import { findByUsername } from '../db/users';
import { createEntry, DuplicateEntryError } from '../db/entries';
import { pool } from '../db/index';
import { NewEntry } from '../db/schema';
import config from '../config/default';

// This script writes synthetic journal content. Refuse to run against anything that
// isn't clearly a test database, so a missing/forgotten USE_TEST_DB flag can't seed
// fake entries into a real personal journal database.
if (!/test/i.test(config.databaseUrl)) {
  throw new Error(
    `Refusing to seed test entries into "${config.databaseUrl}" - it doesn't look like a test database. ` +
      'Run this via "npm run seed:test-entries" (which sets USE_TEST_DB=true) or set USE_TEST_DB=true / DATABASE_URL to a *_test database explicitly.',
  );
}

const SAMPLE_ENTRIES: Omit<NewEntry, 'userId'>[] = [
  {
    date: '2026-08-05',
    title: 'A slow start',
    primaryMood: 'calm',
    specificEmotion: 'content',
    content:
      'Woke up later than usual and let the morning unfold without a plan. Made coffee, sat by the window, and watched the street wake up. Nothing urgent today, which felt like its own kind of luxury.',
  },
  {
    date: '2026-08-07',
    title: 'Deadline nerves',
    primaryMood: 'anxious',
    specificEmotion: 'overwhelmed',
    content:
      'The project review is tomorrow and I still feel underprepared. Spent the evening rehearsing what I want to say, but my mind keeps circling back to everything that could go wrong. Trying to remind myself that I have done the work.',
  },
  {
    date: '2026-08-08',
    title: 'It went fine',
    primaryMood: 'happy',
    specificEmotion: 'relieved',
    content:
      'The review went better than I expected. A few tough questions, but nothing I could not handle. Celebrated with a walk around the block and an early dinner. Funny how the anticipation is always worse than the thing itself.',
  },
  {
    date: '2026-08-09',
    title: 'Rainy afternoon',
    primaryMood: 'sad',
    specificEmotion: 'wistful',
    content:
      'Rain all day, the kind that makes the apartment feel smaller. Found an old photo while looking for something else and spent longer than I meant to just looking at it. Some days are like that.',
  },
  {
    date: '2026-08-10',
    title: 'Small argument',
    primaryMood: 'angry',
    specificEmotion: 'frustrated',
    content:
      'Had a disagreement that probably did not need to become one. Said some things faster than I should have. We talked it through by the evening, but I want to be more careful about that next time.',
  },
  {
    date: '2026-08-11',
    title: 'Long walk, clearer head',
    primaryMood: 'calm',
    specificEmotion: 'grounded',
    content:
      'Took the long way home through the park. No music, no podcast, just walking. Whatever was tangled up in my head yesterday feels looser now. I should do this more often instead of waiting until I need it.',
  },
  {
    date: '2026-08-12',
    title: 'Good news',
    primaryMood: 'happy',
    specificEmotion: 'excited',
    content:
      'Got word today that the plans I had been quietly hoping for are actually happening. Told a couple of close friends and their reactions made it feel even more real. Want to remember this feeling.',
  },
];

const seed = async (): Promise<void> => {
  const username = process.argv[2] ?? 'test';
  const user = await findByUsername(username);
  if (!user) {
    throw new Error(`No user found with username "${username}"`);
  }

  let created = 0;
  let skipped = 0;

  for (const entry of SAMPLE_ENTRIES) {
    // eslint-disable-next-line no-await-in-loop
    try {
      // eslint-disable-next-line no-await-in-loop
      await createEntry({ ...entry, userId: user.id });
      created += 1;
    } catch (err) {
      if (err instanceof DuplicateEntryError) {
        skipped += 1;
      } else {
        throw err;
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded entries for "${username}": ${created} created, ${skipped} skipped (already existed).`,
  );
};

seed()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
