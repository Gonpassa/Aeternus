import { Request, Response, NextFunction } from 'express';
import {
  ApiErrorResponse,
  CreateAssociationRequest,
  CreateSymbolAttachmentRequest,
} from '@nee3/shared-types';
import {
  validateAssociationInput,
  validateEmotionalBeatInput,
  validateSymbolTagInput,
} from './validation';
import { findAnchorOwnedByUser, deleteAnchor as deleteAnchorRecord } from '../../db/anchors';
import { createEmotionalBeat as createEmotionalBeatRecord } from '../../db/emotionalBeats';
import { findOrCreateSymbol } from '../../db/symbols';
import {
  createSymbolAttachment as createSymbolAttachmentRecord,
  findSymbolAttachment,
  findSymbolAttachmentOwnedByUser,
} from '../../db/symbolAttachments';
import {
  createAssociation as createAssociationRecord,
  listAssociationsByAnchors,
} from '../../db/associations';
import { isUniqueViolation } from '../../db/errors';
import { getUserId } from '../../types/request';

const parseAnchorId = (req: Request): number | null => {
  const id = Number(req.params.anchorId);
  return Number.isNaN(id) ? null : id;
};

export const deleteAnchor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const anchorId = parseAnchorId(req);
  if (anchorId === null) {
    res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const anchor = await findAnchorOwnedByUser({ anchorId, userId: getUserId(req) });
    if (!anchor) {
      res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteAnchorRecord({ id: anchorId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const createEmotionalBeat = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const anchorId = parseAnchorId(req);
  if (anchorId === null) {
    res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateEmotionalBeatInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const anchor = await findAnchorOwnedByUser({ anchorId, userId: getUserId(req) });
    if (!anchor) {
      res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
      return;
    }
    const { label } = req.body as { label: string };
    const emotionalBeat = await createEmotionalBeatRecord({ anchorId, label: label.trim() });
    res.status(201).json({ emotionalBeat });
  } catch (err) {
    next(err);
  }
};

export const createSymbolAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const anchorId = parseAnchorId(req);
  if (anchorId === null) {
    res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateSymbolTagInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const userId = getUserId(req);
    const anchor = await findAnchorOwnedByUser({ anchorId, userId });
    if (!anchor) {
      res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
      return;
    }
    const { name } = req.body as CreateSymbolAttachmentRequest;
    const symbol = await findOrCreateSymbol({ userId, name: name.trim() });

    // Tagging is idempotent per (symbol, anchor): re-tagging an already-attached symbol
    // returns the existing attachment (with its associations) instead of duplicating it.
    // The unique index on symbol_attachments backs this against double-submit races.
    const associationsForAttachment = async (attachmentId: number) => {
      const anchorAssociations = await listAssociationsByAnchors({ anchorIds: [anchorId] });
      return anchorAssociations.filter(
        (association) => association.symbolAttachmentId === attachmentId,
      );
    };

    const existing = await findSymbolAttachment({ symbolId: symbol.id, anchorId });
    if (existing) {
      res.status(200).json({
        symbolAttachment: {
          ...existing,
          symbolName: symbol.name,
          associations: await associationsForAttachment(existing.id),
        },
      });
      return;
    }

    let attachment;
    try {
      attachment = await createSymbolAttachmentRecord({ symbolId: symbol.id, anchorId });
    } catch (err) {
      // A concurrent identical tag won the race past the pre-check; the unique index
      // rejected this insert, so resolve to the row that won.
      const raced = isUniqueViolation(err)
        ? await findSymbolAttachment({ symbolId: symbol.id, anchorId })
        : undefined;
      if (!raced) throw err;
      res.status(200).json({
        symbolAttachment: {
          ...raced,
          symbolName: symbol.name,
          associations: await associationsForAttachment(raced.id),
        },
      });
      return;
    }
    res.status(201).json({
      symbolAttachment: { ...attachment, symbolName: symbol.name, associations: [] },
    });
  } catch (err) {
    next(err);
  }
};

export const createAssociation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const anchorId = parseAnchorId(req);
  if (anchorId === null) {
    res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateAssociationInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const userId = getUserId(req);
    const anchor = await findAnchorOwnedByUser({ anchorId, userId });
    if (!anchor) {
      res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
      return;
    }
    const { content, kind, symbolAttachmentId } = req.body as CreateAssociationRequest;
    if (symbolAttachmentId !== undefined && symbolAttachmentId !== null) {
      const attachment = await findSymbolAttachmentOwnedByUser({ id: symbolAttachmentId, userId });
      if (!attachment || attachment.anchorId !== anchorId) {
        res.status(400).json({
          error: 'symbolAttachmentId does not belong to this anchor.',
        } satisfies ApiErrorResponse);
        return;
      }
    }
    const association = await createAssociationRecord({
      anchorId,
      symbolAttachmentId: symbolAttachmentId ?? null,
      content: content.trim(),
      kind: kind ?? 'personal',
    });
    res.status(201).json({ association });
  } catch (err) {
    next(err);
  }
};
