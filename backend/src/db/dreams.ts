import { and, desc, eq, notExists, sql } from 'drizzle-orm';
import { db } from './index';
import { analysisPasses, anchors, dreams, Dream, NewDream } from './schema';

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

export const findDreamById = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Dream | undefined> => {
  const [row] = await db
    .select()
    .from(dreams)
    .where(and(eq(dreams.id, id), eq(dreams.userId, userId)));
  return row;
};

export type UpdateDreamInput = { id: number; userId: number; date: string; narrative: string };

export const updateDream = async ({
  id,
  userId,
  date,
  narrative,
}: UpdateDreamInput): Promise<Dream | undefined> => {
  const [updated] = await db
    .update(dreams)
    .set({ date, narrative, updatedAt: new Date() })
    .where(and(eq(dreams.id, id), eq(dreams.userId, userId)))
    .returning();
  return updated;
};

export type ReEncounterDream = Pick<Dream, 'id' | 'date' | 'narrative'>;

// A Dream is eligible for Re-encounter while it carries neither an Anchor nor an Analysis
// pass, and while it was recorded at least `minimumNights` nights before `asOf` (CONTEXT.md,
// ADR 0010). The window runs on created_at - when the dreamer wrote the Dream down - so
// back-dating a Dream recorded today cannot make it eligible on save, and it is compared by
// whole day so that recording late at night does not shift the threshold by one.
// The pick is the newest by the night dreamt, hence ordering on `date` rather than created_at.
export const findReEncounterDream = async ({
  userId,
  asOf,
  minimumNights,
}: {
  userId: number;
  asOf: string;
  minimumNights: number;
}): Promise<ReEncounterDream | undefined> => {
  const [row] = await db
    .select({ id: dreams.id, date: dreams.date, narrative: dreams.narrative })
    .from(dreams)
    .where(
      and(
        eq(dreams.userId, userId),
        sql`${dreams.createdAt}::date <= ${asOf}::date - ${minimumNights}::int`,
        notExists(
          db
            .select({ exists: sql`1` })
            .from(anchors)
            .where(eq(anchors.dreamId, dreams.id)),
        ),
        notExists(
          db
            .select({ exists: sql`1` })
            .from(analysisPasses)
            .where(eq(analysisPasses.dreamId, dreams.id)),
        ),
      ),
    )
    .orderBy(desc(dreams.date), desc(dreams.createdAt))
    .limit(1);
  return row;
};

export const userHasAnyDreams = async ({ userId }: { userId: number }): Promise<boolean> => {
  const [row] = await db
    .select({ id: dreams.id })
    .from(dreams)
    .where(eq(dreams.userId, userId))
    .limit(1);
  return row !== undefined;
};
