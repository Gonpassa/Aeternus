import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import {
  associations,
  symbolAttachments,
  anchors,
  dreams,
  Association,
  NewAssociation,
} from './schema';

export const createAssociation = async ({
  symbolAttachmentId,
  content,
  kind,
}: {
  symbolAttachmentId: number;
  content: string;
  kind: NewAssociation['kind'];
}): Promise<Association> => {
  const [created] = await db
    .insert(associations)
    .values({ symbolAttachmentId, content, kind })
    .returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// Joins through symbol attachments, anchors, and dreams to verify the requesting user
// owns the dream at the top of this association's ownership chain.
export const findAssociationOwnedByUser = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<Association | undefined> => {
  const [row] = await db
    .select({
      id: associations.id,
      symbolAttachmentId: associations.symbolAttachmentId,
      content: associations.content,
      kind: associations.kind,
      createdAt: associations.createdAt,
      updatedAt: associations.updatedAt,
    })
    .from(associations)
    .innerJoin(symbolAttachments, eq(associations.symbolAttachmentId, symbolAttachments.id))
    .innerJoin(anchors, eq(symbolAttachments.anchorId, anchors.id))
    .innerJoin(dreams, eq(anchors.dreamId, dreams.id))
    .where(and(eq(associations.id, id), eq(dreams.userId, userId)));
  return row;
};

export const listAssociationsBySymbolAttachments = async ({
  symbolAttachmentIds,
}: {
  symbolAttachmentIds: number[];
}): Promise<Association[]> => {
  if (symbolAttachmentIds.length === 0) return [];
  return (
    db
      .select()
      .from(associations)
      .where(inArray(associations.symbolAttachmentId, symbolAttachmentIds))
      // Explicit creation order - without it Postgres returns physical tuple order, which
      // shifts when an edit rewrites a row.
      .orderBy(asc(associations.createdAt), asc(associations.id))
  );
};

export const updateAssociation = async ({
  id,
  content,
  kind,
}: {
  id: number;
  content: string;
  kind: Association['kind'];
}): Promise<Association | undefined> => {
  const [updated] = await db
    .update(associations)
    .set({ content, kind, updatedAt: new Date() })
    .where(eq(associations.id, id))
    .returning();
  return updated;
};

export const deleteAssociation = async ({ id }: { id: number }): Promise<boolean> => {
  const deleted = await db
    .delete(associations)
    .where(eq(associations.id, id))
    .returning({ id: associations.id });
  return deleted.length > 0;
};
