import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '@nee3/shared-types';
import { validateRegisterInput, validateLoginInput } from './validation';
import { createUser, DuplicateUserError } from '../db/users';
import passport from '../config/passport';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validation = validateRegisterInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }

  const { username, email, password } = req.body as {
    username: string;
    email: string;
    password: string;
  };

  try {
    const user = await createUser(username, email, password);
    req.logIn(user, (err) => {
      if (err) {
        next(err);
        return;
      }
      res.status(201).json({ user });
    });
  } catch (err) {
    if (err instanceof DuplicateUserError) {
      res.status(409).json({ error: err.message } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

export const login = (req: Request, res: Response, next: NextFunction): void => {
  const validation = validateLoginInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }

  passport.authenticate(
    'local',
    (err: Error | null, user: Express.User | false, info: { message?: string } | undefined) => {
      if (err) {
        next(err);
        return;
      }
      if (!user) {
        res.status(401).json({
          error: info?.message ?? 'Invalid username or password',
        } satisfies ApiErrorResponse);
        return;
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          next(loginErr);
          return;
        }
        res.status(200).json({ user });
      });
    },
  )(req, res, next);
};

export const logout = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' } satisfies ApiErrorResponse);
    return;
  }
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        next(destroyErr);
        return;
      }
      res.status(200).json({ ok: true });
    });
  });
};

export const me = (req: Request, res: Response, _next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' } satisfies ApiErrorResponse);
    return;
  }
  res.status(200).json({ user: req.user });
};
