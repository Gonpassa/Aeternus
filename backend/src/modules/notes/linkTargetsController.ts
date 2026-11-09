import { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse, LinkTargetsResponse } from '@nee3/shared-types';
import {
  listNotesBySourceExcept,
  findNoteById,
  searchNotes,
  type NoteWithSourceTitle,
} from '../../db/notes';
import { listLinksForNote } from '../../db/links';
import { toLink, toLinkTargetCandidate } from './serialize';
import { getUserId } from '../../types/request';

// The two tiers the browsable panel reads, in one request. Browsing comes first and search
// second because linking must not depend on remembering how an older note was worded: the
// notes of the Source in front of the user are offered without a query, and the search tier
// is what reaches past them (#67).
//
// One endpoint rather than one per tier, and keyed on the note being linked from rather than
// on a Source, so that Review - which has a note and no reading page - asks exactly the same
// question when it reuses the panel.
export const listLinkTargets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const fromNoteId = Number(req.query.fromNoteId);
  if (!Number.isInteger(fromNoteId) || fromNoteId <= 0) {
    res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
    return;
  }
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const userId = getUserId(req);
  try {
    // The note is read first so another user's id answers "not found" rather than returning
    // empty tiers, which would read as a box with nothing in it to connect to.
    const fromNote = await findNoteById({ id: fromNoteId, userId });
    if (!fromNote) {
      res.status(404).json({ error: 'Note not found' } satisfies ApiErrorResponse);
      return;
    }
    // A Permanent note belongs to no Source, so it has no same-Source tier - the panel serves
    // both kinds and the first tier is simply empty for one of them.
    const sameSource: NoteWithSourceTitle[] =
      fromNote.kind === 'literature' && fromNote.sourceId !== null
        ? await listNotesBySourceExcept({
            sourceId: fromNote.sourceId,
            userId,
            exceptNoteId: fromNote.id,
          })
        : [];
    const found =
      query === '' ? [] : await searchNotes({ userId, query, exceptNoteId: fromNote.id });
    // A note already offered by the first tier is not offered again by the second: the panel
    // reads as one list in two parts, and the same card twice would read as two notes.
    const alreadyOffered = new Set(sameSource.map((row) => row.note.id));
    const results = found.filter((row) => !alreadyOffered.has(row.note.id));

    // The Links this note already has, read once: there is at most one Link per unordered
    // pair, so the note at the other end identifies it (ADR 0013). A candidate carrying one is
    // what the panel shows the existing Link from, instead of offering to make a second.
    const existing = await listLinksForNote({ noteId: fromNote.id });
    const byOtherEnd = new Map(
      existing.map((link) => [
        link.originNoteId === fromNote.id ? link.targetNoteId : link.originNoteId,
        link,
      ]),
    );
    const candidate = (row: NoteWithSourceTitle) =>
      toLinkTargetCandidate(row, byOtherEnd.get(row.note.id) ?? null);

    res.status(200).json({
      sameSource: sameSource.map(candidate),
      results: results.map(candidate),
      existingLinks: existing.map(toLink),
    } satisfies LinkTargetsResponse);
  } catch (err) {
    next(err);
  }
};
