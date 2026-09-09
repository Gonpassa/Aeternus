import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, UpdateAssociationRequest } from '@nee3/shared-types';
import { validateAssociationInput } from './validation';
import {
  findAssociationOwnedByUser,
  updateAssociation as updateAssociationRecord,
  deleteAssociation as deleteAssociationRecord,
} from '../../db/associations';
import { getUserId } from '../../types/request';

const parseId = (req: Request): number | null => {
  const id = Number(req.params.id);
  return Number.isNaN(id) ? null : id;
};

export const updateAssociation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Association not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateAssociationInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findAssociationOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Association not found' } satisfies ApiErrorResponse);
      return;
    }
    const { content, kind } = req.body as UpdateAssociationRequest;
    const association = await updateAssociationRecord({
      id,
      content: content.trim(),
      kind: kind ?? existing.kind,
    });
    // The row can vanish between the ownership check and the UPDATE (concurrent delete);
    // report that as not-found rather than a 200 with no association.
    if (!association) {
      res.status(404).json({ error: 'Association not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ association });
  } catch (err) {
    next(err);
  }
};

export const deleteAssociation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const id = parseId(req);
  if (id === null) {
    res.status(404).json({ error: 'Association not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const existing = await findAssociationOwnedByUser({ id, userId: getUserId(req) });
    if (!existing) {
      res.status(404).json({ error: 'Association not found' } satisfies ApiErrorResponse);
      return;
    }
    await deleteAssociationRecord({ id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
