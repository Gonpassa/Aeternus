# Phase 3 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire login, registration, logout, and session-check through the API, with a reusable protected-route guard on the backend and a real `AuthProvider` + login/register UI on the client.

**Architecture:** Backend: a new `backend/src/auth/` folder (validation, controller, routes) sitting on top of Phase 2's Passport/session/Drizzle foundation, mounted at `/api/auth` in `app.ts`; `middleware/auth.ts`'s `ensureAuth` becomes a real guard. Client: a new `client/src/auth/` folder (TanStack Query hooks + a `beforeLoad` guard helper) backing a real `AuthProvider`, plus `/login` and `/register` routes. `packages/shared-types` gets the wire-format types both sides import.

**Tech Stack:** Express, Passport (local strategy, already configured), express-session + connect-pg-simple (already configured), Drizzle/Postgres (already configured), `validator` (new dependency, email format checking), Jest + Supertest (backend tests), React + TanStack Router + TanStack Query + Axios (client, no test runner).

## Global Constraints

- API error responses always use `{ error: string }` — no alternate shape for validation vs. auth errors.
- Password minimum length is 4 characters (Harmonee parity, not tightened).
- No `passwordConfirm` field in the API — confirmation is client-form-only.
- `ensureAuth` / the client's `requireAuth` guard are built and exported this phase but **not applied to any route** — there is nothing to protect until Phase 4.
- No new client test framework is introduced — client auth code is verified manually via `npm run dev`.
- `backend/src/auth/` and `client/src/auth/` are flat, top-level folders — not under `src/modules/`, since auth is core layer, not a feature module.

---

## Task 1: Shared types for the auth API surface

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `AuthUser { id: number; username: string; email: string; createdAt: string; updatedAt: string }`, `RegisterRequest { username: string; email: string; password: string }`, `LoginRequest { username: string; password: string }`, `AuthResponse { user: AuthUser }`, `ApiErrorResponse { error: string }` — all exported from `@nee3/shared-types`, consumed by Task 3 (backend controller) and Task 6 (client queries).

- [ ] **Step 1: Write the types**

Replace the contents of `packages/shared-types/src/index.ts` (currently just `export {};`) with:

```ts
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  error: string;
}
```

- [ ] **Step 2: Build shared-types**

Run: `cd packages/shared-types && npm run build`
Expected: succeeds, `dist/index.js` and `dist/index.d.ts` regenerated with the new exports.

- [ ] **Step 3: Lint**

Run: `cd packages/shared-types && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/index.ts packages/shared-types/dist
git commit -m "feat(shared-types): add auth request/response types"
```

---

## Task 2: Backend auth input validation

**Files:**
- Create: `backend/src/auth/validation.ts`
- Test: `backend/src/auth/validation.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no dependencies on earlier tasks beyond none).
- Produces: `validateRegisterInput(input: { username?: unknown; email?: unknown; password?: unknown }): { valid: true } | { valid: false; error: string }` and `validateLoginInput(input: { username?: unknown; password?: unknown }): { valid: true } | { valid: false; error: string }`, both consumed by Task 3's controller.

- [ ] **Step 1: Add the `validator` dependency**

Run: `cd backend && npm install validator && npm install -D @types/validator`
Expected: `backend/package.json` gains `validator` under `dependencies` and `@types/validator` under `devDependencies`.

- [ ] **Step 2: Write the failing tests**

Create `backend/src/auth/validation.test.ts`:

```ts
import { validateRegisterInput, validateLoginInput } from './validation';

describe('validateRegisterInput', () => {
  it('accepts valid input', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: true });
  });

  it('rejects a missing username', () => {
    expect(
      validateRegisterInput({ username: '', email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Username is required.' });
  });

  it('rejects a missing email', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: '', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Email is required.' });
  });

  it('rejects an invalid email', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'not-an-email', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Please enter a valid email address.' });
  });

  it('rejects a password shorter than 4 characters', () => {
    expect(
      validateRegisterInput({ username: 'alice', email: 'alice@example.com', password: 'abc' }),
    ).toEqual({ valid: false, error: 'Password must be at least 4 characters long.' });
  });

  it('rejects non-string fields', () => {
    expect(
      validateRegisterInput({ username: 123, email: 'alice@example.com', password: 'abcd' }),
    ).toEqual({ valid: false, error: 'Username is required.' });
  });
});

describe('validateLoginInput', () => {
  it('accepts valid input', () => {
    expect(validateLoginInput({ username: 'alice', password: 'abcd' })).toEqual({ valid: true });
  });

  it('rejects a missing username', () => {
    expect(validateLoginInput({ username: '', password: 'abcd' })).toEqual({
      valid: false,
      error: 'Username is required.',
    });
  });

  it('rejects a missing password', () => {
    expect(validateLoginInput({ username: 'alice', password: '' })).toEqual({
      valid: false,
      error: 'Password is required.',
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && npx jest src/auth/validation.test.ts`
Expected: FAIL with "Cannot find module './validation'".

- [ ] **Step 4: Write the implementation**

Create `backend/src/auth/validation.ts`:

```ts
import validator from 'validator';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const validateRegisterInput = (input: {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}): ValidationResult => {
  if (!isNonEmptyString(input.username)) {
    return { valid: false, error: 'Username is required.' };
  }
  if (!isNonEmptyString(input.email)) {
    return { valid: false, error: 'Email is required.' };
  }
  if (!validator.isEmail(input.email)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  if (!isNonEmptyString(input.password) || input.password.length < 4) {
    return { valid: false, error: 'Password must be at least 4 characters long.' };
  }
  return { valid: true };
};

export const validateLoginInput = (input: {
  username?: unknown;
  password?: unknown;
}): ValidationResult => {
  if (!isNonEmptyString(input.username)) {
    return { valid: false, error: 'Username is required.' };
  }
  if (!isNonEmptyString(input.password)) {
    return { valid: false, error: 'Password is required.' };
  }
  return { valid: true };
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/auth/validation.test.ts`
Expected: PASS, all 9 tests.

- [ ] **Step 6: Lint**

Run: `cd backend && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/auth/validation.ts backend/src/auth/validation.test.ts
git commit -m "feat(backend): add auth input validation"
```

---

## Task 3: Backend auth controller

**Files:**
- Create: `backend/src/auth/controller.ts`
- Test: `backend/src/auth/controller.test.ts`

**Interfaces:**
- Consumes: `validateRegisterInput`, `validateLoginInput` from `./validation` (Task 2); `createUser`, `DuplicateUserError` from `../db/users` (existing); `passport` from `../config/passport` (existing, default export); `AuthUser`, `AuthResponse`, `ApiErrorResponse` from `@nee3/shared-types` (Task 1).
- Produces: `register`, `login`, `logout`, `me` — each `(req: Request, res: Response, next: NextFunction) => void`, consumed by Task 4's router.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/auth/controller.test.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import { register, logout, me } from './controller';
import * as userService from '../db/users';
import { DuplicateUserError } from '../db/users';

jest.mock('../db/users');

const mockedCreateUser = userService.createUser as jest.MockedFunction<
  typeof userService.createUser
>;

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const fakeUser = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('register', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for invalid input without calling createUser', async () => {
    const req = { body: { username: '', email: '', password: '' } } as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockedCreateUser).not.toHaveBeenCalled();
  });

  it('returns 409 when createUser throws DuplicateUserError', async () => {
    mockedCreateUser.mockRejectedValue(new DuplicateUserError('Username or email already exists'));
    const req = {
      body: { username: 'alice', email: 'alice@example.com', password: 'abcd' },
      logIn: jest.fn((_user, cb: (err?: unknown) => void) => cb()),
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username or email already exists' });
  });

  it('logs the user in and returns 201 on success', async () => {
    mockedCreateUser.mockResolvedValue(fakeUser);
    const logIn = jest.fn((_user, cb: (err?: unknown) => void) => cb());
    const req = {
      body: { username: 'alice', email: 'alice@example.com', password: 'abcd' },
      logIn,
    } as unknown as Request;
    const res = buildRes();
    const next = jest.fn() as NextFunction;

    await register(req, res, next);

    expect(logIn).toHaveBeenCalledWith(fakeUser, expect.any(Function));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });
});

describe('logout', () => {
  it('returns 401 when not authenticated', () => {
    const req = {
      isAuthenticated: () => false,
    } as unknown as Request;
    const res = buildRes();

    logout(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('destroys the session and returns 200 when authenticated', () => {
    const logoutFn = jest.fn((cb: (err?: unknown) => void) => cb());
    const destroy = jest.fn((cb: (err?: unknown) => void) => cb());
    const req = {
      isAuthenticated: () => true,
      logout: logoutFn,
      session: { destroy },
    } as unknown as Request;
    const res = buildRes();

    logout(req, res, jest.fn());

    expect(logoutFn).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

describe('me', () => {
  it('returns 401 when not authenticated', () => {
    const req = { isAuthenticated: () => false } as unknown as Request;
    const res = buildRes();

    me(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });

  it('returns the user when authenticated', () => {
    const req = { isAuthenticated: () => true, user: fakeUser } as unknown as Request;
    const res = buildRes();

    me(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/auth/controller.test.ts`
Expected: FAIL with "Cannot find module './controller'".

- [ ] **Step 3: Write the implementation**

Create `backend/src/auth/controller.ts`:

Note: `AuthUser` (from `@nee3/shared-types`) types `createdAt`/`updatedAt` as `string` because it describes the JSON wire format after serialization. The backend's `PublicUser` (from `db/users.ts`, used for `req.user` and `createUser`'s return value) types them as `Date`, since that's the in-process shape before `res.json()` serializes it. These are the same object at runtime but different TS types, so responses built from `PublicUser` are sent as plain `res.json({ user })` without an `AuthResponse`/`satisfies` annotation — annotating them would force an incorrect cast. `ApiErrorResponse` has no such mismatch (its shape is exact), so error responses do use `satisfies ApiErrorResponse`.

```ts
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
        res
          .status(401)
          .json({ error: info?.message ?? 'Invalid username or password' } satisfies ApiErrorResponse);
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

export const me = (req: Request, res: Response): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' } satisfies ApiErrorResponse);
    return;
  }
  res.status(200).json({ user: req.user });
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/auth/controller.test.ts`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Lint**

Run: `cd backend && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth/controller.ts backend/src/auth/controller.test.ts
git commit -m "feat(backend): add auth controller (register/login/logout/me)"
```

---

## Task 4: Backend auth routes + app wiring

**Files:**
- Create: `backend/src/auth/routes.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/auth/routes.test.ts`

**Interfaces:**
- Consumes: `register`, `login`, `logout`, `me` from `./controller` (Task 3); `loginRateLimiter` from `../middleware/rateLimit` (existing); `createApp` from `../app` (existing, modified here); `runMigrations` from `../db/migrate`, `db`/`pool` from `../db`, `createUser` from `../db/users` (existing, for the integration test, following the pattern in `../config/passport.integration.test.ts`).
- Produces: default-exported Express `Router` from `./routes`, mounted at `/api/auth`, consumed by nothing later in this plan (it's the leaf HTTP surface).

- [ ] **Step 1: Write the failing integration tests**

Create `backend/src/auth/routes.test.ts`:

```ts
import request, { Response as SupertestResponse } from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../db/migrate';
import { db, pool } from '../db';
import { createUser } from '../db/users';
import { createApp } from '../app';

describe('auth routes (integration)', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const agent = () => request.agent(createApp());

  describe('POST /api/auth/register', () => {
    it('creates a user, logs them in, and returns 201', async () => {
      const a = agent();
      const res = await a
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'alice@example.com', password: 'abcd' });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual(
        expect.objectContaining({ username: 'alice', email: 'alice@example.com' }),
      );
      expect(res.body.user.password).toBeUndefined();

      const meRes = await a.get('/api/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe('alice');
    });

    it('returns 400 for an invalid email', async () => {
      const res = await agent()
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'not-an-email', password: 'abcd' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 409 for a duplicate username', async () => {
      await createUser('alice', 'alice@example.com', 'abcd');

      const res = await agent()
        .post('/api/auth/register')
        .send({ username: 'alice', email: 'someone-else@example.com', password: 'abcd' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createUser('alice', 'alice@example.com', 'correct-password');
    });

    it('logs in with valid credentials and returns 200', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('alice');
    });

    it('returns 401 for an unknown username', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'nobody', password: 'whatever' });

      expect(res.status).toBe(401);
    });

    it('returns 401 for a wrong password', async () => {
      const res = await agent()
        .post('/api/auth/login')
        .send({ username: 'alice', password: 'wrong-password' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 401 when not logged in', async () => {
      const res = await agent().post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('clears the session for a logged-in user', async () => {
      await createUser('alice', 'alice@example.com', 'correct-password');
      const a = agent();
      await a.post('/api/auth/login').send({ username: 'alice', password: 'correct-password' });

      const logoutRes = await a.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ ok: true });

      const meRes: SupertestResponse = await a.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when not logged in', async () => {
      const res = await agent().get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/auth/routes.test.ts`
Expected: FAIL — `/api/auth/*` routes don't exist yet (404s instead of expected status codes).

- [ ] **Step 3: Write the router**

Create `backend/src/auth/routes.ts`:

```ts
import { Router } from 'express';
import { register, login, logout, me } from './controller';
import { loginRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', me);

export default router;
```

- [ ] **Step 4: Mount the router in `app.ts`**

In `backend/src/app.ts`, add the import and mount it after the passport session middleware, before `/api/health`:

```ts
import express, { Express } from 'express';
import cors from 'cors';
import sessionMiddleware from './config/session';
import passport from './config/passport';
import authRouter from './auth/routes';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/api/auth', authRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest src/auth/routes.test.ts`
Expected: PASS, all 9 tests. Requires the local Postgres test DB from `CLAUDE.md`'s setup (`nee3_test`, `backend/.env.test` present) — same prerequisite as the existing `passport.integration.test.ts`.

- [ ] **Step 6: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS — all existing tests plus the new ones.

- [ ] **Step 7: Lint**

Run: `cd backend && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth/routes.ts backend/src/auth/routes.test.ts backend/src/app.ts
git commit -m "feat(backend): mount auth routes at /api/auth"
```

---

## Task 5: Real `ensureAuth` middleware

**Files:**
- Modify: `backend/src/middleware/auth.ts`
- Test: `backend/src/middleware/auth.test.ts` (new)

**Interfaces:**
- Consumes: `AuthenticatedRequest` from `../types/request` (existing, unchanged — it's already `Request`, and `req.isAuthenticated()`/`req.user` are available on it via Passport's own type augmentation plus the project's `types/express.d.ts`).
- Produces: `ensureAuth(req, res, next): void`, exported for Phase 4's journal routes to import — not consumed anywhere in this plan.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/middleware/auth.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest src/middleware/auth.test.ts`
Expected: FAIL — current `ensureAuth` always calls `next()`, so the 401 test fails.

- [ ] **Step 3: Update the implementation**

Replace `backend/src/middleware/auth.ts`:

```ts
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/request';

export const ensureAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest src/middleware/auth.test.ts`
Expected: PASS, both tests.

- [ ] **Step 5: Run the full backend test suite and lint**

Run: `cd backend && npm test && npm run lint`
Expected: PASS, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/auth.ts backend/src/middleware/auth.test.ts
git commit -m "feat(backend): implement ensureAuth as a real auth guard"
```

---

## Task 6: Client auth endpoints + TanStack Query hooks

**Files:**
- Modify: `client/src/api/endpoints.ts`
- Create: `client/src/auth/queries.ts`

**Interfaces:**
- Consumes: `apiClient` from `../api/client` (existing Axios instance); `AuthUser`, `AuthResponse`, `RegisterRequest`, `LoginRequest` from `@nee3/shared-types` (Task 1).
- Produces: `useCurrentUser(): UseQueryResult<AuthUser | null>`, `useLogin(): UseMutationResult<AuthUser, Error, LoginRequest>`, `useRegister(): UseMutationResult<AuthUser, Error, RegisterRequest>`, `useLogout(): UseMutationResult<void, Error, void>`, and the query key `authQueryKey = ['auth', 'me']` — all consumed by Task 7's `AuthProvider` and Task 8's login/register routes.

No test file for this task — no client test runner exists yet (see spec's Testing section); this is manually verified in Task 9 once the routes exist to exercise it through the browser.

- [ ] **Step 1: Add auth endpoint paths**

Replace `client/src/api/endpoints.ts`:

```ts
export const endpoints = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
} as const;
```

- [ ] **Step 2: Write the query/mutation hooks**

Create `client/src/auth/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@nee3/shared-types';
import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';

export const authQueryKey = ['auth', 'me'] as const;

export const useCurrentUser = () =>
  useQuery<AuthUser | null>({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<AuthResponse>(endpoints.auth.me);
        return data.user;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
  });

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      const { data } = await apiClient.post<AuthResponse>(endpoints.auth.login, credentials);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, Error, RegisterRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<AuthResponse>(endpoints.auth.register, input);
      return data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await apiClient.post(endpoints.auth.logout);
    },
    onSuccess: () => {
      queryClient.setQueryData(authQueryKey, null);
    },
  });
};
```

- [ ] **Step 3: Lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/endpoints.ts client/src/auth/queries.ts
git commit -m "feat(client): add auth query/mutation hooks"
```

---

## Task 7: Real `AuthProvider` + `useAuth` hook

**Files:**
- Modify: `client/src/shell/AuthProvider.tsx`

**Interfaces:**
- Consumes: `useCurrentUser`, `useLogin`, `useRegister`, `useLogout` from `../auth/queries` (Task 6).
- Produces: `AuthProvider({ children }): ReactNode` (unchanged signature, real implementation) and `useAuth(): { user: AuthUser | null; isLoading: boolean; login: UseMutationResult<...>['mutateAsync']; register: ...; logout: ... }`, consumed by Task 8's login/register routes and Task 9's `Nav`.

- [ ] **Step 1: Write the implementation**

Replace `client/src/shell/AuthProvider.tsx`:

```tsx
import { createContext, PropsWithChildren, ReactNode, useContext, useMemo } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest } from '@nee3/shared-types';
import { useCurrentUser, useLogin, useLogout, useRegister } from '../auth/queries';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  register: (input: RegisterRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): ReactNode {
  const { data: user, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      login: (credentials) => loginMutation.mutateAsync(credentials),
      register: (input) => registerMutation.mutateAsync(input),
      logout: () => logoutMutation.mutateAsync(),
    }),
    [user, isLoading, loginMutation, registerMutation, logoutMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/shell/AuthProvider.tsx
git commit -m "feat(client): implement real AuthProvider backed by TanStack Query"
```

---

## Task 8: Login and register routes

**Files:**
- Create: `client/src/routes/login.tsx`
- Create: `client/src/routes/register.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../shell/AuthProvider` (Task 7).
- Produces: file-based routes `/login` and `/register` (regenerates `client/src/routeTree.gen.ts` automatically via the dev server / build — never hand-edit that file), consumed by Task 9's `Nav` links.

- [ ] **Step 1: Write the login route**

Create `client/src/routes/login.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { useAuth } from '../shell/AuthProvider';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      navigate({ to: '/' });
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1" htmlFor="login-username">
          Username
          <input
            id="login-username"
            className="border border-gray-300 p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="login-password">
          Password
          <input
            id="login-password"
            type="password"
            className="border border-gray-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="bg-black p-2 text-white">
          Log in
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write the register route**

Create `client/src/routes/register.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FormEvent, useState } from 'react';
import { useAuth } from '../shell/AuthProvider';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await register({ username, email, password });
      navigate({ to: '/' });
    } catch {
      setError('Could not create account. Username or email may already be taken.');
    }
  };

  return (
    <div className="mx-auto max-w-sm p-4">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1" htmlFor="register-username">
          Username
          <input
            id="register-username"
            className="border border-gray-300 p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-email">
          Email
          <input
            id="register-email"
            type="email"
            className="border border-gray-300 p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-password">
          Password
          <input
            id="register-password"
            type="password"
            className="border border-gray-300 p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1" htmlFor="register-confirm-password">
          Confirm password
          <input
            id="register-confirm-password"
            type="password"
            className="border border-gray-300 p-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="bg-black p-2 text-white">
          Register
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Regenerate the route tree**

Run: `cd client && npm run dev` (start it, let the TanStack Router Vite plugin regenerate `src/routeTree.gen.ts`, then stop it), or `npx tsr generate` if available. Confirm `client/src/routeTree.gen.ts` now includes `/login` and `/register` routes.
Expected: `routeTree.gen.ts` is modified (auto-generated, do not hand-edit) to include the new routes.

- [ ] **Step 4: Lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/routes/login.tsx client/src/routes/register.tsx client/src/routeTree.gen.ts
git commit -m "feat(client): add login and register routes"
```

---

## Task 9: Route guard helper + Nav auth state

**Files:**
- Create: `client/src/auth/requireAuth.ts`
- Modify: `client/src/shell/Nav.tsx`

**Interfaces:**
- Consumes: `authQueryKey` from `./queries` (Task 6); `useAuth` from `../shell/AuthProvider` (Task 7); a `QueryClient` instance (passed in by whichever future route calls this).
- Produces: `requireAuth(queryClient: QueryClient): (opts: { location: { href: string } }) => void` — a `beforeLoad` guard factory for Phase 4 routes to import; not called by any route in this plan.

- [ ] **Step 1: Write the guard helper**

Create `client/src/auth/requireAuth.ts`:

```ts
import { redirect } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@nee3/shared-types';
import { authQueryKey } from './queries';

export const requireAuth =
  (queryClient: QueryClient) =>
  ({ location }: { location: { href: string } }): void => {
    const user = queryClient.getQueryData<AuthUser | null>(authQueryKey);
    if (!user) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  };
```

- [ ] **Step 2: Update `Nav` to reflect auth state**

Replace `client/src/shell/Nav.tsx`:

```tsx
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider';

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/' });
  };

  return (
    <nav className="flex items-center gap-4 border-b border-gray-200 p-4">
      <Link to="/" className="font-medium">
        Nee.3
      </Link>
      <div className="ml-auto flex items-center gap-4">
        {user ? (
          <>
            <span>{user.username}</span>
            <button type="button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login">Log in</Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/auth/requireAuth.ts client/src/shell/Nav.tsx
git commit -m "feat(client): add route guard helper and auth-aware nav"
```

---

## Task 10: Manual end-to-end verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: nothing — this is the phase's acceptance check.

- [ ] **Step 1: Start Postgres and the backend**

Confirm `nee3` (dev) and `nee3_test` databases exist per the README's Postgres setup, `backend/.env` has a real `SESSION_SECRET`, then run:

```bash
cd backend && npm run db:migrate && npm run dev
```

Expected: server starts on the configured port without errors.

- [ ] **Step 2: Start the client**

```bash
cd client && npm run dev
```

Expected: Vite dev server starts; open the printed URL in a browser.

- [ ] **Step 3: Exercise the register flow**

In the browser: navigate to `/register`, submit a new username/email/password. Confirm redirect to `/`, and `Nav` now shows the username and a "Log out" button instead of "Log in".

- [ ] **Step 4: Exercise the logout/login flow**

Click "Log out". Confirm `Nav` reverts to showing "Log in". Navigate to `/login`, log back in with the same credentials. Confirm redirect to `/` and `Nav` shows the username again.

- [ ] **Step 5: Exercise error paths**

Try registering with an already-used username (confirm an error message renders, no redirect). Try logging in with a wrong password (confirm an error message renders, no redirect).

- [ ] **Step 6: Run the full test suites and lint one more time**

```bash
cd backend && npm test && npm run lint
cd ../client && npm run lint
cd ../packages/shared-types && npm run lint
```

Expected: everything passes.

- [ ] **Step 7: Push the branch**

```bash
git push -u Aeternus phase3-authentication
```

(Branch was already created off `main` per the user's request to skip an isolated worktree for this phase; this pushes it for PR review.)
