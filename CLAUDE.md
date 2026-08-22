# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Aeternus is a personal hub application (journaling, structured writing, calendar, AI-assisted learning) and the current, planned rewrite of Harmonee. It lives inside a parent folder containing two other, unrelated generations of the same app (`harmonee/`, `Nee.2/`) — each is a separate git repository. This directory (`Aeternus/`) is its own git repo, branch `main`, with a remote named `Aeternus` pointing at `github.com/Gonpassa/Aeternus`.

**Phases 1-4 are complete.** The npm-workspaces monorepo skeleton, backend API core (Postgres/Drizzle, sessions), authentication (Passport session auth, protected routes, client `AuthProvider`), and the journal module (entries CRUD, mood tagging, calendar filter, rich text editor) are all built and covered by tests on both sides. Journal insights/overview is deferred to a later pass. `backend/src/modules/` and `client/src/modules/` currently hold only the `journal` module — `writing`, `calendar`, and `learning` (Phases 5-7) haven't started. Don't design those later-phase data models before their phase starts.

See `docs/adr/0001-npm-workspaces-monorepo.md` for the Phase 1 architecture rationale, and `README.md` for the full module descriptions and 8-phase build plan (Setup → Backend API core → Auth → Journal → Structured Writing → Calendar → AI learning → Deployment). Follow that phase order rather than jumping ahead.

## Commands

Root-level (npm workspaces; run from `Aeternus/`):

```sh
npm install                # installs all three workspaces
npm run lint                # lint --workspaces --if-present (client, backend, shared-types)
npm run format               # prettier --write "**/*.{ts,tsx,md,json}"
npm run build                 # builds shared-types, then client (backend has no build script yet)
npm test                       # runs backend jest suite
```

Backend (`backend/`):

```sh
npm run dev      # nodemon src/index.ts
npm start        # ts-node src/index.ts
npm run lint      # eslint 'src/**/*.ts'
npm test           # jest (ts-jest, testEnvironment: node)
npx jest path/to/file.test.ts   # run a single test file
npm run db:generate  # drizzle-kit generate — create a migration from schema.ts changes
npm run db:migrate    # ts-node src/db/migrate.ts — apply pending migrations to DATABASE_URL
```

Client (`client/`):

```sh
npm run dev      # vite dev server
npm run build     # tsc -b && vite build
npm run lint       # eslint .
npm run preview     # preview the production build
npm test         # vitest run
```

`packages/shared-types/` has its own `build` (`tsc -b`) and `lint` scripts, run via the root workspace commands above.

There is no top-level dev script that runs client and backend together; run each separately.

## Data privacy

`backend/.env`'s `DATABASE_URL` (`nee3`) holds real, personal journal data migrated from Mongo via `backend/src/scripts/migrateMongoJournal.ts`. Treat it as off-limits to the agent:

- Never start the backend/dev server against the `nee3` database for agent-driven browser verification (e.g. `claude-in-chrome`) or any other automated feature check. Use the seeded test database instead — `backend/.env.test` (`nee3_test`), populated via `backend/src/scripts/seedTestEntries.ts`. If no `.env.test`-pointed server is running, start one rather than falling back to `.env`.
- Never read, quote, or paste output from a server/process that was run against the `nee3` database — dev server stdout, request logs, stack traces, error messages — since it may contain real entry content. If something needs debugging against real data, ask the user to check it themselves rather than reading logs directly.
- These rules apply regardless of how mundane the task looks ("just confirming the button works") — default to the seeded DB unless the user explicitly says otherwise for a specific, scoped reason.

## Architecture

**npm workspaces monorepo**, a deliberate departure from Nee.2 (which kept client/backend fully independent). All three packages (`client/`, `backend/`, `packages/shared-types/`) extend the root `tsconfig.base.json` (strict mode, `noUncheckedIndexedAccess`, `noUnusedLocals`/`Parameters`, etc.). `packages/shared-types` is the **only** shared runtime dependency between client and backend, and it ships types only (erased at build) — no shared runtime logic otherwise. Both client and backend depend on it as `@nee3/shared-types`.

**Backend** (`backend/src/`): `index.ts` is the entrypoint — connects to Postgres via `db/index.ts` (`connectDB`, exits process on failure) and starts the Express app built by `app.ts` (`createApp`). Database layer is **Drizzle ORM** (`drizzle-orm/node-postgres`) over a `pg` `Pool`: `db/index.ts` exports `db` (typed against `db/schema.ts`) and `pool`; migrations generate into `db/migrations/` via `drizzle-kit` and apply via `db/migrate.ts`. Session storage (`config/session.ts`) uses `connect-pg-simple` against the same database. Config (`config/default.ts`) loads `DATABASE_URL`/`PORT`/`SESSION_SECRET` via dotenv (see `.env.example`). `middleware/auth.ts` holds the auth-guard middleware (`ensureAuth`, currently a stub `next()` pending Phase 3), typed against `types/request.ts`'s `AuthenticatedRequest`. Feature code will live under `src/modules/<module>/`, kept separate from the app-wiring/config/middleware layers above.

**Client** (`client/src/`): TanStack Router with file-based routing — routes live in `src/routes/`; `src/routeTree.gen.ts` is **auto-generated** by the router's Vite plugin, never hand-edit it. `main.tsx` wires `ChakraProvider` and `QueryClientProvider` around `RouterProvider`. `src/shell/` (`Layout`, `Nav`, `AuthProvider`) is the app chrome every module renders inside — the one cross-module layer by design. `src/api/client.ts` holds a shared Axios instance (`baseURL: '/api'`, `withCredentials: true`); add new endpoints to `src/api/endpoints.ts` rather than inlining path strings. `src/atoms/` (the "Adams" UI library) holds thin Chakra wrappers (`Button`, `Calendar`, `Popover`, `Select`, etc.) — `Calendar` keeps `react-day-picker` as its engine, reskinned with Chakra style props. Feature modules will live under `src/modules/<module>/`, mirroring the backend. Styling is **Chakra UI v3**, themed once in `src/theme.ts` (`createSystem`) from the design-system.md tokens — no Tailwind, no hand-rolled CSS outside the occasional CSS module for things Chakra style props can't express.

**Design system**: `docs/design/design-system.md` defines the visual language (journal-and-commonplace-book concept, Fraunces/Newsreader/IBM Plex Mono type stack, ink-blue/moss/rust accents, index-card as signature component); `docs/design/demo.html` is a standalone static reference (open directly in a browser). Consult before any UI styling work — supersedes ad hoc choices once Phase 4 starts.

**Linting**: both workspaces pin ESLint 8.57.1 (Airbnb flat-config compat, client only) with explicit rule options and several Airbnb-rule overrides. Before touching either `eslint.config.js`, see the `eslint-config` skill for the full rationale.

## Agent skills

- **Issue tracker**: Issues and specs live in Aeternus's GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.
- **Domain docs**: single-context layout, `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
- **ESLint config**: rationale and rule overrides for both workspaces' flat configs. See `.claude/skills/eslint-config/SKILL.md`.
- **Client frontend architecture**: folder/file conventions for `client/src` components, hooks, and utils (atom/molecule structure, split triggers, promotion rules). See `.claude/skills/client-frontend-architecture/SKILL.md`.

## Sibling projects (read-only context, not this repo)

- `../harmonee/` — the original, live production app (Fly.io). Reference for feature parity; do not modify unless explicitly asked.
- `../Nee.2/` — first rewrite attempt, incomplete. Has partial journal client-side work worth checking as prior art for Phase 4.
