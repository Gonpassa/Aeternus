import { and, eq, ilike, sql } from 'drizzle-orm';
import { db } from './index';
import { symbols, DreamSymbol } from './schema';

// Escape LIKE wildcards in user-typed autocomplete input so it matches literally.
const escapeLikePattern = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

export const listSymbolsByUser = async ({
  userId,
  query,
}: {
  userId: number;
  query?: string;
}): Promise<DreamSymbol[]> => {
  const conditions = [eq(symbols.userId, userId)];
  if (query) {
    conditions.push(ilike(symbols.name, `%${escapeLikePattern(query)}%`));
  }
  return db
    .select()
    .from(symbols)
    .where(and(...conditions))
    .orderBy(symbols.name);
};

// Case-insensitive resolve-or-create: "water" resolves to an existing "Water" (casing
// must never split the vocabulary), while a genuinely new name is stored with the casing
// the user first typed. The unique index on (user_id, lower(name)) makes the insert
// race-safe - on conflict with a concurrent insert, re-select the row that won.
export const findOrCreateSymbol = async ({
  userId,
  name,
}: {
  userId: number;
  name: string;
}): Promise<DreamSymbol> => {
  const findExisting = () =>
    db
      .select()
      .from(symbols)
      .where(and(eq(symbols.userId, userId), sql`lower(${symbols.name}) = lower(${name})`));

  const [existing] = await findExisting();
  if (existing) return existing;

  const [created] = await db
    .insert(symbols)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [winner] = await findExisting();
  if (!winner) {
    throw new Error('Symbol insert conflicted but no existing row was found');
  }
  return winner;
};
