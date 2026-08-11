import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/request';

export const ensureAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};
