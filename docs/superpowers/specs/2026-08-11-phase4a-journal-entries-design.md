# Phase 4a: Journal Entries (CRUD + Mood) — Design

## Status

Brainstorm approved.

## Problem

Phase 4 of the README's build plan is "Journal module: entry list, detail view, create/edit/delete, mood tagging, calendar view, insights/overview."
That scope is too large for one design/plan cycle, so it is split into sub-phases.
This spec covers **4a**: entry list, detail view, create/edit/delete, and mood tagging — the data-layer and CRUD-UI foundation the rest of the journal module builds on.
Calendar view and insights/overview become a separate **4b** spec once 4a lands.
Migrating historical entries from the live Harmonee MongoDB database is a separate future task, out of scope here.

## Prior art

- `harmonee/` (live production app): Mongoose `Entry` model, free-text `mood` string, one entry enforced per calendar date (server-side count check before insert), plain-text entry body.
- `Nee.2/` (abandoned rewrite): typed `IEntry`/`JournalContent[]` block-array content model, fixed `MoodEnum`. Not carried forward here — see "Content model" below.

## Content model

Entry body uses a WYSIWYG rich-text editor (TipTap), not raw markdown authoring and not a structured block-array schema.
The editor's native output — sanitized HTML — is stored as a single `text` column.

**Data flow:**
1. Client edits via TipTap, which serializes its internal document to an HTML string on save.
2. Backend re-sanitizes that HTML server-side (via `sanitize-html`, allow-listing only safe formatting tags/attributes) before every insert/update, regardless of what the client already sanitized. Never trust client-side sanitization alone.
3. Stored HTML is returned as-is over the API (a plain string field in the JSON response).
4. View-only rendering injects the (already sanitized) HTML via `dangerouslySetInnerHTML`, styled with Newsreader per the design system's "journal page" look. This is safe specifically because the string was sanitized before it ever reached storage — an allow-listed HTML string cannot contain `<script>` or event-handler attributes.

## Mood model: two-tier feelings wheel

Free-text mood (Harmonee) loses structure needed for future filtering/insights; a single small fixed enum (Nee.2's approach) risks becoming a grab-all ("happy"/"neutral"/"sad" catch nearly everything). Instead, mood capture is two-tier, modeled on the feelings-wheel pattern (Gloria Willcox's Feeling Wheel; used by apps like How We Feel): pick a broad primary mood, then a required, more specific emotion within it. This forces real specificity without becoming unconstrained free text.

**Taxonomy:**

| Primary | Specific emotions |
|---|---|
| happy | content, proud, excited, grateful |
| calm | peaceful, relaxed, relieved, secure |
| sad | lonely, disappointed, hurt, grieving |
| anxious | nervous, overwhelmed, insecure, worried |
| angry | frustrated, irritated, resentful, jealous |

Both `primaryMood` and `specificEmotion` are stored as separate Postgres enum columns. Postgres enums can't be scoped to a parent value, so `specificEmotion` is a flat enum of all 20 values; validating that the submitted specific emotion actually belongs to the submitted primary's bucket happens in application code (`validation.ts`), via a `MOOD_TAXONOMY` lookup map shared between client and backend through `@nee3/shared-types`.

The primary mood maps to the design system's mood-mark dot color for at-a-glance scanning in the list view (and, later, the 4b calendar view).

## Entry cadence

One entry per calendar date per user, matching Harmonee. Enforced at the database level via a `unique(userId, date)` constraint — not just a client-side check — so the constraint holds even under concurrent requests.

**Date-collision UX:** the create form lets the user pick any date (default: today), to support backfilling missed days. If the chosen date already has an entry, the form switches into editing that existing entry (loads its title/mood/content) instead of blocking with an error. This is a UX improvement over Harmonee, which showed a blocking error on collision.

## Data model

New Drizzle table in `backend/src/db/schema.ts`:

```ts
export const primaryMoodEnum = pgEnum('primary_mood', ['happy', 'calm', 'sad', 'anxious', 'angry']);
export const specificEmotionEnum = pgEnum('specific_emotion', [
  'content', 'proud', 'excited', 'grateful',
  'peaceful', 'relaxed', 'relieved', 'secure',
  'lonely', 'disappointed', 'hurt', 'grieving',
  'nervous', 'overwhelmed', 'insecure', 'worried',
  'frustrated', 'irritated', 'resentful', 'jealous',
]);

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  title: text('title').notNull(),
  primaryMood: primaryMoodEnum('primary_mood').notNull(),
  specificEmotion: specificEmotionEnum('specific_emotion').notNull(),
  content: text('content').notNull(), // sanitized HTML
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));
```

- `title` is required (no fallback-to-date display title).
- A migration is generated via `npm run db:generate` (backend) once this schema lands.

## Backend

New module, `backend/src/modules/journal/` (`routes.ts`, `controller.ts`, `validation.ts`, plus co-located tests), following the shape of `backend/src/auth/` exactly (see that module for the concrete pattern: thin routes file, controller functions per action, a `validation.ts` returning `{ valid: true } | { valid: false; error: string }`).

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/journal/entries?page=&pageSize=` | Paginated list, reverse-chronological by date, scoped to `req.user.id` |
| GET | `/api/journal/entries/:id` | Single entry; 404 if not found or not owned by the requester |
| GET | `/api/journal/entries/by-date/:date` | Looks up the entry for a given date; powers the date-collision-switches-to-edit flow |
| POST | `/api/journal/entries` | Create; 409 if `(userId, date)` already exists |
| PUT | `/api/journal/entries/:id` | Update |
| DELETE | `/api/journal/entries/:id` | Delete |

All routes mounted behind the existing `ensureAuth` middleware. Ownership is checked on every single-entry operation (404, not 403, on mismatch — consistent with the Phase 3 fix for not leaking existence across accounts).

**Shared types** — `packages/shared-types/src/index.ts` gains `Entry`, `PrimaryMood`, `SpecificEmotion`, `MOOD_TAXONOMY`, `CreateEntryRequest`, `UpdateEntryRequest`, `EntryListResponse` (paginated envelope: `{ entries, page, pageSize, total }`), mirroring the existing `AuthUser`/`RegisterRequest`/`ApiErrorResponse` shapes.

## Client

New module, `client/src/modules/journal/`, mirroring the existing auth module's split between API hooks and route components:

- **`api/journalHooks.ts`** — TanStack Query hooks: `useEntries(page)`, `useEntry(id)`, `useEntryByDate(date)`, `useCreateEntry()`, `useUpdateEntry()`, `useDeleteEntry()`. New endpoint paths added to `client/src/api/endpoints.ts` under a `journal` key.
- **`components/RichTextEditor/`** — TipTap wrapper (StarterKit: bold/italic/headings/lists) exposing a controlled `value`/`onChange` string interface.
- **`components/EntryView/`** — read-only renderer (`dangerouslySetInnerHTML` of the already-sanitized content), styled per the design system's journal page (Newsreader body text).
- **`components/MoodPicker/`** — two-step picker: primary mood buttons (mood-mark colored dots) → specific-emotion buttons filtered to that primary's bucket, driven by the shared `MOOD_TAXONOMY`.
- **`components/EntryForm/`** — title input, date picker (default: today), `MoodPicker`, `RichTextEditor`. Changing the date triggers `useEntryByDate`; a hit switches the form into edit mode pre-filled with that entry instead of submitting a create.

**Routes** (`client/src/routes/journal/`, TanStack file-based routing):
- `journal/index.tsx` — paginated entry list (title, date, mood-dot, excerpt); includes a "New Entry" action linking to `journal/new`.
- `journal/new.tsx` — `EntryForm` in create mode.
- `journal/$entryId.tsx` — detail view (`EntryView`), with Edit/Delete actions. Delete requires a confirm step.
- `journal/$entryId.edit.tsx` — `EntryForm` in edit mode, pre-filled.

`client/src/shell/Nav.tsx` gets a "Journal" link.

## Addendum: registration is unreachable from the UI

Unrelated to the journal module itself, but discovered while reviewing the shell during this design: `/register` exists and works (Phase 3), but nothing in the UI links to it — `Nav.tsx` only renders a "Log in" link when logged out, and the login page has no link to registration. Fixed alongside this work:
- Add a "Register" link next to "Log in" in `Nav.tsx`'s logged-out state.
- Add a "Don't have an account? Register" link on the login page.

## Error handling

- 400 on invalid input: missing title, invalid `primaryMood`/`specificEmotion` combination, invalid/malformed date.
- 404 on entry not found or not owned by the requester.
- 409 on a direct `POST` date collision (defense in depth behind the DB unique constraint — the client's by-date lookup is expected to avoid triggering this in normal use).
- Server-side HTML sanitization runs unconditionally on every write.

## Testing

Following the `auth/` module's existing split:
- `validation.test.ts` — unit tests for input validation and mood-taxonomy validation (valid/invalid primary+specific combinations).
- `controller.test.ts` — unit tests with a mocked DB layer, covering the 400/404/409 branches.
- `routes.test.ts` — Supertest integration tests against the real test DB (migrations run, table truncated between tests): full CRUD, the by-date lookup, and cross-user isolation (user A cannot read/edit/delete user B's entries).
- Client: hook/component tests for `MoodPicker` (primary → specific filtering) and `EntryForm` (date-collision switches to edit mode) are highest-value; standard React Testing Library coverage otherwise.

## Explicitly out of scope (this spec)

- Calendar view and insights/overview (→ Phase 4b, separate spec).
- Migrating historical entries from the live Harmonee MongoDB database (separate future task).
- Any AI-assisted features on journal entries (→ separate `journal-insights` design, already written, scheduled after 4b).
