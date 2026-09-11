import { Request, Response, NextFunction } from 'express';
import { listSymbolsByUser } from '../../db/symbols';
import { getUserId } from '../../types/request';

// The user's Symbol vocabulary, for autocomplete: scoped to the authenticated user, with
// an optional q filter matched case-insensitively against symbol names.
export const listSymbols = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const query = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q : undefined;
  try {
    const symbols = await listSymbolsByUser({ userId: getUserId(req), query });
    res.status(200).json({ symbols });
  } catch (err) {
    next(err);
  }
};
