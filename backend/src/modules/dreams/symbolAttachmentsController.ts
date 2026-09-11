import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, CreateAssociationRequest } from '@nee3/shared-types';
import { validateAssociationInput } from './validation';
import {
  findSymbolAttachmentOwnedByUser,
  deleteSymbolAttachment as deleteSymbolAttachmentRecord,
} from '../../db/symbolAttachments';
import { createAssociation as createAssociationRecord } from '../../db/associations';
import { getUserId } from '../../types/request';

const parseId = (req: Request): number | null => {
  const id = Number(req.params.id);
  return Number.isNaN(id) ? null : id;
};

export const deleteSymbolAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Symbol tag not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findSymbolAttachmentOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Symbol tag not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteSymbolAttachmentRecord({ id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const createAssociation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Symbol tag not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateAssociationInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findSymbolAttachmentOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Symbol tag not found' } satisfies ApiErrorResponse);
      return;
    }
    const { content, kind } = req.body as CreateAssociationRequest;
    const association = await createAssociationRecord({
      symbolAttachmentId: id,
      content: content.trim(),
      kind: kind ?? 'personal',
    });
    res.status(201).json({ association });
  } catch (err) {
    next(err);
  }
};
