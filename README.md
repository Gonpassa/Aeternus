# Aeternus - Personal Hub

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

### Dream Journal

Recording and working through dreams using Jungian dream-analysis method - see `CONTEXT.md` for the full glossary. Distinct from Journal: a dream has no title, and its analysis accumulates over multiple revisits rather than being written once. Manual only for now; AI-assisted analysis is a separate, later module.

### Notes (second brain)

A Zettelkasten, as layered by Sönke Ahrens: read a little, write a **Literature note** in your own words bound to a **Source** and a place within it, then later re-read those notes and write **Permanent notes** - your own ideas, each one claim, each required to connect to something already in the box. The goal is a habit of deep learning and a web of ideas to explore, not a pile of highlights. Two pages: **Read**, a catalog of Sources where capture happens with a Source open, and **Review**, a one-note-at-a-time pass that asks what of your own is in a note you wrote earlier. See `CONTEXT.md` for the full glossary and `docs/adr/` (0011-0017) for the decisions behind it.

### Structured Writing

A space for writing meant to be read, not just logged: essays, blog posts, longer-form reflection.
Distinct from the journal in intent and lifecycle. Planned capabilities:

- Prompts to encourage reflection on a chosen topic before/while writing.
- References and citations attached to a piece, citing Notes' Sources and notes by id.
- Links between pieces (backlinks), so essays and notes can build on each other over time.

### Calendar

Two-way awareness with Google Calendar, so the hub reflects real commitments rather than duplicating a separate calendar.
Distinct from the journal's own date-based entry view, though the two should feel connected.

### AI-assisted learning

AI woven into the writing/notes flow rather than bolted on as a chat sidebar. First concrete case:

- Generate quiz-style questions from the Notes corpus to self-test retention. Notes deliberately carries no retention mechanism of its own (ADR 0016), so this is where that gap is filled; `notes.id` and `sources.id` are the handles a quiz scopes by.

---

## Tech Stack

### Client (`/client`)

- **React 18** - UI layer
- **TypeScript** - type safety throughout
- **Vite** - dev server and bundler
- **TanStack Router** - file-based, type-safe routing
- **TanStack Query** - server-state management and data fetching
- **Chakra UI v3** - component primitives and theming, styled from the design-system tokens
- **Tiptap** - rich-text editing (the `RichTextEditor` atom, used by journal entries and dream narratives)
- **React Hook Form + Zod** - form state and validation (see `docs/adr/0004-form-handling-architecture.md`)
- **Axios** - HTTP client

### Backend (`/backend`)

- **Node.js + Express** - REST API server
- **TypeScript** - shared type definitions with client where applicable
- **PostgreSQL + Drizzle ORM** - data layer, migrations via `drizzle-kit`
- **Passport.js** - authentication (local strategy)
- **express-session + connect-pg-simple** - session persistence
- **sanitize-html** - server-side allow-listing of rich-text HTML on every write

### Tooling (both packages)

- **ESLint** - linting (Airbnb config + TypeScript rules)
- **Prettier** - formatting
- **Jest** - unit and integration tests (backend)
- **Vitest + Testing Library** - component and unit tests (client)

---

## Project Structure

npm workspaces monorepo - one root install, shared root-level TypeScript/lint config, but still zero shared runtime code between client and backend (the one exception is `packages/shared-types`, which ships types only, no runtime logic).

```
Aeternus/
├── client/              # React SPA
├── backend/             # Express REST API
├── packages/
│   └── shared-types/    # API request/response type definitions, imported by both sides
└── README.md
```

Within `client/` and `backend/`, modules (journal, writing, calendar, learning, dream) live as separate feature folders (`src/modules/<module>/`) rather than intermixed, so a module can be extended or reworked without disturbing the others. The client also has a `src/shell/` layer (layout, nav, auth context) that all modules render inside.

---

## Build Plan

### Phase 1 - Project Setup ✅

Scaffold `/client` and `/backend` with TypeScript, ESLint, Prettier, and tooling configs. Establish shared conventions and the modular folder structure before any feature work begins.

### Phase 2 - Backend API core ✅

Set up the account/session layer (Postgres via Drizzle, Passport session auth) that every module will sit on top of. Define and document API contracts as modules are added, rather than up front for features that don't exist yet.

### Phase 3 - Authentication ✅

Wire login, registration, and session handling through the API. Implement protected-route middleware on the backend and an auth context on the client.

### Phase 4 - Journal module ✅ (insights deferred)

Rebuild the journal: entry list, detail view, create/edit/delete, mood tagging, calendar view, and the rich-text editor are built and tested on both sides. Existing entries were migrated from Harmonee's MongoDB as part of Phase 5. Insights/overview is the one piece deferred to a later pass.

### Phase 5 - Deployment ✅

Deployed as a separate service on Fly.io (app `aeternus`), alongside the existing Harmonee app rather than replacing it: single Docker image (backend serves the built client with SPA fallback), self-managed Postgres, first production deploy and smoke test done, and existing journal entries migrated from Harmonee's MongoDB via a documented runbook.

### Phase 6 - Dream Journal ✅ (6b deferred)

Standalone module for recording dreams and working through them using Jungian dream-analysis method (see `CONTEXT.md` for the full glossary: Dream, Anchor, Emotional beat, Symbol, Analytic/Synthetic analysis, Association). A dream has a date and a rich-text narrative, no title. Users highlight passages as anchors to attach freeform emotional beats, tag recurring symbols, and record associations to those symbols. Analytic (reductive) and synthetic (constructive) analysis passes can be added at any time - analytic optionally per-anchor, synthetic always whole-dream - and passes accumulate rather than overwrite, so a dream can be reread as understanding deepens. AI-assisted analysis (symbol surfacing, suggested readings) is deliberately out of scope here and planned as a later, separate phase - this one is manual only.

Built on both sides (`backend/src/modules/dreams/`, `client/src/modules/dreams/`): dreams CRUD, anchors, emotional beats, symbols and symbol attachments, associations, and analysis passes. Cross-dream Symbol recurrence browsing ("show every dream where I tagged this Symbol") is deferred as **phase 6b** - see `CONTEXT.md`.

### Phase 7 - Notes (Zettelkasten)

A reading-to-ideas module built on the Zettelkasten method as layered by Sönke Ahrens (see `CONTEXT.md` for the full glossary: Source, Literature note, Locator, Permanent note, Link, Read, Review, Answer, Due, Open question, Topic). A **Source** is a thing being read or watched; a **Literature note** is a few sentences in the user's own words, bound to one Source and to a **Locator** within it, written closed-book while reading; a **Permanent note** is one of the user's own ideas, titled as a claim, bound to no Source, and unable to exist without at least one **Link** to something already in the box. Every Link carries one line saying why the two notes belong together. **Topics** are tags on Sources and Permanent notes, never containers.

Two pages. **Read** is a Topic-filterable catalog of Source cards; opening a Source is the reading page, where a Literature note is captured on an index card - section as the die-cut tab, position as the catalog number, body as the card face - and filed into that Source's note stream. **Review** is a harvest pass over Literature notes one at a time, each answered exactly one of three ways: nothing of mine here, a Link was made from it, or a Permanent note was written from it. Answers accumulate as history rather than overwriting a state, so a note re-read a year later is a second true fact about it, not a correction.

Data model: one `notes` table with a `kind` discriminator and per-kind CHECK constraints, a `links` table holding one directed row per unordered pair with a reason from each end, `topics` on the Symbol pattern with two join tables, and an append-only `review_answers` table. ADRs 0011-0017 cover the decisions that are hard to reverse; the module otherwise follows the dream module's module/router/validation conventions on both sides.

Out of scope here: AI-assisted quizzing over the corpus (Phase 10), and whether answered notes should return on a schedule, which is deliberately held until the module has a real corpus to judge against. Review is harvest, not retention (ADR 0016), and this phase is manual only.

### Phase 8 - Structured writing module

Essay/blog-style pieces with reflection prompts, references, and links between pieces (backlinks). Citations target Phase 7's `notes.id` and `sources.id`.

### Phase 9 - Calendar integration

Google Calendar sync, distinct from the journal's own date view.

### Phase 10 - AI-assisted learning

Question generation from the Notes corpus for self-testing, integrated into the reading and writing flow.

### Later - Design audit pass

Once more modules are built out and the UI is more rounded out, run [Impeccable](https://impeccable.style/tutorials/getting-started/)'s audit/polish commands (accessibility, typography, spacing, color, interaction states) against the built screens, seeded with `docs/design/design-system.md` as context. Not needed while the design system itself is still being defined - the goal is drift-catching on an already-built UI, not generating the design language from scratch.

---

## Commands

### Local Postgres setup

Backend tests and the dev server require a local PostgreSQL instance (installed natively, e.g. via Homebrew - not Docker):

```sh
brew install postgresql@16
brew services start postgresql@16
createdb nee3        # dev database
createdb nee3_test   # test database
```

Copy `backend/.env.example` to `backend/.env` and `backend/.env.test.example` to `backend/.env.test`, then set a real `SESSION_SECRET` in `backend/.env`. Both files are gitignored.

Apply migrations and seed the test database:

```sh
npm run db:migrate --workspace=backend        # apply pending migrations to DATABASE_URL
npm run seed:test-entries --workspace=backend # populate nee3_test with fake entries
```

### Running it

```sh
npm install          # installs all three workspaces
npm run dev           # backend + client dev servers in two iTerm tabs (macOS/iTerm only)
npm run dev:test-db    # same, but backend against the seeded nee3_test database
npm run lint            # all workspaces
npm run build            # shared-types, then client, then backend
npm test                  # backend jest suite (client tests: npm test --workspace=client)
```

`CLAUDE.md` has the full per-workspace command reference.

---

## Design Principles

- **Modular, not monolithic** - journal, writing, calendar, and AI features are separate modules sharing one shell; no module should require understanding another to work on.
- **Separation of concerns** - client and backend are independent packages; no shared runtime code.
- **Type safety end-to-end** - API response shapes are typed on both sides.
- **No premature abstraction** - build for what exists today; extend later. Don't design the writing/calendar/AI data models before their phase starts.
- **Chakra UI, encapsulated in `src/atoms/`** - no Tailwind. Custom styling (including CSS modules) lives inside a reusable UI/block component, not as one-off style-prop overrides at call sites. Call sites consume a component's props/variants only; they don't reach in with outside style props except through an explicit `className` escape hatch for genuinely rare cases. Theme tokens live in `client/src/theme.ts`, sourced from `docs/design/design-system.md`.
