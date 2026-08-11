import { Response, NextFunction } from 'express';
import { ensureAuth } from './auth';
import { AuthenticatedRequest } from '../types/request';

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('ensureAuth', () => {
  it('calls next() when authenticated', () => {
    const req = { isAuthenticated: () => true } as unknown as AuthenticatedRequest;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    ensureAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', () => {
    const req = { isAuthenticated: () => false } as unknown as AuthenticatedRequest;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    ensureAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });
});
