import { and, eq } from 'drizzle-orm';
import { db, pool } from '../db/index';
import { entries } from '../db/schema';

const run = async (): Promise<void> => {
  const result = await db
    .update(entries)
    .set({ primaryMood: 'steady', specificEmotion: null })
    .where(and(eq(entries.primaryMood, 'calm'), eq(entries.specificEmotion, 'neutral')))
    .returning({ id: entries.id });

  // eslint-disable-next-line no-console
  console.log(`Backfilled ${result.length} entry(ies) from calm/neutral to steady.`);
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

export { run as backfillSteadyMood };
