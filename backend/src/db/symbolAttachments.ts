import { and, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import { symbolAttachments, symbols, anchors, dreams, SymbolAttachment } from './schema';

export type SymbolAttachmentWithName = SymbolAttachment & { symbolName: string };

export const createSymbolAttachment = async ({
  symbolId,
  anchorId,
}: {
  symbolId: number;
  anchorId: number;
}): Promise<SymbolAttachment> => {
  const [created] = await db.insert(symbolAttachments).values({ symbolId, anchorId }).returning();
  if (!created) {
    throw new Error('Insert did not return a row');
  }
  return created;
};

// Joins through anchors and dreams to verify the requesting user owns the dream at the
// top of this attachment's ownership chain - symbol attachments carry no userId of their
// own.
export const findSymbolAttachmentOwnedByUser = async ({
  id,
  userId,
}: {
  id: number;
  userId: number;
}): Promise<SymbolAttachment | undefined> => {
  const [row] = await db
    .select({
      id: symbolAttachments.id,
      symbolId: symbolAttachments.symbolId,
      anchorId: symbolAttachments.anchorId,
      createdAt: symbolAttachments.createdAt,
    })
    .from(symbolAttachments)
    .innerJoin(anchors, eq(symbolAttachments.anchorId, anchors.id))
    .innerJoin(dreams, eq(anchors.dreamId, dreams.id))
    .where(and(eq(symbolAttachments.id, id), eq(dreams.userId, userId)));
  return row;
};

export const listSymbolAttachmentsByAnchors = async ({
  anchorIds,
}: {
  anchorIds: number[];
}): Promise<SymbolAttachmentWithName[]> => {
  if (anchorIds.length === 0) return [];
  return db
    .select({
      id: symbolAttachments.id,
      symbolId: symbolAttachments.symbolId,
      anchorId: symbolAttachments.anchorId,
      createdAt: symbolAttachments.createdAt,
      symbolName: symbols.name,
    })
    .from(symbolAttachments)
    .innerJoin(symbols, eq(symbolAttachments.symbolId, symbols.id))
    .where(inArray(symbolAttachments.anchorId, anchorIds));
};

export const deleteSymbolAttachment = async ({ id }: { id: number }): Promise<boolean> => {
  const deleted = await db
    .delete(symbolAttachments)
    .where(eq(symbolAttachments.id, id))
    .returning({ id: symbolAttachments.id });
  return deleted.length > 0;
};
