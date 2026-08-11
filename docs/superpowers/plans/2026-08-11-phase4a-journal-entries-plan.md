# Phase 4a: Journal Entries (CRUD + Mood) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the journal module's CRUD + mood-tagging foundation: a `entries` Postgres table, a `backend/src/modules/journal/` API module, shared types, and a `client/src/modules/journal/` UI module wired into four new routes.

**Architecture:** Follows the existing `auth` module's shape exactly on both sides — thin Express routes file, controller functions per action, a `validation.ts` returning `{ valid: true } | { valid: false; error: string }`, Drizzle for persistence, TanStack Query hooks on the client, TanStack file-based routing. The one new piece of infrastructure is a two-tier mood taxonomy shared at runtime (not just as types) through `@nee3/shared-types`, and a TipTap-based rich text editor whose HTML output is re-sanitized server-side before every write.

**Tech Stack:** Express, Drizzle ORM (`drizzle-orm/node-postgres`), `sanitize-html`, React 18, TanStack Router (file-based) + TanStack Query, TipTap (`@tiptap/react`, `@tiptap/starter-kit`), Tailwind CSS v4, Vitest + React Testing Library (new to this repo — the client has no test runner yet).

## Global Constraints

- One entry per calendar date per user, enforced via a database-level `unique(userId, date)` constraint on the `entries` table — never just a client-side check.
- Server-side HTML sanitization (`sanitize-html`, allow-listing only safe formatting tags/attributes) runs unconditionally on every entry insert/update, regardless of what the client already sanitized.
- Ownership is checked on every single-entry operation; mismatches return **404**, never 403 (consistent with the Phase 3 fix against leaking entry existence across accounts).
- `title` is required on every entry — no fallback-to-date display title.
- Both `primaryMood` and `specificEmotion` are validated together via the shared `MOOD_TAXONOMY` lookup map — a specific emotion must belong to the submitted primary mood's bucket.
- New backend module lives at `backend/src/modules/journal/` and new client module at `client/src/modules/journal/`, mirroring `backend/src/auth/` and `client/src/auth/` respectively.
- Mood-mark dot colors extend `docs/design/design-system.md`'s palette with two new tokens (`--mood-anxious`, `--mood-angry`) — decided during planning since the doc only pre-defined 3 mood-dot colors for a taxonomy this spec expands to 5. Mapping: happy → `--rust`, calm → `--moss`, sad → `--ink-blue`, anxious → `--mood-anxious` (`#B98A2E`), angry → `--mood-angry` (`#7A2E1E`).

---

## File Structure

**Backend**
- `backend/src/db/schema.ts` — modify: add `primaryMoodEnum`, `specificEmotionEnum`, `entries` table.
- `backend/src/db/entries.ts` — new: Drizzle-backed CRUD functions, scoped to a `userId`.
- `backend/src/db/entries.test.ts` — new.
- `backend/src/modules/journal/sanitize.ts` — new: the one allow-listed `sanitizeEntryContent` function.
- `backend/src/modules/journal/sanitize.test.ts` — new.
- `backend/src/modules/journal/validation.ts` — new.
- `backend/src/modules/journal/validation.test.ts` — new.
- `backend/src/modules/journal/controller.ts` — new.
- `backend/src/modules/journal/controller.test.ts` — new.
- `backend/src/modules/journal/routes.ts` — new.
- `backend/src/modules/journal/routes.test.ts` — new (Supertest integration).
- `backend/src/app.ts` — modify: mount the journal router.

**Shared types**
- `packages/shared-types/src/index.ts` — modify: add `PrimaryMood`, `SpecificEmotion`, `MOOD_TAXONOMY`, `Entry`, `CreateEntryRequest`, `UpdateEntryRequest`, `EntryListResponse`.

**Client**
- `client/index.html` — modify: add Google Fonts links (Fraunces, Newsreader, IBM Plex Mono).
- `client/src/styles.css` — modify: add a Tailwind v4 `@theme` block with the design system's color/font tokens.
- `client/src/shell/Layout.tsx` — modify: swap the plain white background for the design system's paper background.
- `docs/design/design-system.md` — modify: document the 2 new mood-mark tokens.
- `client/src/api/endpoints.ts` — modify: add a `journal` key.
- `client/src/modules/journal/api/journalHooks.ts` — new.
- `client/src/modules/journal/moodColors.ts` — new: `MOOD_DOT_CLASS` / `MOOD_LABEL` maps.
- `client/src/modules/journal/textUtils.ts` — new: `stripHtml` excerpt helper.
- `client/src/modules/journal/components/MoodPicker/MoodPicker.tsx` — new.
- `client/src/modules/journal/components/MoodPicker/MoodPicker.test.tsx` — new.
- `client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx` — new.
- `client/src/modules/journal/components/EntryView/EntryView.tsx` — new.
- `client/src/modules/journal/components/EntryForm/EntryForm.tsx` — new.
- `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx` — new.
- `client/src/routes/journal/index.tsx` — new.
- `client/src/routes/journal/new.tsx` — new.
- `client/src/routes/journal/$entryId.tsx` — new.
- `client/src/routes/journal/$entryId.edit.tsx` — new.
- `client/src/routes/__root.tsx` — modify: add typed router context (`queryClient`) so `requireAuth` can be used by route `beforeLoad`.
- `client/src/main.tsx` — modify: pass `context: { queryClient }` into `createRouter`.
- `client/src/shell/Nav.tsx` — modify: add "Journal" link (when logged in) and "Register" link (when logged out).
- `client/src/routes/login.tsx` — modify: add a "Don't have an account? Register" link.
- `client/vite.config.ts` — modify: add Vitest `test` config.
- `client/src/test/setup.ts` — new.
- `client/eslint.config.js` — modify: allow test files to import devDependencies.
- `client/package.json` — modify: add test dependencies and a `test` script.
- `CLAUDE.md` — modify: document the new `npm test --workspace=client` command.

**Test coverage decision:** following the existing repo's own precedent (the auth module's client-side pieces — `login.tsx`, `register.tsx`, `client/src/auth/queries.ts` — have zero tests today), this plan writes dedicated client tests only for the two components the spec calls "highest-value": `MoodPicker` (primary → specific filtering) and `EntryForm` (date-collision switches to edit mode). `RichTextEditor`, `EntryView`, and the route components are implemented without dedicated tests; backend coverage is exhaustive (validation/controller/routes) per the spec.

---

### Task 1: Design tokens and fonts foundation

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/styles.css`
- Modify: `client/src/shell/Layout.tsx`
- Modify: `docs/design/design-system.md`

**Interfaces:**
- Produces: Tailwind utility classes `bg-paper`, `bg-paper-card`, `text-ink`, `text-ink-soft`, `bg-ink-blue`/`text-ink-blue`/`border-ink-blue`, `bg-moss`/`text-moss`/`border-moss`, `bg-rust`/`text-rust`/`border-rust`, `border-line`, `bg-mood-anxious`, `bg-mood-angry`, `font-display` (Fraunces), `font-body` (Newsreader), `font-mono` (IBM Plex Mono, overriding Tailwind's default mono stack). All later client tasks rely on these class names existing.

- [ ] **Step 1: Add font links to `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nee.3</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,wght@0,400;0,500;1,400&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Add the design token theme block to `client/src/styles.css`**

```css
@import "tailwindcss";

@theme {
  --color-paper: #F3EEE2;
  --color-paper-card: #EAE2CC;
  --color-ink: #232220;
  --color-ink-soft: #5B564C;
  --color-ink-blue: #2C3E52;
  --color-moss: #55684A;
  --color-rust: #A8532F;
  --color-line: #D8CFB8;
  --color-mood-anxious: #B98A2E;
  --color-mood-angry: #7A2E1E;

  --font-display: 'Fraunces', ui-serif, serif;
  --font-body: 'Newsreader', ui-serif, serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
}
```

- [ ] **Step 3: Update `client/src/shell/Layout.tsx` to use the paper background**

```tsx
import { PropsWithChildren } from 'react';
import { Nav } from './Nav.tsx';

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Document the mood-mark color extension in `docs/design/design-system.md`**

Add the two new tokens to the existing Color table (after the `--line` row):

```markdown
| `--mood-anxious` | `#B98A2E` | Mood mark — anxious (Phase 4a taxonomy) |
| `--mood-angry` | `#7A2E1E` | Mood mark — angry (Phase 4a taxonomy) |
```

Add a new subsection directly after the existing "**Mood mark**" bullet in the Components section:

```markdown
**Mood mark colors (5-value primary taxonomy)**
Phase 4a's two-tier feelings-wheel taxonomy needs five distinct primary-mood colors. Three come from the existing palette; two extend it:

| Primary mood | Token | Hex |
|---|---|---|
| happy | `--rust` | #A8532F |
| calm | `--moss` | #55684A |
| sad | `--ink-blue` | #2C3E52 |
| anxious | `--mood-anxious` | #B98A2E |
| angry | `--mood-angry` | #7A2E1E |

Mood marks still carry a text label on hover/focus per the accessibility floor below, so mood pairs never rely on color alone to stay distinguishable.
```

- [ ] **Step 5: Verify the client still builds**

Run: `npm run build --workspace=client`
Expected: build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add client/index.html client/src/styles.css client/src/shell/Layout.tsx docs/design/design-system.md
git commit -m "feat(client): wire up design system tokens and fonts"
```

---

### Task 2: Shared types for journal entries

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `PrimaryMood`, `SpecificEmotion`, `MOOD_TAXONOMY: Record<PrimaryMood, SpecificEmotion[]>`, `Entry`, `CreateEntryRequest`, `UpdateEntryRequest`, `EntryListResponse`. Every later backend and client task imports these from `@nee3/shared-types`.

- [ ] **Step 1: Add the journal types**

Append to `packages/shared-types/src/index.ts`:

```ts
export type PrimaryMood = 'happy' | 'calm' | 'sad' | 'anxious' | 'angry';

export type SpecificEmotion =
  | 'content'
  | 'proud'
  | 'excited'
  | 'grateful'
  | 'peaceful'
  | 'relaxed'
  | 'relieved'
  | 'secure'
  | 'lonely'
  | 'disappointed'
  | 'hurt'
  | 'grieving'
  | 'nervous'
  | 'overwhelmed'
  | 'insecure'
  | 'worried'
  | 'frustrated'
  | 'irritated'
  | 'resentful'
  | 'jealous';

export const MOOD_TAXONOMY: Record<PrimaryMood, SpecificEmotion[]> = {
  happy: ['content', 'proud', 'excited', 'grateful'],
  calm: ['peaceful', 'relaxed', 'relieved', 'secure'],
  sad: ['lonely', 'disappointed', 'hurt', 'grieving'],
  anxious: ['nervous', 'overwhelmed', 'insecure', 'worried'],
  angry: ['frustrated', 'irritated', 'resentful', 'jealous'],
};

export interface Entry {
  id: number;
  userId: number;
  date: string;
  title: string;
  primaryMood: PrimaryMood;
  specificEmotion: SpecificEmotion;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryRequest {
  date: string;
  title: string;
  primaryMood: PrimaryMood;
  specificEmotion: SpecificEmotion;
  content: string;
}

export type UpdateEntryRequest = CreateEntryRequest;

export interface EntryListResponse {
  entries: Entry[];
  page: number;
  pageSize: number;
  total: number;
}
```

- [ ] **Step 2: Build and lint the package**

Run: `npm run build --workspace=packages/shared-types && npm run lint --workspace=packages/shared-types`
Expected: both succeed with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add journal entry and mood taxonomy types"
```

---

### Task 3: Backend Drizzle schema and migration

**Files:**
- Modify: `backend/src/db/schema.ts`

**Interfaces:**
- Produces: `entries` table, `Entry = typeof entries.$inferSelect`, `NewEntry = typeof entries.$inferInsert`, `primaryMoodEnum`, `specificEmotionEnum`. Task 5 (`db/entries.ts`) imports these directly.

- [ ] **Step 1: Add the enums and table to `backend/src/db/schema.ts`**

```ts
import { pgTable, pgEnum, serial, text, date, integer, timestamp, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

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
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userDateUnique: unique().on(table.userId, table.date),
}));

export type Entry = typeof entries.$inferSelect;
export type NewEntry = typeof entries.$inferInsert;
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate --workspace=backend`
Expected: a new file appears under `backend/src/db/migrations/` (e.g. `0001_*.sql`) creating the `primary_mood`/`specific_emotion` enum types and the `entries` table with a unique constraint on `(user_id, date)`.

- [ ] **Step 3: Verify the backend still builds/lints**

Run: `npm run lint --workspace=backend`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/schema.ts backend/src/db/migrations
git commit -m "feat(backend): add entries table and mood enums"
```

---

### Task 4: Backend content sanitizer

**Files:**
- Create: `backend/src/modules/journal/sanitize.ts`
- Test: `backend/src/modules/journal/sanitize.test.ts`

**Interfaces:**
- Consumes: `sanitize-html` (new dependency).
- Produces: `sanitizeEntryContent(html: string): string`. Task 7 (controller) calls this on every create/update before writing to the database.

- [ ] **Step 1: Install `sanitize-html`**

Run: `npm install --workspace=backend sanitize-html && npm install --workspace=backend -D @types/sanitize-html`

- [ ] **Step 2: Write the failing test**

```ts
import { sanitizeEntryContent } from './sanitize';

describe('sanitizeEntryContent', () => {
  it('keeps allow-listed formatting tags', () => {
    const html = '<p>Hello <strong>world</strong> <em>today</em></p><ul><li>one</li></ul>';
    expect(sanitizeEntryContent(html)).toBe(html);
  });

  it('strips script tags and their contents', () => {
    expect(sanitizeEntryContent('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
  });

  it('strips event-handler attributes', () => {
    expect(sanitizeEntryContent('<p onclick="alert(1)">Hi</p>')).toBe('<p>Hi</p>');
  });

  it('strips disallowed tags but keeps their text content', () => {
    expect(sanitizeEntryContent('<div>Hi</div>')).toBe('Hi');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest sanitize.test.ts` (from `backend/`)
Expected: FAIL with "Cannot find module './sanitize'".

- [ ] **Step 4: Implement**

```ts
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'];

export const sanitizeEntryContent = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
  });
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest sanitize.test.ts` (from `backend/`)
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/modules/journal/sanitize.ts backend/src/modules/journal/sanitize.test.ts
git commit -m "feat(backend): add allow-listed HTML sanitizer for journal entry content"
```

---

### Task 5: Backend db access layer

**Files:**
- Create: `backend/src/db/entries.ts`
- Test: `backend/src/db/entries.test.ts`

**Interfaces:**
- Consumes: `entries`, `Entry`, `NewEntry` from `./schema` (Task 3); `db` from `./index`.
- Produces:
  - `DuplicateEntryError extends Error`
  - `createEntry(input: { userId: number; date: string; title: string; primaryMood: PrimaryMood; specificEmotion: SpecificEmotion; content: string }): Promise<Entry>`
  - `listEntriesByUser(input: { userId: number; page: number; pageSize: number }): Promise<{ entries: Entry[]; total: number }>`
  - `findEntryById(input: { id: number; userId: number }): Promise<Entry | undefined>`
  - `findEntryByDate(input: { userId: number; date: string }): Promise<Entry | undefined>`
  - `updateEntry(input: { id: number; userId: number; date: string; title: string; primaryMood: PrimaryMood; specificEmotion: SpecificEmotion; content: string }): Promise<Entry | undefined>`
  - `deleteEntry(input: { id: number; userId: number }): Promise<boolean>`

  Task 7 (controller) imports all of these (aliasing the CRUD verbs, since the controller exports handlers with the same names).

- [ ] **Step 1: Write the failing test**

```ts
import { sql } from 'drizzle-orm';
import { runMigrations } from './migrate';
import { db, pool } from './index';
import { createUser } from './users';
import {
  createEntry,
  listEntriesByUser,
  findEntryById,
  findEntryByDate,
  updateEntry,
  deleteEntry,
  DuplicateEntryError,
} from './entries';

describe('entry service', () => {
  let userId: number;

  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE entries, users RESTART IDENTITY CASCADE`);
    const user = await createUser('alice', 'alice@example.com', 'secret123');
    userId = user.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  const baseInput = {
    date: '2026-08-01',
    title: 'A good day',
    primaryMood: 'happy' as const,
    specificEmotion: 'content' as const,
    content: '<p>Hello</p>',
  };

  it('creates an entry scoped to the user', async () => {
    const entry = await createEntry({ userId, ...baseInput });
    expect(entry.title).toBe('A good day');
    expect(entry.userId).toBe(userId);
  });

  it('throws DuplicateEntryError for a second entry on the same date', async () => {
    await createEntry({ userId, ...baseInput });
    await expect(
      createEntry({ userId, ...baseInput, title: 'Different title' }),
    ).rejects.toThrow(DuplicateEntryError);
  });

  it('lists entries for a user in reverse-chronological order with a total count', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    await createEntry({ userId, ...baseInput, date: '2026-08-03' });
    await createEntry({ userId, ...baseInput, date: '2026-08-02' });

    const { entries, total } = await listEntriesByUser({ userId, page: 1, pageSize: 20 });
    expect(total).toBe(3);
    expect(entries.map((e) => e.date)).toEqual(['2026-08-03', '2026-08-02', '2026-08-01']);
  });

  it('finds an entry by id scoped to the owning user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const found = await findEntryById({ id: created.id, userId });
    expect(found?.title).toBe('A good day');

    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const notFound = await findEntryById({ id: created.id, userId: otherUser.id });
    expect(notFound).toBeUndefined();
  });

  it('finds an entry by date scoped to the owning user', async () => {
    await createEntry({ userId, ...baseInput });
    const found = await findEntryByDate({ userId, date: '2026-08-01' });
    expect(found?.title).toBe('A good day');
    const notFound = await findEntryByDate({ userId, date: '2026-08-02' });
    expect(notFound).toBeUndefined();
  });

  it('updates an entry scoped to the owning user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const updated = await updateEntry({ id: created.id, userId, ...baseInput, title: 'Updated title' });
    expect(updated?.title).toBe('Updated title');
  });

  it('returns undefined when updating an entry owned by another user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const result = await updateEntry({ id: created.id, userId: otherUser.id, ...baseInput, title: 'Hacked' });
    expect(result).toBeUndefined();
  });

  it('deletes an entry scoped to the owning user and reports success', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const deleted = await deleteEntry({ id: created.id, userId });
    expect(deleted).toBe(true);
    expect(await findEntryById({ id: created.id, userId })).toBeUndefined();
  });

  it('returns false when deleting an entry owned by another user', async () => {
    const created = await createEntry({ userId, ...baseInput });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    const deleted = await deleteEntry({ id: created.id, userId: otherUser.id });
    expect(deleted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/db/entries.test.ts` (from `backend/`)
Expected: FAIL with "Cannot find module './entries'".

- [ ] **Step 3: Implement `backend/src/db/entries.ts`**

```ts
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from './index';
import { entries, Entry, NewEntry } from './schema';

export class DuplicateEntryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEntryError';
  }
}

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: unknown }).code === '23505';

export type NewEntryInput = Omit<NewEntry, 'id' | 'createdAt' | 'updatedAt'>;

export const createEntry = async (input: NewEntryInput): Promise<Entry> => {
  try {
    const [created] = await db.insert(entries).values(input).returning();
    if (!created) {
      throw new Error('Insert did not return a row');
    }
    return created;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DuplicateEntryError('An entry already exists for this date');
    }
    throw err;
  }
};

export type ListEntriesInput = { userId: number; page: number; pageSize: number };
export type EntryPage = { entries: Entry[]; total: number };

export const listEntriesByUser = async ({ userId, page, pageSize }: ListEntriesInput): Promise<EntryPage> => {
  const offset = (page - 1) * pageSize;
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.date))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(entries).where(eq(entries.userId, userId)),
  ]);
  return { entries: rows, total: totalRows[0]?.value ?? 0 };
};

export const findEntryById = async ({ id, userId }: { id: number; userId: number }): Promise<Entry | undefined> => {
  const [row] = await db.select().from(entries).where(and(eq(entries.id, id), eq(entries.userId, userId)));
  return row;
};

export const findEntryByDate = async ({
  userId,
  date,
}: {
  userId: number;
  date: string;
}): Promise<Entry | undefined> => {
  const [row] = await db.select().from(entries).where(and(eq(entries.userId, userId), eq(entries.date, date)));
  return row;
};

export type UpdateEntryInput = { id: number; userId: number } & Omit<NewEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export const updateEntry = async ({ id, userId, ...rest }: UpdateEntryInput): Promise<Entry | undefined> => {
  try {
    const [updated] = await db
      .update(entries)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return updated;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new DuplicateEntryError('An entry already exists for this date');
    }
    throw err;
  }
};

export const deleteEntry = async ({ id, userId }: { id: number; userId: number }): Promise<boolean> => {
  const deleted = await db
    .delete(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)))
    .returning({ id: entries.id });
  return deleted.length > 0;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/db/entries.test.ts` (from `backend/`)
Expected: PASS (requires a running Postgres test database per the existing `.env.test` setup used by `users.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/entries.ts backend/src/db/entries.test.ts
git commit -m "feat(backend): add journal entry db access layer"
```

---

### Task 6: Backend validation

**Files:**
- Create: `backend/src/modules/journal/validation.ts`
- Test: `backend/src/modules/journal/validation.test.ts`

**Interfaces:**
- Consumes: `MOOD_TAXONOMY`, `PrimaryMood`, `SpecificEmotion` from `@nee3/shared-types` (Task 2).
- Produces: `ValidationResult`, `validateEntryInput(input): ValidationResult`, `parsePagination(query): { page: number; pageSize: number }`. Task 7 (controller) imports both.

- [ ] **Step 1: Write the failing test**

```ts
import { validateEntryInput, parsePagination } from './validation';

const validInput = {
  date: '2026-08-01',
  title: 'A good day',
  primaryMood: 'happy',
  specificEmotion: 'content',
  content: '<p>Hi</p>',
};

describe('validateEntryInput', () => {
  it('accepts valid input', () => {
    expect(validateEntryInput(validInput)).toEqual({ valid: true });
  });

  it('rejects a missing or malformed date', () => {
    expect(validateEntryInput({ ...validInput, date: 'not-a-date' })).toEqual({
      valid: false,
      error: 'A valid date is required.',
    });
  });

  it('rejects a missing title', () => {
    expect(validateEntryInput({ ...validInput, title: '' })).toEqual({
      valid: false,
      error: 'Title is required.',
    });
  });

  it('rejects an unknown primary mood', () => {
    expect(validateEntryInput({ ...validInput, primaryMood: 'bored' })).toEqual({
      valid: false,
      error: 'A valid primary mood is required.',
    });
  });

  it('rejects a specific emotion that does not belong to the primary mood bucket', () => {
    expect(
      validateEntryInput({ ...validInput, primaryMood: 'happy', specificEmotion: 'lonely' }),
    ).toEqual({
      valid: false,
      error: 'The specific emotion must match the selected primary mood.',
    });
  });

  it('rejects missing content', () => {
    expect(validateEntryInput({ ...validInput, content: '' })).toEqual({
      valid: false,
      error: 'Content is required.',
    });
  });
});

describe('parsePagination', () => {
  it('defaults to page 1 and pageSize 20', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('parses valid page and pageSize from query strings', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10 });
  });

  it('falls back to defaults for invalid values', () => {
    expect(parsePagination({ page: '-1', pageSize: '9999' })).toEqual({ page: 1, pageSize: 20 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest modules/journal/validation.test.ts` (from `backend/`)
Expected: FAIL with "Cannot find module './validation'".

- [ ] **Step 3: Implement**

```ts
import { MOOD_TAXONOMY, PrimaryMood } from '@nee3/shared-types';

export type ValidationResult = { valid: true } | { valid: false; error: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

const isPrimaryMood = (value: unknown): value is PrimaryMood =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(MOOD_TAXONOMY, value);

export const validateEntryInput = (input: {
  date?: unknown;
  title?: unknown;
  primaryMood?: unknown;
  specificEmotion?: unknown;
  content?: unknown;
}): ValidationResult => {
  if (!isValidDate(input.date)) {
    return { valid: false, error: 'A valid date is required.' };
  }
  if (!isNonEmptyString(input.title)) {
    return { valid: false, error: 'Title is required.' };
  }
  if (!isPrimaryMood(input.primaryMood)) {
    return { valid: false, error: 'A valid primary mood is required.' };
  }
  const bucket: string[] = MOOD_TAXONOMY[input.primaryMood];
  if (typeof input.specificEmotion !== 'string' || !bucket.includes(input.specificEmotion)) {
    return { valid: false, error: 'The specific emotion must match the selected primary mood.' };
  }
  if (!isNonEmptyString(input.content)) {
    return { valid: false, error: 'Content is required.' };
  }
  return { valid: true };
};

export type PaginationParams = { page: number; pageSize: number };

export const parsePagination = (query: { page?: unknown; pageSize?: unknown }): PaginationParams => {
  const page = Number(query.page);
  const pageSize = Number(query.pageSize);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 20,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest modules/journal/validation.test.ts` (from `backend/`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/journal/validation.ts backend/src/modules/journal/validation.test.ts
git commit -m "feat(backend): add journal entry input and pagination validation"
```

---

### Task 7: Backend controller

**Files:**
- Create: `backend/src/modules/journal/controller.ts`
- Test: `backend/src/modules/journal/controller.test.ts`

**Interfaces:**
- Consumes: `validateEntryInput`, `parsePagination` (Task 6); `createEntry`, `updateEntry`, `deleteEntry`, `findEntryById`, `findEntryByDate`, `listEntriesByUser`, `DuplicateEntryError` from `../../db/entries` (Task 5); `sanitizeEntryContent` from `./sanitize` (Task 4); `ApiErrorResponse`, `EntryListResponse`, `CreateEntryRequest`, `UpdateEntryRequest` from `@nee3/shared-types` (Task 2).
- Produces: `listEntries`, `getEntry`, `getEntryByDate`, `createEntry`, `updateEntry`, `deleteEntry` — all `(req: Request, res: Response, next: NextFunction) => Promise<void>`. Task 8 (routes) imports all six.

- [ ] **Step 1: Write the failing test**

```ts
import { Request, Response } from 'express';
import { listEntries, getEntry, getEntryByDate, createEntry, updateEntry, deleteEntry } from './controller';
import * as entryService from '../../db/entries';
import { DuplicateEntryError } from '../../db/entries';

jest.mock('../../db/entries', () => ({
  ...jest.requireActual('../../db/entries'),
  createEntry: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  findEntryById: jest.fn(),
  findEntryByDate: jest.fn(),
  listEntriesByUser: jest.fn(),
}));

const mocked = entryService as jest.Mocked<typeof entryService>;

const buildRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as Response;
};

const fakeEntry = {
  id: 1,
  userId: 7,
  date: '2026-08-01',
  title: 'A good day',
  primaryMood: 'happy' as const,
  specificEmotion: 'content' as const,
  content: '<p>Hello</p>',
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
};

const reqAs = (userId: number, overrides: Partial<Request> = {}): Request =>
  ({ user: { id: userId }, params: {}, query: {}, body: {}, ...overrides }) as unknown as Request;

describe('listEntries', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns a paginated envelope scoped to the requester', async () => {
    mocked.listEntriesByUser.mockResolvedValue({ entries: [fakeEntry], total: 1 });
    const req = reqAs(7, { query: { page: '2', pageSize: '5' } });
    const res = buildRes();

    await listEntries(req, res, jest.fn());

    expect(mocked.listEntriesByUser).toHaveBeenCalledWith({ userId: 7, page: 2, pageSize: 5 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entries: [fakeEntry], page: 2, pageSize: 5, total: 1 });
  });
});

describe('getEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.findEntryById.mockResolvedValue(undefined);
    const req = reqAs(7, { params: { id: '99' } });
    const res = buildRes();

    await getEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the entry on success', async () => {
    mocked.findEntryById.mockResolvedValue(fakeEntry);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await getEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entry: fakeEntry });
  });
});

describe('getEntryByDate', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when no entry exists for the date', async () => {
    mocked.findEntryByDate.mockResolvedValue(undefined);
    const req = reqAs(7, { params: { date: '2026-08-01' } });
    const res = buildRes();

    await getEntryByDate(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('createEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for invalid input without calling the db layer', async () => {
    const req = reqAs(7, { body: {} });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocked.createEntry).not.toHaveBeenCalled();
  });

  it('returns 409 when the db layer reports a duplicate date', async () => {
    mocked.createEntry.mockRejectedValue(new DuplicateEntryError('An entry already exists for this date'));
    const req = reqAs(7, {
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p>',
      },
    });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('sanitizes content and returns 201 on success', async () => {
    mocked.createEntry.mockResolvedValue(fakeEntry);
    const req = reqAs(7, {
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p><script>alert(1)</script>',
      },
    });
    const res = buildRes();

    await createEntry(req, res, jest.fn());

    expect(mocked.createEntry).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, content: '<p>Hi</p>' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('updateEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.updateEntry.mockResolvedValue(undefined);
    const req = reqAs(7, {
      params: { id: '1' },
      body: {
        date: '2026-08-01',
        title: 'A good day',
        primaryMood: 'happy',
        specificEmotion: 'content',
        content: '<p>Hi</p>',
      },
    });
    const res = buildRes();

    await updateEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('deleteEntry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 404 when the entry does not exist or is not owned by the requester', async () => {
    mocked.deleteEntry.mockResolvedValue(false);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await deleteEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 204 on success', async () => {
    mocked.deleteEntry.mockResolvedValue(true);
    const req = reqAs(7, { params: { id: '1' } });
    const res = buildRes();

    await deleteEntry(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest modules/journal/controller.test.ts` (from `backend/`)
Expected: FAIL with "Cannot find module './controller'".

- [ ] **Step 3: Implement `backend/src/modules/journal/controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse, CreateEntryRequest, EntryListResponse, UpdateEntryRequest } from '@nee3/shared-types';
import { validateEntryInput, parsePagination } from './validation';
import { sanitizeEntryContent } from './sanitize';
import {
  createEntry as createEntryRecord,
  updateEntry as updateEntryRecord,
  deleteEntry as deleteEntryRecord,
  findEntryById,
  findEntryByDate,
  listEntriesByUser,
  DuplicateEntryError,
} from '../../db/entries';

const getUserId = (req: Request): number => (req.user as Express.User).id;

export const listEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { page, pageSize } = parsePagination(req.query);
  try {
    const { entries, total } = await listEntriesByUser({ userId: getUserId(req), page, pageSize });
    res.status(200).json({ entries, page, pageSize, total } satisfies EntryListResponse);
  } catch (err) {
    next(err);
  }
};

export const getEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const entry = await findEntryById({ id, userId: getUserId(req) });
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const getEntryByDate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { date } = req.params;
  try {
    const entry = await findEntryByDate({ userId: getUserId(req), date });
    if (!entry) {
      res.status(404).json({ error: 'No entry found for this date' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    next(err);
  }
};

export const createEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validation = validateEntryInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { date, title, primaryMood, specificEmotion, content } = req.body as CreateEntryRequest;
  try {
    const entry = await createEntryRecord({
      userId: getUserId(req),
      date,
      title,
      primaryMood,
      specificEmotion,
      content: sanitizeEntryContent(content),
    });
    res.status(201).json({ entry });
  } catch (err) {
    if (err instanceof DuplicateEntryError) {
      res.status(409).json({ error: err.message } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

export const updateEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validation = validateEntryInput(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  const { date, title, primaryMood, specificEmotion, content } = req.body as UpdateEntryRequest;
  try {
    const entry = await updateEntryRecord({
      id,
      userId: getUserId(req),
      date,
      title,
      primaryMood,
      specificEmotion,
      content: sanitizeEntryContent(content),
    });
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(200).json({ entry });
  } catch (err) {
    if (err instanceof DuplicateEntryError) {
      res.status(409).json({ error: err.message } satisfies ApiErrorResponse);
      return;
    }
    next(err);
  }
};

export const deleteEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
    return;
  }
  try {
    const deleted = await deleteEntryRecord({ id, userId: getUserId(req) });
    if (!deleted) {
      res.status(404).json({ error: 'Entry not found' } satisfies ApiErrorResponse);
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest modules/journal/controller.test.ts` (from `backend/`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/journal/controller.ts backend/src/modules/journal/controller.test.ts
git commit -m "feat(backend): add journal entry controller"
```

---

### Task 8: Backend routes and app wiring

**Files:**
- Create: `backend/src/modules/journal/routes.ts`
- Modify: `backend/src/app.ts`

**Interfaces:**
- Consumes: `ensureAuth` from `../../middleware/auth`; all six handlers from `./controller` (Task 7).
- Produces: a default-exported Express `Router` mounted at `/api/journal` in `app.ts`. Task 9 (integration tests) exercises this mount directly.

- [ ] **Step 1: Implement `backend/src/modules/journal/routes.ts`**

Route order matters: `/entries/by-date/:date` must be registered before `/entries/:id`, or Express would match `by-date` as an `:id` value.

```ts
import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import { listEntries, getEntry, getEntryByDate, createEntry, updateEntry, deleteEntry } from './controller';

const router = Router();

router.use(ensureAuth);

router.get('/entries', listEntries);
router.get('/entries/by-date/:date', getEntryByDate);
router.get('/entries/:id', getEntry);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

export default router;
```

- [ ] **Step 2: Mount the router in `backend/src/app.ts`**

```ts
import express, { Express } from 'express';
import cors from 'cors';
import sessionMiddleware from './config/session';
import passport from './config/passport';
import authRouter from './auth/routes';
import journalRouter from './modules/journal/routes';

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/api/auth', authRouter);
  app.use('/api/journal', journalRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
};
```

- [ ] **Step 3: Verify the backend builds and lints**

Run: `npm run lint --workspace=backend`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/journal/routes.ts backend/src/app.ts
git commit -m "feat(backend): mount journal routes behind auth"
```

---

### Task 9: Backend routes integration tests

**Files:**
- Create: `backend/src/modules/journal/routes.test.ts`

**Interfaces:**
- Consumes: `createApp` from `../../app` (Task 8); `createUser` from `../../db/users`; `runMigrations` from `../../db/migrate`; `db`, `pool` from `../../db`.

- [ ] **Step 1: Write the test**

```ts
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { runMigrations } from '../../db/migrate';
import { db, pool } from '../../db';
import { createUser } from '../../db/users';
import { createApp } from '../../app';

describe('journal routes (integration)', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE entries, users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await pool.end();
  });

  const agentAs = async (username: string) => {
    await createUser(username, `${username}@example.com`, 'secret123');
    const agent = request.agent(createApp());
    await agent.post('/api/auth/login').send({ username, password: 'secret123' });
    return agent;
  };

  const validPayload = {
    date: '2026-08-01',
    title: 'A good day',
    primaryMood: 'happy',
    specificEmotion: 'content',
    content: '<p>Hello</p>',
  };

  it('requires authentication', async () => {
    const res = await request(createApp()).get('/api/journal/entries');
    expect(res.status).toBe(401);
  });

  describe('POST /api/journal/entries', () => {
    it('creates an entry and returns 201', async () => {
      const agent = await agentAs('alice');
      const res = await agent.post('/api/journal/entries').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.entry).toEqual(expect.objectContaining({ title: 'A good day' }));
    });

    it('returns 409 for a second entry on the same date', async () => {
      const agent = await agentAs('alice');
      await agent.post('/api/journal/entries').send(validPayload);
      const res = await agent.post('/api/journal/entries').send({ ...validPayload, title: 'Different' });
      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid input', async () => {
      const agent = await agentAs('alice');
      const res = await agent.post('/api/journal/entries').send({ ...validPayload, title: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/journal/entries', () => {
    it("lists only the requester's entries, reverse-chronological", async () => {
      const alice = await agentAs('alice');
      const bob = await agentAs('bob');
      await alice.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });
      await alice.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-02' });
      await bob.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });

      const res = await alice.get('/api/journal/entries');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.entries.map((e: { date: string }) => e.date)).toEqual(['2026-08-02', '2026-08-01']);
    });
  });

  describe('GET /api/journal/entries/by-date/:date', () => {
    it('finds the entry for a given date', async () => {
      const agent = await agentAs('alice');
      await agent.post('/api/journal/entries').send(validPayload);
      const res = await agent.get('/api/journal/entries/by-date/2026-08-01');
      expect(res.status).toBe(200);
      expect(res.body.entry.title).toBe('A good day');
    });

    it('returns 404 when no entry exists for the date', async () => {
      const agent = await agentAs('alice');
      const res = await agent.get('/api/journal/entries/by-date/2026-08-01');
      expect(res.status).toBe(404);
    });
  });

  describe('cross-user isolation', () => {
    it("returns 404 when reading, updating, or deleting another user's entry", async () => {
      const alice = await agentAs('alice');
      const bob = await agentAs('bob');
      const created = await alice.post('/api/journal/entries').send(validPayload);
      const entryId = created.body.entry.id;

      expect((await bob.get(`/api/journal/entries/${entryId}`)).status).toBe(404);
      expect((await bob.put(`/api/journal/entries/${entryId}`).send(validPayload)).status).toBe(404);
      expect((await bob.delete(`/api/journal/entries/${entryId}`)).status).toBe(404);
    });
  });

  describe('PUT /api/journal/entries/:id', () => {
    it('updates an entry and returns 200', async () => {
      const agent = await agentAs('alice');
      const created = await agent.post('/api/journal/entries').send(validPayload);
      const res = await agent
        .put(`/api/journal/entries/${created.body.entry.id}`)
        .send({ ...validPayload, title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.entry.title).toBe('Updated');
    });
  });

  describe('DELETE /api/journal/entries/:id', () => {
    it('deletes an entry and returns 204', async () => {
      const agent = await agentAs('alice');
      const created = await agent.post('/api/journal/entries').send(validPayload);
      const res = await agent.delete(`/api/journal/entries/${created.body.entry.id}`);
      expect(res.status).toBe(204);
      expect((await agent.get(`/api/journal/entries/${created.body.entry.id}`)).status).toBe(404);
    });
  });
});
```

- [ ] **Step 2: Run the full backend test suite**

Run: `npm test --workspace=backend`
Expected: all suites pass, including the new `routes.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/journal/routes.test.ts
git commit -m "test(backend): add journal routes integration tests"
```

---

### Task 10: Client API layer

**Files:**
- Modify: `client/src/api/endpoints.ts`
- Create: `client/src/modules/journal/api/journalHooks.ts`

**Interfaces:**
- Consumes: `apiClient` from `../../../api/client.ts`; `endpoints` from `../../../api/endpoints.ts`; `Entry`, `CreateEntryRequest`, `UpdateEntryRequest`, `EntryListResponse` from `@nee3/shared-types`.
- Produces: `useEntries(page)`, `useEntry(id)`, `useEntryByDate(date)`, `useCreateEntry()`, `useUpdateEntry()`, `useDeleteEntry()`. Task 14 (`EntryForm`) and Task 15 (routes) use all six.

- [ ] **Step 1: Add journal endpoints**

```ts
export const endpoints = {
  health: '/health',
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  journal: {
    entries: '/journal/entries',
    entry: (id: number) => `/journal/entries/${id}`,
    entryByDate: (date: string) => `/journal/entries/by-date/${date}`,
  },
} as const;
```

- [ ] **Step 2: Implement `client/src/modules/journal/api/journalHooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { CreateEntryRequest, Entry, EntryListResponse, UpdateEntryRequest } from '@nee3/shared-types';
import { apiClient } from '../../../api/client.ts';
import { endpoints } from '../../../api/endpoints.ts';

export const journalKeys = {
  all: ['journal', 'entries'] as const,
  list: (page: number) => ['journal', 'entries', 'list', page] as const,
  detail: (id: number) => ['journal', 'entries', 'detail', id] as const,
  byDate: (date: string) => ['journal', 'entries', 'by-date', date] as const,
};

export const useEntries = (page: number) =>
  useQuery<EntryListResponse>({
    queryKey: journalKeys.list(page),
    queryFn: async () => {
      const { data } = await apiClient.get<EntryListResponse>(endpoints.journal.entries, {
        params: { page, pageSize: 20 },
      });
      return data;
    },
  });

export const useEntry = (id: number) =>
  useQuery<Entry>({
    queryKey: journalKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<{ entry: Entry }>(endpoints.journal.entry(id));
      return data.entry;
    },
  });

export const useEntryByDate = (date: string | null) =>
  useQuery<Entry | null>({
    queryKey: journalKeys.byDate(date ?? ''),
    enabled: Boolean(date),
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ entry: Entry }>(endpoints.journal.entryByDate(date as string));
        return data.entry;
      } catch (err) {
        if (err instanceof AxiosError && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
  });

export const useCreateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<Entry, Error, CreateEntryRequest>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<{ entry: Entry }>(endpoints.journal.entries, input);
      return data.entry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};

export const useUpdateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<Entry, Error, { id: number; input: UpdateEntryRequest }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await apiClient.put<{ entry: Entry }>(endpoints.journal.entry(id), input);
      return data.entry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};

export const useDeleteEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.delete(endpoints.journal.entry(id));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: journalKeys.all }),
  });
};
```

- [ ] **Step 3: Verify lint and typecheck**

Run: `npm run lint --workspace=client && npm run build --workspace=client`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/endpoints.ts client/src/modules/journal/api/journalHooks.ts
git commit -m "feat(client): add journal entry API hooks"
```

---

### Task 11: Client test infrastructure, mood colors, and MoodPicker

**Files:**
- Modify: `client/package.json`
- Modify: `client/vite.config.ts`
- Modify: `client/eslint.config.js`
- Modify: `CLAUDE.md`
- Create: `client/src/test/setup.ts`
- Create: `client/src/modules/journal/moodColors.ts`
- Create: `client/src/modules/journal/components/MoodPicker/MoodPicker.tsx`
- Test: `client/src/modules/journal/components/MoodPicker/MoodPicker.test.tsx`

**Interfaces:**
- Consumes: `MOOD_TAXONOMY`, `PrimaryMood`, `SpecificEmotion` from `@nee3/shared-types`.
- Produces: `MOOD_DOT_CLASS: Record<PrimaryMood, string>`, `MOOD_LABEL: Record<PrimaryMood, string>` (used by Task 13 `EntryView` and Task 15 route `journal/index.tsx`); `<MoodPicker primaryMood specificEmotion onChange>` (used by Task 14 `EntryForm`).

- [ ] **Step 1: Install test dependencies**

Run: `npm install --workspace=client -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`

- [ ] **Step 2: Add the Vitest config to `client/vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [TanStackRouterVite(), viteReact(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
});
```

- [ ] **Step 3: Add the test setup file**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add a `test` script to `client/package.json`**

In the `scripts` block:

```json
"test": "vitest run"
```

- [ ] **Step 5: Allow test files to import devDependencies in `client/eslint.config.js`**

```js
'import/no-extraneous-dependencies': [
  'error',
  { devDependencies: ['vite.config.ts', 'src/routes/__root.tsx', '**/*.test.{ts,tsx}', 'src/test/**'] },
],
```

- [ ] **Step 6: Document the new command in `CLAUDE.md`**

In the "Client (`client/`):" command block, add a line after `npm run preview`:

```
npm test         # vitest run
```

- [ ] **Step 7: Write the failing MoodPicker test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoodPicker } from './MoodPicker.tsx';

describe('MoodPicker', () => {
  it('does not show specific emotions until a primary mood is chosen', () => {
    render(<MoodPicker primaryMood={null} specificEmotion={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('radio', { name: 'content' })).not.toBeInTheDocument();
  });

  it('selecting a primary mood reveals only that bucket\'s specific emotions', () => {
    const handleChange = vi.fn();
    render(<MoodPicker primaryMood={null} specificEmotion={null} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));

    expect(handleChange).toHaveBeenLastCalledWith({ primaryMood: 'happy', specificEmotion: null });
  });

  it('shows only the happy bucket when happy is selected, not other buckets', () => {
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'content' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'peaceful' })).not.toBeInTheDocument();
  });

  it('calls onChange with both values when a specific emotion is picked', () => {
    const handleChange = vi.fn();
    render(<MoodPicker primaryMood="happy" specificEmotion={null} onChange={handleChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'content' }));

    expect(handleChange).toHaveBeenCalledWith({ primaryMood: 'happy', specificEmotion: 'content' });
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm run test --workspace=client`
Expected: FAIL — no test files can run because `MoodPicker.tsx` doesn't exist yet.

- [ ] **Step 9: Implement `client/src/modules/journal/moodColors.ts`**

```ts
import type { PrimaryMood } from '@nee3/shared-types';

export const MOOD_DOT_CLASS: Record<PrimaryMood, string> = {
  happy: 'bg-rust',
  calm: 'bg-moss',
  sad: 'bg-ink-blue',
  anxious: 'bg-mood-anxious',
  angry: 'bg-mood-angry',
};

export const MOOD_LABEL: Record<PrimaryMood, string> = {
  happy: 'Happy',
  calm: 'Calm',
  sad: 'Sad',
  anxious: 'Anxious',
  angry: 'Angry',
};
```

- [ ] **Step 10: Implement `client/src/modules/journal/components/MoodPicker/MoodPicker.tsx`**

```tsx
import { MOOD_TAXONOMY } from '@nee3/shared-types';
import type { PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../moodColors.ts';

export interface MoodPickerProps {
  primaryMood: PrimaryMood | null;
  specificEmotion: SpecificEmotion | null;
  onChange: (value: { primaryMood: PrimaryMood; specificEmotion: SpecificEmotion | null }) => void;
}

const PRIMARY_MOODS = Object.keys(MOOD_TAXONOMY) as PrimaryMood[];

export function MoodPicker({ primaryMood, specificEmotion, onChange }: MoodPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-mono text-xs uppercase tracking-wide text-ink-soft">Mood</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Primary mood">
        {PRIMARY_MOODS.map((mood) => (
          <button
            key={mood}
            type="button"
            role="radio"
            aria-checked={primaryMood === mood}
            onClick={() => onChange({ primaryMood: mood, specificEmotion: null })}
            className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-xs uppercase ${
              primaryMood === mood ? 'border-ink-blue' : 'border-line'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${MOOD_DOT_CLASS[mood]}`} aria-hidden="true" />
            {MOOD_LABEL[mood]}
          </button>
        ))}
      </div>
      {primaryMood && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Specific emotion">
          {MOOD_TAXONOMY[primaryMood].map((emotion) => (
            <button
              key={emotion}
              type="button"
              role="radio"
              aria-checked={specificEmotion === emotion}
              onClick={() => onChange({ primaryMood, specificEmotion: emotion })}
              className={`border px-2 py-1 font-mono text-xs uppercase ${
                specificEmotion === emotion ? 'border-moss text-moss' : 'border-line'
              }`}
            >
              {emotion}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `npm run test --workspace=client`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add client/package.json client/package-lock.json client/vite.config.ts client/eslint.config.js client/src/test/setup.ts client/src/modules/journal/moodColors.ts client/src/modules/journal/components/MoodPicker CLAUDE.md
git commit -m "feat(client): add Vitest infra, mood colors, and MoodPicker"
```

---

### Task 12: RichTextEditor component

**Files:**
- Create: `client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx`

**Interfaces:**
- Consumes: `@tiptap/react`, `@tiptap/starter-kit` (new dependencies).
- Produces: `<RichTextEditor value onChange placeholder?>` — a controlled string-in/string-out wrapper. Task 14 (`EntryForm`) uses it and mocks it in tests (TipTap's ProseMirror internals are not reliably testable under jsdom, and the spec doesn't call out dedicated editor tests as high-value).

- [ ] **Step 1: Install TipTap**

Run: `npm install --workspace=client @tiptap/react @tiptap/starter-kit @tiptap/pm`

- [ ] **Step 2: Implement `client/src/modules/journal/components/RichTextEditor/RichTextEditor.tsx`**

StarterKit is configured to match the design's "bold/italic/headings/lists" scope, disabling the sub-extensions that would otherwise produce HTML outside the backend's sanitizer allow-list (`strike`, `code`, `codeBlock`, `blockquote`, `horizontalRule`).

```tsx
import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: value,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  return (
    <div className="border border-line bg-paper-card p-3">
      <EditorContent editor={editor} className="font-body min-h-40 text-ink" data-placeholder={placeholder} />
    </div>
  );
}
```

- [ ] **Step 3: Verify lint and typecheck**

Run: `npm run lint --workspace=client && npm run build --workspace=client`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/src/modules/journal/components/RichTextEditor
git commit -m "feat(client): add TipTap-based rich text editor"
```

---

### Task 13: EntryView component

**Files:**
- Create: `client/src/modules/journal/components/EntryView/EntryView.tsx`
- Modify: `client/src/styles.css`

**Interfaces:**
- Consumes: `Entry` from `@nee3/shared-types`; `MOOD_DOT_CLASS`, `MOOD_LABEL` from `../../moodColors.ts` (Task 11).
- Produces: `<EntryView entry>`. Task 15 (`journal/$entryId.tsx`) route renders it.

- [ ] **Step 1: Add descendant styling for sanitized entry content to `client/src/styles.css`**

Append below the `@theme` block:

```css
.entry-content p {
  margin-bottom: 1em;
}

.entry-content h1,
.entry-content h2,
.entry-content h3 {
  font-family: var(--font-display);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.entry-content ul,
.entry-content ol {
  margin-bottom: 1em;
  padding-left: 1.5em;
}

.entry-content ul {
  list-style-type: disc;
}

.entry-content ol {
  list-style-type: decimal;
}
```

- [ ] **Step 2: Implement `client/src/modules/journal/components/EntryView/EntryView.tsx`**

The content injected via `dangerouslySetInnerHTML` is safe here specifically because `entry.content` was sanitized server-side (allow-listed tags only, per `backend/src/modules/journal/sanitize.ts`) before it was ever written to the database — see the Content model section of the design spec.

```tsx
import type { Entry } from '@nee3/shared-types';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../moodColors.ts';

export interface EntryViewProps {
  entry: Entry;
}

export function EntryView({ entry }: EntryViewProps) {
  return (
    <article className="mx-auto max-w-2xl border-l-2 border-dashed border-line pl-6">
      <p className="font-mono text-xs uppercase tracking-wide text-ink-soft">{entry.date}</p>
      <h1 className="font-display text-3xl font-semibold text-ink">{entry.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 font-mono text-xs uppercase text-ink-soft">
        <span className={`h-2.5 w-2.5 rounded-full ${MOOD_DOT_CLASS[entry.primaryMood]}`} aria-hidden="true" />
        {MOOD_LABEL[entry.primaryMood]} &middot; {entry.specificEmotion}
      </p>
      <div
        className="entry-content font-body mt-6 text-[1.0625rem] text-ink"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </article>
  );
}
```

- [ ] **Step 3: Verify lint and typecheck**

Run: `npm run lint --workspace=client && npm run build --workspace=client`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/modules/journal/components/EntryView client/src/styles.css
git commit -m "feat(client): add read-only journal entry view"
```

---

### Task 14: EntryForm component

**Files:**
- Create: `client/src/modules/journal/components/EntryForm/EntryForm.tsx`
- Test: `client/src/modules/journal/components/EntryForm/EntryForm.test.tsx`

**Interfaces:**
- Consumes: `useEntryByDate` from `../../api/journalHooks.ts` (Task 10); `<MoodPicker>` (Task 11); `<RichTextEditor>` (Task 12, mocked in the test); `CreateEntryRequest`, `Entry`, `PrimaryMood`, `SpecificEmotion` from `@nee3/shared-types`.
- Produces: `<EntryForm initialEntry? onSubmit>` where `onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>`. Task 15's `journal/new.tsx` and `journal/$entryId.edit.tsx` routes render it.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Entry } from '@nee3/shared-types';

vi.mock('../RichTextEditor/RichTextEditor.tsx', () => ({
  RichTextEditor: ({ value, onChange }: { value: string; onChange: (html: string) => void }) => (
    <textarea aria-label="Content" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const mockUseEntryByDate = vi.fn();
vi.mock('../../api/journalHooks.ts', () => ({
  useEntryByDate: (date: string | null) => mockUseEntryByDate(date),
}));

const { EntryForm } = await import('./EntryForm.tsx');

const existingEntry: Entry = {
  id: 42,
  userId: 1,
  date: '2026-08-01',
  title: 'Existing title',
  primaryMood: 'calm',
  specificEmotion: 'peaceful',
  content: '<p>Existing content</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('EntryForm date-collision', () => {
  it('switches into edit mode and pre-fills the form when the chosen date already has an entry', async () => {
    mockUseEntryByDate.mockImplementation((date: string | null) => ({
      data: date === '2026-08-01' ? existingEntry : null,
    }));
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-01' } });

    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing title');
    });
    expect(screen.getByText(/editing it instead/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /calm/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'peaceful' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-08-01', title: 'Existing title' }),
        42,
      );
    });
  });

  it('submits a plain create when no colliding entry exists', async () => {
    mockUseEntryByDate.mockReturnValue({ data: null });
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntryForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'New entry' } });
    fireEvent.click(screen.getByRole('radio', { name: /happy/i }));
    fireEvent.click(screen.getByRole('radio', { name: 'content' }));
    fireEvent.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New entry' }), undefined);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test --workspace=client`
Expected: FAIL — `./EntryForm.tsx` doesn't exist yet.

- [ ] **Step 3: Implement `client/src/modules/journal/components/EntryForm/EntryForm.tsx`**

```tsx
import { FormEvent, useEffect, useState } from 'react';
import type { CreateEntryRequest, Entry, PrimaryMood, SpecificEmotion } from '@nee3/shared-types';
import { useEntryByDate } from '../../api/journalHooks.ts';
import { MoodPicker } from '../MoodPicker/MoodPicker.tsx';
import { RichTextEditor } from '../RichTextEditor/RichTextEditor.tsx';

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export interface EntryFormProps {
  initialEntry?: Entry;
  onSubmit: (input: CreateEntryRequest, existingEntryId?: number) => Promise<void>;
}

export function EntryForm({ initialEntry, onSubmit }: EntryFormProps) {
  const [date, setDate] = useState(initialEntry?.date ?? todayIsoDate());
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [primaryMood, setPrimaryMood] = useState<PrimaryMood | null>(initialEntry?.primaryMood ?? null);
  const [specificEmotion, setSpecificEmotion] = useState<SpecificEmotion | null>(
    initialEntry?.specificEmotion ?? null,
  );
  const [content, setContent] = useState(initialEntry?.content ?? '');
  const [error, setError] = useState<string | null>(null);

  // Only look up by-date collisions in create mode; an edit route already has its entry.
  const collisionLookupDate = initialEntry ? null : date;
  const { data: collidingEntry } = useEntryByDate(collisionLookupDate);

  useEffect(() => {
    if (collidingEntry) {
      setTitle(collidingEntry.title);
      setPrimaryMood(collidingEntry.primaryMood);
      setSpecificEmotion(collidingEntry.specificEmotion);
      setContent(collidingEntry.content);
    }
  }, [collidingEntry]);

  const existingEntryId = initialEntry?.id ?? collidingEntry?.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!primaryMood || !specificEmotion) {
      setError('Please choose a mood.');
      return;
    }
    try {
      await onSubmit({ date, title, primaryMood, specificEmotion, content }, existingEntryId);
    } catch {
      setError('Could not save this entry.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      {existingEntryId && !initialEntry && (
        <p className="font-mono text-xs uppercase text-rust">
          An entry already exists for this date &mdash; editing it instead.
        </p>
      )}
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-date">
        Date
        <input
          id="entry-date"
          type="date"
          className="border border-line bg-paper-card p-2 font-sans normal-case"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={Boolean(initialEntry)}
          required
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-xs uppercase" htmlFor="entry-title">
        Title
        <input
          id="entry-title"
          className="border border-line bg-paper-card p-2 font-sans normal-case"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <MoodPicker
        primaryMood={primaryMood}
        specificEmotion={specificEmotion}
        onChange={({ primaryMood: p, specificEmotion: s }) => {
          setPrimaryMood(p);
          setSpecificEmotion(s);
        }}
      />
      <RichTextEditor value={content} onChange={setContent} placeholder="Write today's entry..." />
      {error && <p className="text-rust">{error}</p>}
      <button type="submit" className="bg-ink-blue p-2 font-mono text-xs uppercase text-paper">
        Save entry
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test --workspace=client`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/journal/components/EntryForm
git commit -m "feat(client): add EntryForm with date-collision edit-mode switch"
```

---

### Task 15: Journal routes and router context

**Files:**
- Modify: `client/src/routes/__root.tsx`
- Modify: `client/src/main.tsx`
- Create: `client/src/modules/journal/textUtils.ts`
- Create: `client/src/routes/journal/index.tsx`
- Create: `client/src/routes/journal/new.tsx`
- Create: `client/src/routes/journal/$entryId.tsx`
- Create: `client/src/routes/journal/$entryId.edit.tsx`

**Interfaces:**
- Consumes: `useEntries`, `useEntry`, `useCreateEntry`, `useUpdateEntry`, `useDeleteEntry` (Task 10); `<EntryForm>` (Task 14); `<EntryView>` (Task 13); `MOOD_DOT_CLASS`, `MOOD_LABEL` (Task 11); `requireAuth` from `../auth/requireAuth.ts` (existing, previously unused).
- Produces: four routed pages under `/journal`, plus a typed router context (`{ queryClient: QueryClient }`) that any future protected route can reuse via `beforeLoad`.

`requireAuth` (`client/src/auth/requireAuth.ts`) already exists from Phase 3 but has never been wired to the router — no route currently declares a typed context or calls it. This task is the first to use it, so it adds the router-level plumbing first.

- [ ] **Step 1: Add typed router context to `client/src/routes/__root.tsx`**

```tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { AuthProvider } from '../shell/AuthProvider.tsx';
import { Layout } from '../shell/Layout.tsx';

// import.meta.env.PROD is statically replaced at build time, so Vite/Rollup
// dead-code-eliminates the dynamic import below entirely from the production
// bundle rather than just skipping it at runtime.
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import('@tanstack/router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      })),
    );

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <AuthProvider>
      <Layout>
        <Outlet />
      </Layout>
      <Suspense fallback={null}>
        <TanStackRouterDevtools />
      </Suspense>
    </AuthProvider>
  ),
});
```

- [ ] **Step 2: Pass the query client into router context in `client/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import './styles.css';

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
```

- [ ] **Step 3: Implement `client/src/modules/journal/textUtils.ts`**

```ts
export const stripHtml = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
```

- [ ] **Step 4: Implement `client/src/routes/journal/index.tsx`**

```tsx
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useEntries } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

function JournalIndexPage() {
  const { page } = routeApi.useSearch();
  const { data } = useEntries(page);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Journal</h1>
        <Link to="/journal/new" className="bg-ink-blue px-3 py-2 font-mono text-xs uppercase text-paper">
          New entry
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {data?.entries.map((entry) => (
          <li key={entry.id} className="border border-line bg-paper-card p-4">
            <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }} className="block">
              <div className="flex items-center gap-2 font-mono text-xs uppercase text-ink-soft">
                <span className={`h-2 w-2 rounded-full ${MOOD_DOT_CLASS[entry.primaryMood]}`} aria-hidden="true" />
                {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
              </div>
              <h2 className="font-display text-lg font-medium text-ink">{entry.title}</h2>
              <p className="font-body text-ink-soft">{stripHtml(entry.content).slice(0, 140)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {data && data.entries.length === 0 && <p className="text-ink-soft">No entries yet.</p>}
    </div>
  );
}

export const Route = createFileRoute('/journal/')({
  component: JournalIndexPage,
  validateSearch: (search: Record<string, unknown>): JournalIndexSearch => ({
    page: typeof search.page === 'number' ? search.page : Number(search.page) || 1,
  }),
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [ ] **Step 5: Implement `client/src/routes/journal/new.tsx`**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useCreateEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

function NewEntryPage() {
  const navigate = useNavigate();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const handleSubmit = async (input: CreateEntryRequest, existingEntryId?: number) => {
    const entry = existingEntryId
      ? await updateEntry.mutateAsync({ id: existingEntryId, input })
      : await createEntry.mutateAsync(input);
    navigate({ to: '/journal/$entryId', params: { entryId: String(entry.id) } });
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-display text-3xl font-semibold text-ink">New entry</h1>
      <EntryForm onSubmit={handleSubmit} />
    </div>
  );
}

export const Route = createFileRoute('/journal/new')({
  component: NewEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [ ] **Step 6: Implement `client/src/routes/journal/$entryId.tsx`**

```tsx
import { createFileRoute, getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useDeleteEntry, useEntry } from '../../modules/journal/api/journalHooks.ts';
import { EntryView } from '../../modules/journal/components/EntryView/EntryView.tsx';
import { requireAuth } from '../../auth/requireAuth.ts';

const routeApi = getRouteApi('/journal/$entryId');

function EntryDetailPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const deleteEntry = useDeleteEntry();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    await deleteEntry.mutateAsync(Number(entryId));
    navigate({ to: '/journal' });
  };

  if (isLoading || !entry) {
    return <p className="p-4 text-ink-soft">Loading...</p>;
  }

  return (
    <div className="p-4">
      <div className="mx-auto mb-4 flex max-w-2xl items-center gap-3">
        <Link
          to="/journal/$entryId/edit"
          params={{ entryId }}
          className="border border-ink-blue px-3 py-2 font-mono text-xs uppercase text-ink-blue"
        >
          Edit
        </Link>
        {confirmingDelete ? (
          <button
            type="button"
            onClick={handleDelete}
            className="bg-rust px-3 py-2 font-mono text-xs uppercase text-paper"
          >
            Confirm delete
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="border border-rust px-3 py-2 font-mono text-xs uppercase text-rust"
          >
            Delete
          </button>
        )}
      </div>
      <EntryView entry={entry} />
    </div>
  );
}

export const Route = createFileRoute('/journal/$entryId')({
  component: EntryDetailPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [ ] **Step 7: Implement `client/src/routes/journal/$entryId.edit.tsx`**

```tsx
import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import type { CreateEntryRequest } from '@nee3/shared-types';
import { EntryForm } from '../../modules/journal/components/EntryForm/EntryForm.tsx';
import { useEntry, useUpdateEntry } from '../../modules/journal/api/journalHooks.ts';
import { requireAuth } from '../../auth/requireAuth.ts';

const routeApi = getRouteApi('/journal/$entryId/edit');

function EditEntryPage() {
  const { entryId } = routeApi.useParams();
  const navigate = useNavigate();
  const { data: entry, isLoading } = useEntry(Number(entryId));
  const updateEntry = useUpdateEntry();

  if (isLoading || !entry) {
    return <p className="p-4 text-ink-soft">Loading...</p>;
  }

  const handleSubmit = async (input: CreateEntryRequest) => {
    await updateEntry.mutateAsync({ id: entry.id, input });
    navigate({ to: '/journal/$entryId', params: { entryId } });
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 font-display text-3xl font-semibold text-ink">Edit entry</h1>
      <EntryForm initialEntry={entry} onSubmit={handleSubmit} />
    </div>
  );
}

export const Route = createFileRoute('/journal/$entryId/edit')({
  component: EditEntryPage,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient)({ location }),
});
```

- [ ] **Step 8: Build to regenerate the route tree and verify**

Run: `npm run build --workspace=client`
Expected: build succeeds; `client/src/routeTree.gen.ts` is regenerated on disk to include the four new `/journal/*` routes (this file is committed, per the existing repo convention — check `git diff --stat client/src/routeTree.gen.ts`).

- [ ] **Step 9: Commit**

```bash
git add client/src/routes/__root.tsx client/src/main.tsx client/src/modules/journal/textUtils.ts client/src/routes/journal client/src/routeTree.gen.ts
git commit -m "feat(client): add journal routes and wire router auth context"
```

---

### Task 16: Nav journal link and registration-unreachable fix

**Files:**
- Modify: `client/src/shell/Nav.tsx`
- Modify: `client/src/routes/login.tsx`

**Interfaces:**
- Consumes: `useAuth` from `../shell/AuthProvider.tsx` (existing, `Nav.tsx`); nothing new for `login.tsx`.

This folds in the spec's addendum: `/register` exists and works but nothing in the UI links to it.

- [ ] **Step 1: Update `client/src/shell/Nav.tsx`**

```tsx
import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from './AuthProvider.tsx';

export function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate({ to: '/' });
    }
  };

  return (
    <nav className="flex items-center gap-4 border-b border-line p-4">
      <Link to="/" className="font-display font-medium text-ink">
        Nee.3
      </Link>
      <div className="ml-auto flex items-center gap-4 font-mono text-xs uppercase">
        {user ? (
          <>
            <Link to="/journal" className="text-ink-blue">
              Journal
            </Link>
            <span className="text-ink-soft">{user.username}</span>
            <button type="button" onClick={handleLogout} className="text-ink-blue">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-ink-blue">
              Log in
            </Link>
            <Link to="/register" className="text-ink-blue">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Add a register link to `client/src/routes/login.tsx`**

Add directly below the closing `</form>` tag, still inside the outer `<div>`:

```tsx
<p className="mt-3 text-sm text-ink-soft">
  Don&apos;t have an account? <Link to="/register">Register</Link>
</p>
```

This requires importing `Link` from `@tanstack/react-router` in that file (added to the existing `createFileRoute, getRouteApi, useNavigate` import).

- [ ] **Step 3: Verify lint, typecheck, and full client build**

Run: `npm run lint --workspace=client && npm run build --workspace=client`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/shell/Nav.tsx client/src/routes/login.tsx
git commit -m "fix(client): make registration reachable from nav and login page"
```

---

## Final Verification

- [ ] Run `npm run lint` (root) — all three workspaces pass.
- [ ] Run `npm test` (root) — backend suite passes, including all journal tests.
- [ ] Run `npm run test --workspace=client` — MoodPicker and EntryForm suites pass.
- [ ] Run `npm run build` (root) — shared-types and client build cleanly.
- [ ] Manually smoke-test in a browser: log in, create an entry, revisit its date to confirm the collision-switches-to-edit flow, edit it, delete it, and confirm the list/detail views render with the design system's fonts and mood colors.
