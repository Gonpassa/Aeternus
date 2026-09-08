import { desc, eq } from 'drizzle-orm';
import { db } from './index';
import { dreams, Dream, NewDream } from './schema';

export type NewDreamInput = Omit<NewDream, 'id' | 'createdAt' | 'updatedAt'>;

export const createDream = async (input: NewDreamInput): Promise<Dream> => {
  const [created] = await db.insert(dreams).values(input).returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// Secondary sort by id keeps same-date dreams (allowed - unlike Entry, there's no
// unique(userId, date) constraint) in a stable, deterministic order.
export const listDreamsByUser = async ({ userId }: { userId: number }): Promise<Dream[]> =>
  db
    .select()
    .from(dreams)
    .where(eq(dreams.userId, userId))
    .orderBy(desc(dreams.date), desc(dreams.id));
