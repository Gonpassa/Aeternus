# Aeternus.3 — Personal Hub

A personal hub application for journaling, structured writing, and life organization.
Journaling carries over from [Harmonee](https://harmonee.fly.dev/), but it is now one module among several, not the whole app.
The live Harmonee deployment is left untouched throughout this build.

---

## Goal

Build a modular personal hub as a React + TypeScript SPA with a dedicated REST API backend.
Each life-management concern (journaling, writing, calendar, learning) is a distinct feature area sharing one account, one data layer, and one shell UI.
Start from what Harmonee already does well, then extend outward.

---

## Modules

### Journal
Carries over Harmonee's existing feature set: dated entries, mood tagging, calendar view, insights/overview.
This is the module with prior art (see `harmonee/` and the partial `Nee.2/` attempt) and the first one to be rebuilt.

### Structured Writing (second brain)
A space for writing meant to be read, not just logged: essays, blog posts, longer-form reflection.
Distinct from the journal in intent and lifecycle. Planned capabilities:
- Prompts to encourage reflection on a chosen topic before/while writing.
- References and citations attached to a piece.
- Links between pieces (backlinks), so essays and notes can build on each other over time.

### Calendar
Two-way awareness with Google Calendar, so the hub reflects real commitments rather than duplicating a separate calendar.
Distinct from the journal's own date-based entry view, though the two should feel connected.

### AI-assisted learning
AI woven into the writing/notes flow rather than bolted on as a chat sidebar. First concrete case:
- When writing notes on a topic, generate quiz-style questions from that material to self-test retention.

### Dream Journal
Recording and working through dreams using Jungian dream-analysis method - see `CONTEXT.md` for the full glossary. Distinct from Journal: a dream has no title, and its analysis accumulates over multiple revisits rather than being written once. Manual only for now; AI-assisted analysis is a separate, later module.

---

## Tech Stack

### Client (`/client`)
- **React 18** — UI layer
- **TypeScript** — type safety throughout
- **Vite** — dev server and bundler
- **TanStack Router** — file-based, type-safe routing
- **TanStack Query** — server-state management and data fetching
- **Chakra UI v3** — component primitives and theming, styled from the design-system tokens
- **Axios** — HTTP client

### Backend (`/backend`)
- **Node.js + Express** — REST API server
- **TypeScript** — shared type definitions with client where applicable
- **PostgreSQL + Drizzle ORM** — data layer, migrations via `drizzle-kit`
- **Passport.js** — authentication (local strategy)
- **express-session + connect-pg-simple** — session persistence

### Tooling (both packages)
- **ESLint** — linting (Airbnb config + TypeScript rules)
- **Prettier** — formatting
- **Jest** — unit and integration tests (backend)

---

## Project Structure

npm workspaces monorepo — one root install, shared root-level TypeScript/lint config, but still zero shared runtime code between client and backend (the one exception is `packages/shared-types`, which ships types only, no runtime logic).

```
Aeternus.3/
├── client/              # React SPA
├── backend/             # Express REST API
├── packages/
│   └── shared-types/    # API request/response type definitions, imported by both sides
└── README.md
```

Within `client/` and `backend/`, modules (journal, writing, calendar, learning, dream) live as separate feature folders (`src/modules/<module>/`) rather than intermixed, so a module can be extended or reworked without disturbing the others. The client also has a `src/shell/` layer (layout, nav, auth context) that all modules render inside.

---

## Build Plan

### Phase 1 — Project Setup ✅
Scaffold `/client` and `/backend` with TypeScript, ESLint, Prettier, and tooling configs. Establish shared conventions and the modular folder structure before any feature work begins.

### Phase 2 — Backend API core ✅
Set up the account/session layer (Postgres via Drizzle, Passport session auth) that every module will sit on top of. Define and document API contracts as modules are added, rather than up front for features that don't exist yet.

### Phase 3 — Authentication ✅
Wire login, registration, and session handling through the API. Implement protected-route middleware on the backend and an auth context on the client.

### Phase 4 — Journal module (mostly done)
Rebuild the journal: entry list, detail view, create/edit/delete, mood tagging, calendar view are built and tested on both sides. Insights/overview is deferred to a later pass. Next up: migrating existing entries from the old Harmonee MongoDB into Postgres.

### Phase 5 — Deployment
Set up a deployment pipeline for both packages. Evaluate whether to migrate the existing Fly.io app or deploy Aeternus.3 as a separate service alongside it. Moved up ahead of the remaining modules so what's built so far (through Journal) ships before more feature work piles up.

### Phase 6 — Dream Journal
Standalone module for recording dreams and working through them using Jungian dream-analysis method (see `CONTEXT.md` for the full glossary: Dream, Anchor, Emotional beat, Symbol, Analytic/Synthetic analysis, Association). A dream has a date and a rich-text narrative, no title. Users highlight passages as anchors to attach freeform emotional beats, tag recurring symbols, and record associations to those symbols. Analytic (reductive) and synthetic (constructive) analysis passes can be added at any time - analytic optionally per-anchor, synthetic always whole-dream - and passes accumulate rather than overwrite, so a dream can be reread as understanding deepens. AI-assisted analysis (symbol surfacing, suggested readings) is deliberately out of scope here and planned as a later, separate phase - this one is manual only.

### Phase 7 — Structured writing module
Essay/blog-style pieces with reflection prompts, references, and links between pieces (backlinks).

### Phase 8 — Calendar integration
Google Calendar sync, distinct from the journal's own date view.

### Phase 9 — AI-assisted learning
Question generation from notes/writing for self-testing, integrated into the writing module's flow.

---

## Commands

### Local Postgres setup

Backend tests and the dev server require a local PostgreSQL instance (installed natively, e.g. via Homebrew — not Docker):

```sh
brew install postgresql@16
brew services start postgresql@16
createdb nee3        # dev database
createdb nee3_test   # test database
```

Copy `backend/.env.example` to `backend/.env` and `backend/.env.test.example` to `backend/.env.test`, then set a real `SESSION_SECRET` in `backend/.env`. Both files are gitignored.

---

## Design Principles

- **Modular, not monolithic** — journal, writing, calendar, and AI features are separate modules sharing one shell; no module should require understanding another to work on.
- **Separation of concerns** — client and backend are independent packages; no shared runtime code.
- **Type safety end-to-end** — API response shapes are typed on both sides.
- **No premature abstraction** — build for what exists today; extend later. Don't design the writing/calendar/AI data models before their phase starts.
- **Chakra UI, encapsulated in `src/components/ui/`** — no Tailwind. Custom styling (including CSS modules) lives inside a reusable UI/block component, not as one-off style-prop overrides at call sites. Call sites consume a component's props/variants only; they don't reach in with outside style props except through an explicit `className` escape hatch for genuinely rare cases. Theme tokens live in `client/src/theme.ts`, sourced from `docs/design/design-system.md`.
