import type { Request } from 'express';

// Held to a whole positive number rather than merely to "not NaN": the column is an
// integer, so `/sources/Infinity` would otherwise reach the query as a bind parameter and
// come back as a 500 where the honest answer is that there is no such Source.
export const parseSourceId = (req: Request): number | null => {
  const id = Number(req.params.sourceId);
  return Number.isInteger(id) && id > 0 ? id : null;
};
