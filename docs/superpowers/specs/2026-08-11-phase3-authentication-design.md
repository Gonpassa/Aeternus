# Phase 3 — Authentication: Design

## Context

Phase 2 built the account/session foundation: a Postgres `users` table (Drizzle), a Passport local strategy with working serialize/deserialize, `express-session` backed by `connect-pg-simple`, a login rate limiter, and stub types (`AuthenticatedRequest`, `ensureAuth`) waiting to be filled in.
Nothing yet exposes this over HTTP, and the client has no way to log in, register, or know who's logged in.

Phase 3 wires this up end to end: register/login/logout/session-check endpoints on the backend, protected-route middleware ready for future modules to use, and a real `AuthProvider` plus login/register UI on the client.
Journal and other feature modules (Phase 4+) are out of scope — this phase only builds the auth layer they'll sit on top of.

## API Contract

All endpoints are under `/api/auth`, JSON in and out. Errors use a single envelope: `{ error: string }`, matching the shape already shipped by `middleware/rateLimit.ts`.

| Method | Path | Request body | Success | Error cases |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password }` | 201 `{ user: AuthUser }`, session established | 400 invalid input, 409 username or email already taken |
| POST | `/api/auth/login` | `{ username, password }` | 200 `{ user: AuthUser }`, session established | 400 missing fields, 401 bad credentials, 429 rate-limited |
| POST | `/api/auth/logout` | — | 200 `{ ok: true }`, session destroyed | 401 if not logged in |
| GET | `/api/auth/me` | — | 200 `{ user: AuthUser }` | 401 if not logged in |

Validation rules (matching Harmonee's existing bar, kept as-is rather than tightened):
- `username`, `email`, `password` all required/non-empty on register.
- `email` must pass format validation (via the `validator` package, same library Harmonee uses).
- `password` must be at least 4 characters.
- No `passwordConfirm` field in the API — password confirmation is a client-form-only concern; the API accepts a single `password`.
- `username`/`email` uniqueness is enforced by the existing `createUser` (throws `DuplicateUserError` on a Postgres unique-constraint violation, already implemented in `db/users.ts`).

## Backend Implementation

New folder `backend/src/auth/`, kept flat and separate from `config/`, `db/`, `middleware/` (consistent with the existing pre-module core layout — this is not a `src/modules/<name>` folder, since auth isn't one of the README's feature modules).

- **`src/auth/validation.ts`** — pure functions `validateRegisterInput(input)` and `validateLoginInput(input)`, each returning `{ valid: true } | { valid: false, error: string }`. No framework dependency, easy to unit test.
- **`src/auth/controller.ts`** — request handlers:
  - `register`: validate → `createUser` → catch `DuplicateUserError` → 409; on success, `req.logIn(user, cb)` to establish the session → 201 `{ user }`.
  - `login`: validate field presence → `passport.authenticate('local', (err, user, info) => ...)` custom callback → on failure, 401 `{ error: info.message }`; on success, `req.logIn(user, cb)` → 200 `{ user }`.
  - `logout`: `req.logout(cb)` then `req.session.destroy(cb)` → 200 `{ ok: true }`. 401 if `req.isAuthenticated()` is false.
  - `me`: `req.isAuthenticated()` ? 200 `{ user: req.user }` : 401 `{ error: 'Not authenticated' }`.
- **`src/auth/routes.ts`** — an Express `Router`:
  ```
  POST /register  -> controller.register
  POST /login      -> loginRateLimiter, controller.login
  POST /logout      -> controller.logout
  GET  /me           -> controller.me
  ```
- **`src/middleware/auth.ts`** — `ensureAuth` becomes a real guard: `req.isAuthenticated() ? next() : res.status(401).json({ error: 'Not authenticated' })`. Not applied to any route in this phase (nothing to protect yet), but exported ready for Phase 4's journal routes to use.
- **`src/app.ts`** — mount `app.use('/api/auth', authRouter)` alongside the existing session/passport wiring.
- **`backend/package.json`** — add the `validator` dependency (+ `@types/validator`).

## Shared Types

`packages/shared-types/src/index.ts` currently exports nothing (`export {}`). Add:

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

Dates are `string` (not `Date`) because these types describe the JSON wire shape, not the Postgres row shape (`db/users.ts`'s `PublicUser` keeps `Date` for internal use). Backend request handlers and client query/mutation code both import from `@nee3/shared-types` instead of maintaining parallel shapes.

## Client Implementation

- **`src/api/endpoints.ts`** — add:
  ```ts
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  }
  ```
- **`src/auth/queries.ts`** (new top-level folder, mirrors the backend's `src/auth/` split — not under `src/modules/`, since auth isn't a feature module):
  - `useCurrentUser()` — TanStack Query wrapping `GET /auth/me`. `retry: false`; a 401 is treated as "no user" (resolves to `null`), not a thrown error, so the app doesn't show an error state on first load while logged out.
  - `useLogin()`, `useRegister()`, `useLogout()` — TanStack mutations that call the respective endpoints and, on success, write the returned user into the `me` query cache (`queryClient.setQueryData`) so `AuthProvider` updates immediately without a refetch.
- **`src/shell/AuthProvider.tsx`** — replaces the current no-op passthrough. Uses `useCurrentUser()` internally, exposes `{ user, isLoading, login, register, logout }` through React context, consumed via a `useAuth()` hook.
- **`src/routes/login.tsx`, `src/routes/register.tsx`** — new file-based routes with plain forms (username/email/password; register form also has a client-side-only `confirmPassword` field checked before submit — never sent to the API). On success, redirect to `/`.
- **`src/auth/requireAuth.ts`** — a reusable `beforeLoad` helper for TanStack Router routes: checks the query client's cached `me` state and redirects to `/login?redirect=<path>` if there's no user. Built and exported in this phase but **not applied to any route yet** — there's nothing to protect until Phase 4's journal routes exist. This ships the pattern Phase 4 will use, without inventing protected routes prematurely.
- **`src/shell/Nav.tsx`** — minimal update: show "Log in" (linking to `/login`) when logged out, or the username + a "Log out" action when logged in.

## Testing

- **Backend**: new `src/auth/validation.test.ts` (unit tests, no DB), and `src/auth/routes.test.ts` (supertest against `createApp()`, following the existing `passport.integration.test.ts` pattern against the real test Postgres DB for session-dependent behavior) covering: register success, register with duplicate username/email, register with invalid email/short password, login success, login with wrong password, login with unknown username, login rate-limiting, logout clears the session, `me` when authenticated vs. not.
- **Client**: no test runner exists yet for `client/` (Phase 2 built `AuthProvider`/`Layout`/`Nav` without one). Consistent with that precedent, this phase's client code is verified manually via `npm run dev` in a browser rather than introducing a new test framework as a side effect.

## Out of Scope

- Applying `ensureAuth`/`requireAuth` to any actual protected route — no protected resource exists until Phase 4.
- Password reset / email verification flows — not part of Harmonee's feature set being carried over, and not requested for this phase.
- OAuth/social login — not in the README's plan.
