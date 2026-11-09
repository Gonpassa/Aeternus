import { Request, Response, NextFunction } from 'express';
import type {
  ApiErrorResponse,
  CreateLinkRequest,
  LinkResponse,
  UpdateLinkReasonRequest,
} from '@nee3/shared-types';
import {
  UnknownLinkTargetError,
  createLink as createLinkRecord,
  deleteLink as deleteLinkRecord,
  findLinkById,
  findPermanentNotesLeftUnlinked,
  updateLinkReason as updateLinkReasonRecord,
  type UnlinkedPermanentNote,
} from '../../db/links';
import { toLink } from './serialize';
import { validateLinkInput, validateLinkReason } from './validation';
import { sanitizeLinkReason } from './sanitize';
import { getUserId } from '../../types/request';

// Held to a whole positive number for the same reason a note id is: the column is an integer,
// so `/links/Infinity` would otherwise reach the query as a bind parameter.
const parseLinkId = (req: Request): number | null => {
  const id = Number(req.params.linkId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// A Link between two notes that both already exist. Distinct from the Permanent note
// composer's write, where the note and its Links are one transaction because the note cannot
// exist without them (ADR 0014); here both ends are filed and the Link is the only new thing.
//
// Linking back along a pair that is already linked is answered with the Link that is there,
// carrying this end's reason, rather than with a second row: there is at most one Link per
// unordered pair, and the user-facing move is to show what already exists (ADR 0013). The
// status says which happened - 201 for a Link made, 200 for a reason added to one.
export const createLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateLinkInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { originNoteId, targetNoteId, reason } = req.body as CreateLinkRequest;
  try {
    const { link, created } = await createLinkRecord({
      userId: getUserId(req),
      originNoteId,
      targetNoteId,
      reason: sanitizeLinkReason(reason),
    });
    res.status(created ? 201 : 200).json({ link: toLink(link) } satisfies LinkResponse);
  } catch (err) {
    // A note that is not this user's is answered as a bad request naming the problem rather
    // than as a 404 on the Link: the Link is what was being made, and it is one of its ends
    // that could not be found.
    if (err instanceof UnknownLinkTargetError) {
      res.status(400).json({
        error: 'That note could not be found to connect to.',
      } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

// Which end of a Link a note is, or null when it is neither. The reason a note can edit is the
// one it wrote: `reason` belongs to the origin, `targetReason` to the target (ADR 0013).
const endOf = (link: { originNoteId: number; targetNoteId: number }, noteId: number) => {
  if (link.originNoteId === noteId) return 'origin' as const;
  if (link.targetNoteId === noteId) return 'target' as const;
  return null;
};

// A reason rewritten in place by the end that wrote it. `fromNoteId` is which end is speaking,
// because a Link carries two reasons and neither end may edit the other's.
//
// An end that has written no reason yet is not editing but linking back, which is what POST
// does, so it is refused here rather than silently taking a first reason through an edit path.
export const updateLinkReason = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const linkId = parseLinkId(req);
  if (linkId === null) {
    res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
    return;
  }
  const { fromNoteId, reason } = req.body as UpdateLinkReasonRequest;
  const validation = validateLinkReason(reason);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const link = await findLinkById({ id: linkId, userId });
    if (!link) {
      res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
      return;
    }
    const end = endOf(link, Number(fromNoteId));
    if (end === null) {
      res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
      return;
    }
    if (end === 'target' && link.targetReason === null) {
      res.status(400).json({
        error: 'That end has not said why yet - connect back from it to add a reason.',
      } satisfies ApiErrorResponse);
      return;
    }
    const updated = await updateLinkReasonRecord({
      id: link.id,
      end,
      reason: sanitizeLinkReason(reason),
    });
    if (!updated) {
      res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ link: toLink(updated) } satisfies LinkResponse);
  } catch (err) {
    next(err);
  }
};

// The refusal names the ideas it is protecting, because that naming is what makes it
// actionable: the user's next move is to connect those notes elsewhere or delete them too, and
// neither is possible from a message that says only how many would be left (ADR 0014).
const orphanRefusal = (unlinked: UnlinkedPermanentNote[]): string => {
  const titles = unlinked.map(({ title }) => `“${title}”`).join(', ');
  return unlinked.length === 1
    ? `Removing this connection would leave ${titles} with none. Connect it elsewhere first, or delete it.`
    : `Removing this connection would leave these notes with none: ${titles}. Connect them elsewhere first, or delete them.`;
};

// Read, guard, delete - the three steps every destructive path in this module takes, kept
// distinct (ADR 0012). The guard here is ADR 0014's at its own endpoint: removing a Link is the
// symmetrical way to produce the state the save guard exists to prevent, so the removal is
// refused rather than warned about when it would take a Permanent note to zero Links, the
// count read in either direction.
export const deleteLink = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const linkId = parseLinkId(req);
  if (linkId === null) {
    res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
    return;
  }
  const userId = getUserId(req);
  try {
    const link = await findLinkById({ id: linkId, userId });
    if (!link) {
      res.status(404).json({ error: 'Connection not found' } satisfies ApiErrorResponse);
      return;
    }
    const unlinked = await findPermanentNotesLeftUnlinked({
      noteIds: [link.originNoteId, link.targetNoteId],
      userId,
      removedLinkIds: [link.id],
    });
    if (unlinked.length > 0) {
      res.status(409).json({ error: orphanRefusal(unlinked) } satisfies ApiErrorResponse);
      return;
    }
    await deleteLinkRecord({ id: link.id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
