import type { Request } from 'express';

// Held to a whole positive number rather than merely to "not NaN": the column is an
// integer, so `/sources/Infinity` would otherwise reach the query as a bind parameter and
// come back as a 500 where the honest answer is that there is no such Source.
export const parseSourceId = (req: Request): number | null => {
  const id = Number(req.params.sourceId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Held to the same whole-positive-number rule as a Source id, and for the same reason: the
// column is an integer, so `/notes/Infinity` would otherwise reach the query as a bind
// parameter and come back as a 500 where the honest answer is that there is no such note.
export const parseNoteId = (req: Request): number | null => {
  const id = Number(req.params.noteId);
  return Number.isInteger(id) && id > 0 ? id : null;
};
