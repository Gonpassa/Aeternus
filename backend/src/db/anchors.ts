import { and, eq } from 'drizzle-orm';
import { db } from './index';
import { anchors, dreams, Anchor } from './schema';

export const createAnchor = async ({ dreamId }: { dreamId: number }): Promise<Anchor> => {
  const [created] = await db.insert(anchors).values({ dreamId }).returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// Joins through dreams to verify the requesting user owns the dream the anchor belongs
// to - anchors carry no userId of their own.
export const findAnchorOwnedByUser = async ({
  anchorId,
  userId,
}: {
  anchorId: number;
  userId: number;
}): Promise<Anchor | undefined> => {
  const [row] = await db
    .select({ id: anchors.id, dreamId: anchors.dreamId, createdAt: anchors.createdAt })
    .from(anchors)
    .innerJoin(dreams, eq(anchors.dreamId, dreams.id))
    .where(and(eq(anchors.id, anchorId), eq(dreams.userId, userId)));
  return row;
};

export const listAnchorsByDream = async ({ dreamId }: { dreamId: number }): Promise<Anchor[]> =>
  db.select().from(anchors).where(eq(anchors.dreamId, dreamId));

export const deleteAnchor = async ({ id }: { id: number }): Promise<boolean> => {
  const deleted = await db.delete(anchors).where(eq(anchors.id, id)).returning({ id: anchors.id });
  return deleted.length > 0;
};
