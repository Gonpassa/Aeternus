import { and, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import { emotionalBeats, anchors, dreams, EmotionalBeat } from './schema';

export const createEmotionalBeat = async ({
  anchorId,
  label,
}: {
  anchorId: number;
  label: string;
}): Promise<EmotionalBeat> => {
  const [created] = await db.insert(emotionalBeats).values({ anchorId, label }).returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// Joins through anchors and dreams to verify the requesting user owns the dream at the
// top of this beat's ownership chain - emotional beats carry no userId of their own.
export const findEmotionalBeatOwnedByUser = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<EmotionalBeat | undefined> => {
  const [row] = await db
    .select({
      id: emotionalBeats.id,
      anchorId: emotionalBeats.anchorId,
      label: emotionalBeats.label,
      createdAt: emotionalBeats.createdAt,
      updatedAt: emotionalBeats.updatedAt,
    })
    .from(emotionalBeats)
    .innerJoin(anchors, eq(emotionalBeats.anchorId, anchors.id))
    .innerJoin(dreams, eq(anchors.dreamId, dreams.id))
    .where(and(eq(emotionalBeats.id, id), eq(dreams.userId, userId)));
  return row;
};

export const listEmotionalBeatsByAnchors = async ({
  anchorIds,
}: {
  anchorIds: number[];
}): Promise<EmotionalBeat[]> => {
  if (anchorIds.length === 0) return [];
  return db.select().from(emotionalBeats).where(inArray(emotionalBeats.anchorId, anchorIds));
};

export const updateEmotionalBeat = async ({
  id,
  label,
}: {
  id: number;
  label: string;
}): Promise<EmotionalBeat | undefined> => {
  const [updated] = await db
    .update(emotionalBeats)
    .set({ label, updatedAt: new Date() })
    .where(eq(emotionalBeats.id, id))
    .returning();
  return updated;
};

export const deleteEmotionalBeat = async ({ id }: { id: number }): Promise<boolean> => {
  const deleted = await db
    .delete(emotionalBeats)
    .where(eq(emotionalBeats.id, id))
    .returning({ id: emotionalBeats.id });
  return deleted.length > 0;
};
