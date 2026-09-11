import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@nee3/shared-types';
import {
  findSymbolAttachmentOwnedByUser,
  deleteSymbolAttachment as deleteSymbolAttachmentRecord,
} from '../../db/symbolAttachments';
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
