# Nee.3 Phase 2 — Account/Session Layer Design

## Context

Phase 1 (architecture scaffold) is complete: a working, empty npm-workspaces monorepo with client, backend, and shared-types packages, documented in `docs/superpowers/specs/2026-08-10-phase1-architecture-scaffold-design.md`.
Per the README's build plan, Phase 2 ("Backend API core") sets up the account/session layer that every future module sits on top of, without building the login/registration routes themselves — that is Phase 3 ("Authentication"), which wires those routes through the API, adds real protected-route middleware, and adds a client auth context.

This spec also revisits a Phase 1 decision: during brainstorming, the choice of MongoDB/Mongoose (set in Phase 1's scaffold) was reconsidered against PostgreSQL.
The data model for this app (users owning entries, structured-writing pieces backlinking to each other, calendar events relating to journal dates) is inherently relational, and the stated long-term goals (data visualization, AI-driven generalization across entries) both favor SQL's join/aggregation strengths over MongoDB's document flexibility, which this app's well-defined schemas don't need.
The database layer is therefore switched from MongoDB/Mongoose to PostgreSQL/Drizzle as part of this phase, before the account/session layer is built on top of it.

This spec does not design the journal, structured-writing, calendar, or AI-learning data models — those remain scoped to their own phases per the README's "no premature abstraction" principle. The user model and account/session infrastructure below is the one exception, since every module depends on it.

## Goals

- Replace the Mongo/Mongoose data layer from Phase 1 with PostgreSQL via Drizzle ORM.
- Add a `users` table and a small user service (create, find, verify password) that Phase 3's registration/login routes will call into.
- Wire session handling (`express-session` + `connect-pg-simple`) and Passport's local strategy into `app.ts`, so Phase 3 only needs to add routes and flip `ensureAuth` from its current stub to a real check.
- Add a reusable rate-limiting middleware, ready for Phase 3 to attach to the login route.
- Keep all of this DB-agnostic to future modules: nothing here builds journal/writing/calendar schemas.

## Database layer (Mongo → Postgres/Drizzle)

- Local Postgres is provisioned natively (e.g. via Homebrew), not via Docker — reachable through a `DATABASE_URL` connection string. This is a deliberate simpler choice over Docker Compose, accepting manual version/test-DB management in exchange for no added Docker dependency.
- Dependencies: remove `mongoose`; add `pg` (driver), `drizzle-orm`, `drizzle-kit` (dev dependency, for migrations).
- `src/db/schema.ts` — Drizzle table definitions, starting with `users`.
- `src/db/index.ts` — replaces `config/database.ts`. Creates a `pg.Pool` and a Drizzle client (`db`), exported for use by services. Connection is verified with a startup health-check query.
- `drizzle.config.ts` at the backend root, pointing at `src/db/schema.ts`, with migrations output to `src/db/migrations/`.
- `.env` / `.env.example`: `DB_STRING` is replaced by `DATABASE_URL` (Postgres connection string).
- `src/index.ts` calls the new connect function in place of `connectDB`. Failure to connect still logs and calls `process.exit(1)`, matching today's fail-fast behavior.

## User model

`users` table (`src/db/schema.ts`):

| column       | type                          | notes                          |
|--------------|-------------------------------|---------------------------------|
| `id`         | serial, primary key           |                                  |
| `username`   | text, unique, not null        | stored lowercase (enforced in the service layer, not the DB) |
| `email`      | text, unique, not null        | stored lowercase |
| `password`   | text, not null                | bcrypt hash, never selected back to callers except within the service |
| `createdAt`  | timestamp, `defaultNow()`     |                                  |
| `updatedAt`  | timestamp, `defaultNow()`     |                                  |

Drizzle has no Mongoose-style pre-save hooks, so hashing and comparison move into a small repository/service, `src/db/users.ts`:

- `createUser(username, email, password)` — lowercases `username`/`email`, hashes `password` with bcrypt (cost factor 10, matching Harmonee), inserts the row. Catches a Postgres unique-constraint violation and re-throws it as a typed `DuplicateUserError`, so Phase 3's registration route can turn it into a clean 409 without parsing driver error codes.
- `findByUsername(username)` — case-insensitive lookup (lowercases the input to match stored casing).
- `verifyPassword(user, candidatePassword)` — `bcrypt.compare`.
- `findByIdPublic(id)` — selects `id`, `username`, `email`, `createdAt`, `updatedAt` only (excludes `password`), used by `deserializeUser`.

## Session & Passport wiring

- `src/config/passport.ts` — Passport local strategy: looks up the user via `findByUsername`, verifies the password via `verifyPassword`, calls `done(null, user)` on success or `done(null, false, { message })` on a missing user or wrong password (mirroring Harmonee's messages). `serializeUser` stores `user.id`. `deserializeUser` calls `findByIdPublic`, so `req.user` never carries the password hash — an improvement over Harmonee, which deserializes the full document.
- Session store: `connect-pg-simple`, backed by the same `pg.Pool` used by Drizzle.
- Cookie config: `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production only, `maxAge` of 7 days.
- `SESSION_SECRET` becomes a new required env var. The app fails fast at startup (thrown error, no silent fallback in any environment) if it's missing — a guessable or empty secret defeats session security entirely.
- `app.ts` wires `express-session` (with the `connect-pg-simple` store) and `passport.initialize()` / `passport.session()` into the middleware chain. No route calls `passport.authenticate` yet, so this is inert until Phase 3 adds routes, but it means Phase 3 only adds routes and flips `ensureAuth`'s stub `next()` to a real `req.isAuthenticated()` check.

## Rate limiting

- `src/middleware/rateLimit.ts` — a reusable `express-rate-limit`-based middleware, built now even though the login route doesn't exist yet, so Phase 3 just imports and attaches it rather than building auth-adjacent infra alongside the route itself. In-memory store (default), which is fine for a single-instance personal app; no external store (e.g. Redis) is introduced.

## Data flow

1. Login attempt (route added in Phase 3) → Passport local strategy → `findByUsername` → `verifyPassword` → `done(...)`.
2. On success, `serializeUser` stores `user.id` in the session; the session is persisted server-side in Postgres via `connect-pg-simple`, keyed by the session-id cookie sent to the client.
3. On each subsequent request, `deserializeUser(id)` calls `findByIdPublic` and attaches the result (no password) to `req.user`.

## Error handling

- DB connection failure at startup → log + `process.exit(1)` (unchanged pattern).
- Missing `SESSION_SECRET` → fail fast at startup with a clear thrown error.
- Duplicate username/email on `createUser` → caught in the service layer, re-thrown as `DuplicateUserError` for the future registration route to translate into a 409.

## Testing

Tests run against a real local Postgres database — a separate `nee3_test` database on the same local Postgres instance, configured via a test-specific `DATABASE_URL` override (documented as a one-time local setup step; no CI pipeline exists yet to provision this automatically). Migrations run against the test database before tests execute.

Coverage for this phase:

- **User service**: password is hashed on `createUser` (never stored plaintext), `verifyPassword` correctly matches/rejects, duplicate username/email throws `DuplicateUserError`.
- **Passport strategy**: valid login succeeds, wrong password fails with the expected message, unknown username fails, `serializeUser`/`deserializeUser` round-trip and confirm the deserialized user has no `password` field.
- **Rate limiter**: exceeding the configured request threshold returns 429.
- **`app.test.ts`** (extended): health check still passes with session middleware wired in; a request produces a `Set-Cookie` session cookie.

## Out of scope for this spec

- Login/registration routes and the real `ensureAuth` check (Phase 3).
- Client-side auth context and any client changes (Phase 3).
- Journal, structured-writing, calendar, or AI-learning data models (their own phases).
- CI/automated test-database provisioning — deferred until a CI pipeline exists (Phase 8 or earlier if it becomes a pain point).
