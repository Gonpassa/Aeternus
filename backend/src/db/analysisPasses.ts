import { eq } from 'drizzle-orm';
import { db } from './index';
import { analysisPasses, AnalysisPass, NewAnalysisPass } from './schema';

// No update or delete helpers exist, matching the absence of those routes: Analysis
// passes are append-only by design (CONTEXT.md, Analysis pass).
export const createAnalysisPass = async ({
  dreamId,
  anchorId,
  type,
  content,
}: {
  dreamId: number;
  anchorId: number | null;
  type: NewAnalysisPass['type'];
  content: string;
}): Promise<AnalysisPass> => {
  const [created] = await db
    .insert(analysisPasses)
    .values({ dreamId, anchorId, type, content })
    .returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

export const listAnalysisPassesByDream = async ({
  dreamId,
}: {
  dreamId: number;
}): Promise<AnalysisPass[]> =>
  db
    .select()
    .from(analysisPasses)
    .where(eq(analysisPasses.dreamId, dreamId))
    .orderBy(analysisPasses.createdAt, analysisPasses.id);
