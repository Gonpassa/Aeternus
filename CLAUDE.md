# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

Nee.3 is a personal hub application (journaling, structured writing, calendar, AI-assisted learning) and the current, planned rewrite of Harmonee. It lives inside a parent folder containing two other, unrelated generations of the same app (`harmonee/`, `Nee.2/`) — each is a separate git repository. This directory (`Nee.3/`) is its own git repo, branch `main`, with a remote named `Aeternus` pointing at `github.com/Gonpassa/Aeternus`.

**Phase 1 (architecture scaffold) is complete.** The npm-workspaces monorepo skeleton exists and builds/lints/tests cleanly, but no feature/module code has been written — `backend/src/modules/` and `client/src/modules/` are intentionally empty (just `.gitkeep`) until Phase 4. Don't design later-phase data models (writing, calendar, AI) before their phase starts.

See `docs/superpowers/specs/2026-08-10-phase1-architecture-scaffold-design.md` and `docs/superpowers/plans/2026-08-10-phase1-architecture-scaffold-plan.md` for the Phase 1 design rationale, and `README.md` for the full module descriptions and 8-phase build plan (Setup → Backend API core → Auth → Journal → Structured Writing → Calendar → AI learning → Deployment). Follow that phase order rather than jumping ahead.

## Commands

Root-level (npm workspaces; run from `Nee.3/`):

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

## Architecture

**npm workspaces monorepo**, a deliberate departure from Nee.2 (which kept client/backend fully independent). All three packages (`client/`, `backend/`, `packages/shared-types/`) extend the root `tsconfig.base.json` (strict mode, `noUncheckedIndexedAccess`, `noUnusedLocals`/`Parameters`, etc.). `packages/shared-types` is the **only** shared runtime dependency between client and backend, and it ships types only (erased at build) — no shared runtime logic otherwise. Both client and backend depend on it as `@nee3/shared-types`.

**Backend** (`backend/src/`): `index.ts` is the entrypoint — connects to Postgres via `db/index.ts` (`connectDB`, exits process on failure) and starts the Express app built by `app.ts` (`createApp`). The database layer uses **Drizzle ORM** (`drizzle-orm/node-postgres`) over a `pg` `Pool`: `db/index.ts` exports the `db` client (typed against `db/schema.ts`) and `pool`; `db/schema.ts` defines the Drizzle table schema; migrations are generated into `db/migrations/` via `drizzle-kit` (config in `backend/drizzle.config.ts`) and applied by `db/migrate.ts`. Session storage (`config/session.ts`) uses `connect-pg-simple` against the same Postgres database. Config (`config/default.ts`) loads `DATABASE_URL`/`PORT`/`SESSION_SECRET` from env via dotenv (see `.env.example`). `middleware/auth.ts` holds the auth-guard middleware (`ensureAuth`, currently a stub `next()` pending Phase 3), typed against `types/request.ts`'s `AuthenticatedRequest`. Feature code will live under `src/modules/<module>/` per module, kept separate from the app-wiring/config/middleware layers above. `no-console` is an ESLint error here — use `// eslint-disable-next-line no-console` where logging is unavoidable (see `index.ts`, `db/index.ts`), don't add a logging library speculatively.

**Client** (`client/src/`): TanStack Router with file-based routing — routes live in `src/routes/`, and `src/routeTree.gen.ts` is **auto-generated** by `@tanstack/router-plugin`'s Vite plugin (wired in `vite.config.ts`); never hand-edit it. `main.tsx` wires `ChakraProvider` and `QueryClientProvider` (TanStack Query) around the `RouterProvider`. `src/shell/` (`Layout`, `Nav`, `AuthProvider`) is the app chrome every module will render inside — this is the one cross-module layer by design. `src/api/client.ts` holds a shared Axios instance (`baseURL: '/api'`, `withCredentials: true`); `src/api/endpoints.ts` centralizes endpoint path constants — add new endpoints there rather than inlining path strings in queries. `src/components/ui/` holds thin Chakra-based wrappers (`button.tsx`, `calendar.tsx`, `popover.tsx`, `select.tsx`) — `calendar.tsx` keeps `react-day-picker` as its engine, reskinned with Chakra style props. Feature modules will live under `src/modules/<module>/`, mirroring the backend's module split. Styling is **Chakra UI v3** (`@chakra-ui/react`) with a custom theme in `src/theme.ts` (`createSystem` extending `defaultConfig`) that encodes the design-system.md tokens (fonts, colors, radii) once as Chakra semantic tokens/recipes, rather than per-component Tailwind/`cva` strings — no Tailwind, no hand-rolled CSS files outside the occasional CSS module for things Chakra style props can't express (e.g. `calendar.module.css`).

**Design system**: `docs/design/design-system.md` defines the visual language (color, type, layout, components, motion, a11y floor) — journal-and-commonplace-book concept, Fraunces/Newsreader/IBM Plex Mono type stack, ink-blue/moss/rust accent hierarchy, index-card as the signature component. `docs/design/demo.html` is a standalone static reference implementation (open directly in a browser, no build step). Consult this doc before styling any UI work — it supersedes ad hoc styling choices once Phase 4 UI work starts.

**Linting**: both client and backend pin **ESLint 8.57.1** (flat config via `typescript-eslint`) because Airbnb's config (used by the client) doesn't yet support ESLint 9's flat-config-native rule option merging; rule options are passed explicitly in both configs rather than relying on that. Backend: `typescript-eslint` recommended + Prettier, `no-console` as error. Client: `eslint:recommended` + `typescript-eslint` recommended + Airbnb + Airbnb hooks (via `FlatCompat`) + `react-refresh` + Prettier, with `import/no-unresolved` off (TypeScript's `tsc -b` already validates module resolution) and several Airbnb rules adjusted for React 18's automatic JSX runtime and TS/TSX layout — see the comments in `client/eslint.config.js` before changing them.

## Agent skills

### Issue tracker

Issues and specs live in Aeternus's GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Sibling projects (read-only context, not this repo)

- `../harmonee/` — the original, live production app (Fly.io). Reference for feature parity; do not modify unless explicitly asked.
- `../Nee.2/` — first rewrite attempt, incomplete. Has partial journal client-side work worth checking as prior art for Phase 4.
