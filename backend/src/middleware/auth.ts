import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/request';

export const ensureAuth = (
  _req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void => {
  next();
};
