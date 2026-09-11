import { Request, Response, NextFunction } from 'express';
import {
  ApiErrorResponse,
  CreateAnalysisPassRequest,
  CreateDreamRequest,
  UpdateDreamRequest,
} from '@nee3/shared-types';
import { validateAnalysisPassInput, validateDreamInput } from './validation';
import { sanitizeDreamNarrative } from './sanitize';
import {
  createDream as createDreamRecord,
  listDreamsByUser,
  findDreamById,
  updateDream as updateDreamRecord,
} from '../../db/dreams';
import {
  createAnchor as createAnchorRecord,
  findAnchorOwnedByUser,
  listAnchorsByDream,
} from '../../db/anchors';
import { listEmotionalBeatsByAnchors } from '../../db/emotionalBeats';
import { listSymbolAttachmentsByAnchors } from '../../db/symbolAttachments';
import { listAssociationsByAnchors } from '../../db/associations';
import {
  createAnalysisPass as createAnalysisPassRecord,
  listAnalysisPassesByDream,
} from '../../db/analysisPasses';
import { getUserId } from '../../types/request';

const parseDreamId = (req: Request): number | null => {
  const id = Number(req.params.dreamId);
  return Number.isNaN(id) ? null : id;
};

export const listDreams = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dreams = await listDreamsByUser({ userId: getUserId(req) });
    res.status(200).json({ dreams });
  } catch (err) {
    next(err);
  }
};

export const createDream = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateDreamInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, narrative } = req.body as CreateDreamRequest;
  try {
    const dream = await createDreamRecord({
      userId: getUserId(req),
      date,
      narrative: sanitizeDreamNarrative(narrative),
    });
    res.status(201).json({ dream });
  } catch (err) {
    next(err);
  }
};

export const getDream = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const dream = await findDreamById({ id: dreamId, userId: getUserId(req) });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    const dreamAnchors = await listAnchorsByDream({ dreamId });
    const anchorIds = dreamAnchors.map((anchor) => anchor.id);
    const beats = await listEmotionalBeatsByAnchors({ anchorIds });
    const attachments = await listSymbolAttachmentsByAnchors({ anchorIds });
    const associations = await listAssociationsByAnchors({ anchorIds });
    const analysisPasses = await listAnalysisPassesByDream({ dreamId });
    const anchors = dreamAnchors.map((anchor) => ({
      ...anchor,
      emotionalBeats: beats.filter((beat) => beat.anchorId === anchor.id),
      // Anchor-level associations (no named Symbol) render above the anchor's Symbol tags,
      // matching the order the analysis actually happens (issue #52).
      associations: associations.filter(
        (association) =>
          association.anchorId === anchor.id && association.symbolAttachmentId === null,
      ),
      symbolAttachments: attachments
        .filter((attachment) => attachment.anchorId === anchor.id)
        .map((attachment) => ({
          ...attachment,
          associations: associations.filter(
            (association) => association.symbolAttachmentId === attachment.id,
          ),
        })),
    }));
    res.status(200).json({ dream, anchors, analysisPasses });
  } catch (err) {
    next(err);
  }
};

export const updateDream = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateDreamInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, narrative } = req.body as UpdateDreamRequest;
  try {
    const dream = await updateDreamRecord({
      id: dreamId,
      userId: getUserId(req),
      date,
      narrative: sanitizeDreamNarrative(narrative),
    });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ dream });
  } catch (err) {
    next(err);
  }
};

export const createAnchor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const dream = await findDreamById({ id: dreamId, userId: getUserId(req) });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    const anchor = await createAnchorRecord({ dreamId });
    res.status(201).json({ anchor });
  } catch (err) {
    next(err);
  }
};

// Create is the only Analysis-pass route - no update or delete exists, by design, so the
// record of how a dream's understanding evolved stays trustworthy (CONTEXT.md).
export const createAnalysisPass = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const dreamId = parseDreamId(req);
  if (dreamId === null) {
    res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
    return;
  }
  const validation = validateAnalysisPassInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { type, content, anchorId } = req.body as CreateAnalysisPassRequest;
  try {
    const userId = getUserId(req);
    const dream = await findDreamById({ id: dreamId, userId });
    if (!dream) {
      res.status(404).json({ error: 'Dream not found' } satisfies ApiErrorResponse);
      return;
    }
    if (anchorId !== undefined && anchorId !== null) {
      const anchor = await findAnchorOwnedByUser({ anchorId, userId });
      if (!anchor || anchor.dreamId !== dreamId) {
        res.status(404).json({ error: 'Anchor not found' } satisfies ApiErrorResponse);
        return;
      }
    }
    const analysisPass = await createAnalysisPassRecord({
      dreamId,
      anchorId: anchorId ?? null,
      type,
      content: content.trim(),
    });
    res.status(201).json({ analysisPass });
  } catch (err) {
    next(err);
  }
};
