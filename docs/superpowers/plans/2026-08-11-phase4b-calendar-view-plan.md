# Phase 4b: Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-month calendar strip above `/journal` that marks entry-days with their mood color and filters the list below to a clicked date/range.

**Architecture:** A new backend range-query endpoint (`GET /api/journal/entries/by-range`) serves both grid-marking and list-filtering. Client-side, a shared, module-agnostic `MarkedRangeCalendar` (wrapping shadcn's `Calendar`/react-day-picker) renders the two-month grid and owns click-to-select-range interaction; a journal-specific `JournalCalendarFilter` wraps it with the header (arrows, month/year selects, clear-filter link), fetches entries for the visible months, and reports the active range up to `journal/index.tsx`, which swaps its data source between the existing paginated list and the new range query.

**Tech Stack:** Express + Drizzle ORM (Postgres) on the backend; TanStack Router/Query + shadcn `Calendar`/`Select` (react-day-picker + Radix, added via the real `shadcn` CLI) + Tailwind CSS v4 on the client.

## Global Constraints

- Panel styling: flat `--paper-card` fill, 1px `--line` border, 4px radius. Not styled as an index card.
- Header row: `‹`/`›` arrow buttons (secondary-button style: transparent fill, 1.5px `--ink-blue` border) flank a Month select and a Year select, restyled to the flat/mono design system look, not shadcn's default theme. The selects target the left-hand month directly; the right-hand month is always left+1 with no independent control. A "Clear filter" link (mono, `--moss`, underline) appears only when a filter is active.
- Grid: always two months side by side (`numberOfMonths={2}`), never a toggle. Day-of-week header uses single-letter mono labels (S M T W T F S).
- Day cell states: empty (no entry) is inert — no ring, ~30% opacity, not hoverable/clickable/a range anchor. Has-entry: 1.3px ring colored by that entry's primary mood (`happy:#A8532F`, `calm:#55684A`, `sad:#2C3E52`, `anxious:#B98A2E`, `angry:#7A2E1E`, matching `moodColors.ts`/`styles.css`). In-range: `rgba(85,104,74,0.14)` fill behind the day number. Range endpoint: solid `--moss` fill, paper-colored text.
- Interaction: only entry-days are clickable. Single click sets a one-day range (`from === to`). A second, later click extends the range. A click before the current start resets the range to start there. "Clear filter" empties the range and restores the paginated list. Changing month/year re-marks the visible grids but never clears an active filter by itself.
- Filter strip text: `Showing entries <start> – <end>, <year> · N entries` (or just the single date when `from === to`), mono/uppercase meta style.
- Backend endpoint: `GET /api/journal/entries/by-range?start=YYYY-MM-DD&end=YYYY-MM-DD`, behind `ensureAuth`, scoped to `req.user.id`, inclusive range, sorted ascending by date, no pagination. Response body is a bare `Entry[]` array (no envelope).
- Errors: 400 if `start`/`end` missing, malformed, or `start > end`. Empty array with 200 (not 404) when nothing matches.
- Testing split: `validation.test.ts`, `controller.test.ts` (mocked db layer), `routes.test.ts` (Supertest integration) on the backend; component tests for `MarkedRangeCalendar` and `JournalCalendarFilter` on the client.
- Out of scope: insights/overview, AI features, MongoDB migration, a 1/2-month toggle, and any change to `/journal/new`, `/journal/:entryId`, or `/journal/:entryId.edit`.
- shadcn setup note: the real `shadcn` CLI's `init` subcommand grafts an unrelated oklch theme system, a Geist font import, and `tw-animate-css` into `styles.css` — none of this is part of the spec. Task 1 skips `init` entirely (hand-authors the two trivial files `init` would have produced) and runs only `add calendar select`, which pulls in solely the functional dependencies (`radix-ui`, `react-day-picker`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`) with no changes to `styles.css`. This was verified against the real CLI (v4.17.0) in a throwaway scratch copy before writing this plan.

---

### Task 1: shadcn tooling setup (path alias, Calendar + Select primitives)

**Files:**
- Modify: `client/tsconfig.json`
- Modify: `client/vite.config.ts`
- Create: `client/components.json`
- Create: `client/src/lib/utils.ts`
- Create (via CLI): `client/src/components/ui/calendar.tsx`, `client/src/components/ui/select.tsx`, `client/src/components/ui/button.tsx`
- Modify: `client/package.json` (new dependencies)

**Interfaces:**
- Produces: a `@/*` path alias resolving to `client/src/*` (used by all later client tasks and by the generated `ui/` files themselves), and the `cn()` helper at `client/src/lib/utils.ts` (`export function cn(...inputs: ClassValue[]): string`).
- Produces: `Calendar` component at `client/src/components/ui/calendar.tsx` (props: standard react-day-picker `DayPicker` props, plus `buttonVariant?`), and `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`/`SelectGroup`/`SelectLabel`/`SelectSeparator` at `client/src/components/ui/select.tsx`.

- [ ] **Step 1: Add the `@/*` path alias to `client/tsconfig.json`**

In `client/tsconfig.json`, add `"paths"` inside `compilerOptions` (after `"baseUrl": "src"`):

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "composite": true,
    "baseUrl": "src",
    "paths": { "@/*": ["./*"] },
    "types": ["vite/client"]
  },
  "references": [{ "path": "../packages/shared-types" }],
  "include": ["src"]
}
```

- [ ] **Step 2: Add the matching alias to `client/vite.config.ts`**

Replace the full file with:

```ts
/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig({
  plugins: [TanStackRouterVite(), viteReact(), tailwindcss()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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

- [ ] **Step 3: Hand-author `client/components.json`**

This is the config `shadcn init` would normally generate. Writing it directly skips `init`'s unrelated theme graft (see Global Constraints) while still using the real CLI for `add`.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 4: Hand-author `client/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Run the shadcn CLI to add Calendar and Select**

From `client/`:

```bash
npx shadcn@latest add calendar select --yes
```

Expected output: `Created 3 files: src/components/ui/select.tsx, src/components/ui/button.tsx, src/components/ui/calendar.tsx`.

- [ ] **Step 6: Verify no unrelated graft happened**

```bash
git diff --stat client/src/styles.css
```

Expected: no output (empty diff). If `styles.css` shows any changes, `init` ran somewhere in the process — stop and re-check Steps 1-5; do not proceed with a modified `styles.css`.

- [ ] **Step 7: Verify and complete the new dependencies**

```bash
grep -E '"(radix-ui|react-day-picker|lucide-react|class-variance-authority|clsx|tailwind-merge|date-fns)"' client/package.json
```

The CLI reliably adds `radix-ui` and `react-day-picker` (and often `date-fns`, a `react-day-picker` dependency) to `client/package.json`. It has been observed to silently skip installing `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge` even though the generated files import them. For any of these six packages missing from `client/package.json`, install it explicitly from the repo root:

```bash
npm install <missing-package> --workspace=client
```

Repeat until `radix-ui`, `react-day-picker`, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge` are all present in `client/package.json`'s `dependencies`.

- [ ] **Step 8: Reformat the generated files to match project style**

The generated `ui/*.tsx` files use shadcn's own formatting conventions (no semicolons), which don't match this project's Prettier config.

```bash
npm run format
```

- [ ] **Step 9: Verify the client still builds and lints**

```bash
npm run build --workspace=client
npm run lint --workspace=client
```

Expected: both succeed. If `lint` flags issues in the generated `ui/*.tsx` files (e.g. Airbnb rules the shadcn template doesn't follow), fix them minimally in place — these files are ordinary project source once generated, not vendored/ignored code.

- [ ] **Step 10: Commit**

```bash
git add client/tsconfig.json client/vite.config.ts client/components.json client/src/lib/utils.ts client/src/components/ui/calendar.tsx client/src/components/ui/select.tsx client/src/components/ui/button.tsx client/package.json client/package-lock.json
git commit -m "feat(client): add shadcn Calendar/Select primitives for phase 4b"
```

---

### Task 2: Shared type for the range query

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `EntryRangeQuery { start: string; end: string }`, exported from `@nee3/shared-types`.

- [ ] **Step 1: Add the type**

Append to `packages/shared-types/src/index.ts` (after `EntryListResponse`):

```ts
export interface EntryRangeQuery {
  start: string;
  end: string;
}
```

- [ ] **Step 2: Build shared-types**

```bash
npm run build --workspace=@nee3/shared-types
```

Expected: succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add EntryRangeQuery for phase 4b calendar view"
```

---

### Task 3: Backend db-layer range query

**Files:**
- Modify: `backend/src/db/entries.ts`
- Modify: `backend/src/db/entries.test.ts`

**Interfaces:**
- Consumes: `db` from `backend/src/db/index.ts`, `entries` table from `backend/src/db/schema.ts` (existing).
- Produces: `listEntriesByRange(input: { userId: number; start: string; end: string }): Promise<Entry[]>`, used by Task 5's controller.

- [ ] **Step 1: Write the failing test**

Append to `backend/src/db/entries.test.ts` (add `listEntriesByRange` to the existing import from `./entries`, and add this `describe` block at the end of the file, before the closing of the outer `describe('entry service', ...)`):

```ts
  it('lists entries within an inclusive date range, sorted ascending, scoped to the user', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    await createEntry({ userId, ...baseInput, date: '2026-08-15' });
    await createEntry({ userId, ...baseInput, date: '2026-08-31' });
    const otherUser = await createUser('bob', 'bob@example.com', 'secret123');
    await createEntry({ userId: otherUser.id, ...baseInput, date: '2026-08-15' });

    const result = await listEntriesByRange({ userId, start: '2026-08-01', end: '2026-08-15' });

    expect(result.map((e) => e.date)).toEqual(['2026-08-01', '2026-08-15']);
  });

  it('returns an empty array when nothing falls in range', async () => {
    await createEntry({ userId, ...baseInput, date: '2026-08-01' });
    const result = await listEntriesByRange({ userId, start: '2026-09-01', end: '2026-09-30' });
    expect(result).toEqual([]);
  });
```

And update the import at the top of the file:

```ts
import {
  createEntry,
  listEntriesByUser,
  listEntriesByRange,
  findEntryById,
  findEntryByDate,
  updateEntry,
  deleteEntry,
  DuplicateEntryError,
} from './entries';
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/db/entries.test.ts -t "range" --workspace=backend
```

Expected: FAIL with `listEntriesByRange is not a function` (or a TS compile error naming the missing export).

- [ ] **Step 3: Implement `listEntriesByRange`**

In `backend/src/db/entries.ts`, update the drizzle-orm import and add the function at the end of the file:

```ts
import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm';
```

```ts
export type ListEntriesByRangeInput = { userId: number; start: string; end: string };

export const listEntriesByRange = async ({
  userId,
  start,
  end,
}: ListEntriesByRangeInput): Promise<Entry[]> =>
  db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.date, start), lte(entries.date, end)))
    .orderBy(asc(entries.date));
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/db/entries.test.ts --workspace=backend
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/entries.ts backend/src/db/entries.test.ts
git commit -m "feat(backend): add listEntriesByRange db-layer query"
```

---

### Task 4: Backend range-query validation

**Files:**
- Modify: `backend/src/modules/journal/validation.ts`
- Modify: `backend/src/modules/journal/validation.test.ts`

**Interfaces:**
- Produces: `validateRangeQuery(query: { start?: unknown; end?: unknown }): ValidationResult`, used by Task 5's controller.

- [ ] **Step 1: Write the failing tests**

Append to `backend/src/modules/journal/validation.test.ts`:

```ts
describe('validateRangeQuery', () => {
  it('accepts a valid range', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: '2026-08-31' })).toEqual({
      valid: true,
    });
  });

  it('accepts a single-day range', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: '2026-08-01' })).toEqual({
      valid: true,
    });
  });

  it('rejects a missing start', () => {
    expect(validateRangeQuery({ end: '2026-08-31' })).toEqual({
      valid: false,
      error: 'A valid start date is required.',
    });
  });

  it('rejects a malformed end', () => {
    expect(validateRangeQuery({ start: '2026-08-01', end: 'not-a-date' })).toEqual({
      valid: false,
      error: 'A valid end date is required.',
    });
  });

  it('rejects start after end', () => {
    expect(validateRangeQuery({ start: '2026-08-31', end: '2026-08-01' })).toEqual({
      valid: false,
      error: 'start must not be after end.',
    });
  });
});
```

And update the import at the top of the file:

```ts
import {
  validateEntryInput,
  validateRangeQuery,
  parsePagination,
  normalizeSpecificEmotion,
} from './validation';
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest src/modules/journal/validation.test.ts -t "validateRangeQuery" --workspace=backend
```

Expected: FAIL with `validateRangeQuery is not a function` (or a TS compile error naming the missing export).

- [ ] **Step 3: Implement `validateRangeQuery`**

Append to `backend/src/modules/journal/validation.ts`:

```ts
export const validateRangeQuery = (query: { start?: unknown; end?: unknown }): ValidationResult => {
  if (!isValidDate(query.start)) {
    return { valid: false, error: 'A valid start date is required.' };
  }
  if (!isValidDate(query.end)) {
    return { valid: false, error: 'A valid end date is required.' };
  }
  if (query.start > query.end) {
    return { valid: false, error: 'start must not be after end.' };
  }
  return { valid: true };
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest src/modules/journal/validation.test.ts --workspace=backend
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/journal/validation.ts backend/src/modules/journal/validation.test.ts
git commit -m "feat(backend): add validateRangeQuery for the by-range endpoint"
```

---

### Task 5: Backend controller + route for `GET /entries/by-range`

**Files:**
- Modify: `backend/src/modules/journal/controller.ts`
- Modify: `backend/src/modules/journal/controller.test.ts`
- Modify: `backend/src/modules/journal/routes.ts`
- Modify: `backend/src/modules/journal/routes.test.ts`

**Interfaces:**
- Consumes: `listEntriesByRange` (Task 3), `validateRangeQuery` (Task 4).
- Produces: `getEntriesByRange` request handler, mounted at `GET /api/journal/entries/by-range`.

- [ ] **Step 1: Write the failing controller test**

Append to `backend/src/modules/journal/controller.test.ts`:

```ts
describe('getEntriesByRange', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns 400 for an invalid range without calling the db layer', async () => {
    const req = reqAs(7, { query: { start: 'not-a-date', end: '2026-08-31' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocked.listEntriesByRange).not.toHaveBeenCalled();
  });

  it('returns the range scoped to the requester as a bare array', async () => {
    mocked.listEntriesByRange.mockResolvedValue([fakeEntry]);
    const req = reqAs(7, { query: { start: '2026-08-01', end: '2026-08-31' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(mocked.listEntriesByRange).toHaveBeenCalledWith({
      userId: 7,
      start: '2026-08-01',
      end: '2026-08-31',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([fakeEntry]);
  });

  it('returns an empty array with 200 when nothing matches', async () => {
    mocked.listEntriesByRange.mockResolvedValue([]);
    const req = reqAs(7, { query: { start: '2026-09-01', end: '2026-09-30' } });
    const res = buildRes();

    await getEntriesByRange(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
```

And update the top of `controller.test.ts` to import/mock the new handler and db function:

```ts
import { Request, Response } from 'express';
import {
  listEntries,
  getEntry,
  getEntryByDate,
  getEntriesByRange,
  createEntry,
  updateEntry,
  deleteEntry,
} from './controller';
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
  listEntriesByRange: jest.fn(),
}));
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/modules/journal/controller.test.ts -t "getEntriesByRange" --workspace=backend
```

Expected: FAIL with `getEntriesByRange is not a function` (or a TS compile error naming the missing export).

- [ ] **Step 3: Implement the controller handler**

In `backend/src/modules/journal/controller.ts`, update the imports:

```ts
import { validateEntryInput, validateRangeQuery, parsePagination, normalizeSpecificEmotion } from './validation';
```

```ts
import {
  createEntry as createEntryRecord,
  updateEntry as updateEntryRecord,
  deleteEntry as deleteEntryRecord,
  findEntryById,
  findEntryByDate,
  listEntriesByUser,
  listEntriesByRange,
  DuplicateEntryError,
} from '../../db/entries';
```

Add the handler (after `getEntryByDate`):

```ts
export const getEntriesByRange = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const validation = validateRangeQuery(req.query);
  if (!validation.valid) {
    res.status(400).json({ error: validation.error } satisfies ApiErrorResponse);
    return;
  }
  const { start, end } = req.query as { start: string; end: string };
  try {
    const rangeEntries = await listEntriesByRange({ userId: getUserId(req), start, end });
    res.status(200).json(rangeEntries);
  } catch (err) {
    next(err);
  }
};
```

- [ ] **Step 4: Run the controller test to verify it passes**

```bash
npx jest src/modules/journal/controller.test.ts --workspace=backend
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Wire the route**

In `backend/src/modules/journal/routes.ts`, add `getEntriesByRange` to the import and register the route before `/entries/:id`:

```ts
import { Router } from 'express';
import { ensureAuth } from '../../middleware/auth';
import {
  listEntries,
  getEntry,
  getEntryByDate,
  getEntriesByRange,
  createEntry,
  updateEntry,
  deleteEntry,
} from './controller';

const router = Router();

router.use(ensureAuth);

router.get('/entries', listEntries);
router.get('/entries/by-date/:date', getEntryByDate);
router.get('/entries/by-range', getEntriesByRange);
router.get('/entries/:id', getEntry);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

export default router;
```

- [ ] **Step 6: Write the failing routes integration test**

Append to `backend/src/modules/journal/routes.test.ts` (a new `describe` block, before the closing of the outer `describe('journal routes (integration)', ...)`):

```ts
  describe('GET /api/journal/entries/by-range', () => {
    it("returns entries within range, scoped to the requester, sorted ascending", async () => {
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-01' });
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-15' });
      await aliceAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-09-01' });
      await bobAgent.post('/api/journal/entries').send({ ...validPayload, date: '2026-08-10' });

      const res = await aliceAgent.get(
        '/api/journal/entries/by-range?start=2026-08-01&end=2026-08-31',
      );

      expect(res.status).toBe(200);
      expect(res.body.map((e: { date: string }) => e.date)).toEqual([
        '2026-08-01',
        '2026-08-15',
      ]);
    });

    it('returns 400 for a malformed range', async () => {
      const res = await aliceAgent.get('/api/journal/entries/by-range?start=bad&end=2026-08-31');
      expect(res.status).toBe(400);
    });

    it('returns an empty array with 200 when nothing matches', async () => {
      const res = await aliceAgent.get(
        '/api/journal/entries/by-range?start=2099-01-01&end=2099-01-31',
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('requires authentication', async () => {
      const res = await request(createApp()).get(
        '/api/journal/entries/by-range?start=2026-08-01&end=2026-08-31',
      );
      expect(res.status).toBe(401);
    });
  });
```

- [ ] **Step 7: Run the routes test to verify it passes**

```bash
npx jest src/modules/journal/routes.test.ts --workspace=backend
```

Expected: PASS, all tests in the file. (Requires the local test Postgres database to be running per the existing test setup — same as all other `routes.test.ts` runs in this repo.)

- [ ] **Step 8: Run the full backend test suite**

```bash
npm test --workspace=backend
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/journal/controller.ts backend/src/modules/journal/controller.test.ts backend/src/modules/journal/routes.ts backend/src/modules/journal/routes.test.ts
git commit -m "feat(backend): add GET /api/journal/entries/by-range endpoint"
```

---

### Task 6: Client API wiring (endpoint constant + `useEntriesByRange` hook)

**Files:**
- Modify: `client/src/api/endpoints.ts`
- Modify: `client/src/modules/journal/api/journalHooks.ts`

**Interfaces:**
- Consumes: `GET /api/journal/entries/by-range` (Task 5).
- Produces: `useEntriesByRange({ start, end }: { start: string; end: string }): UseQueryResult<Entry[]>`, used by Task 9 (`JournalCalendarFilter`) and Task 10 (`journal/index.tsx`). `journalKeys.byRange(start, end)` query key.

- [ ] **Step 1: Add the endpoint constant**

In `client/src/api/endpoints.ts`, add `entriesByRange` to the `journal` object:

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
    entriesByRange: '/journal/entries/by-range',
  },
} as const;
```

- [ ] **Step 2: Add the query key and hook**

In `client/src/modules/journal/api/journalHooks.ts`, add `byRange` to `journalKeys`:

```ts
export const journalKeys = {
  all: ['journal', 'entries'] as const,
  list: (page: number) => ['journal', 'entries', 'list', page] as const,
  detail: (id: number) => ['journal', 'entries', 'detail', id] as const,
  byDate: (date: string) => ['journal', 'entries', 'by-date', date] as const,
  byRange: (start: string, end: string) => ['journal', 'entries', 'by-range', start, end] as const,
};
```

Add the hook (after `useEntryByDate`):

```ts
export const useEntriesByRange = ({ start, end }: { start: string; end: string }) =>
  useQuery<Entry[]>({
    queryKey: journalKeys.byRange(start, end),
    enabled: Boolean(start) && Boolean(end),
    queryFn: async () => {
      const { data } = await apiClient.get<Entry[]>(endpoints.journal.entriesByRange, {
        params: { start, end },
      });
      return data;
    },
  });
```

- [ ] **Step 3: Typecheck**

```bash
npm run build --workspace=client
```

Expected: succeeds (no runtime test needed — this task adds no new branching logic; it's exercised by Tasks 9-10's tests).

- [ ] **Step 4: Commit**

```bash
git add client/src/api/endpoints.ts client/src/modules/journal/api/journalHooks.ts
git commit -m "feat(client): add useEntriesByRange hook and by-range endpoint constant"
```

---

### Task 7: Mood ring color map

**Files:**
- Modify: `client/src/modules/journal/moodColors.ts`

**Interfaces:**
- Produces: `MOOD_RING_COLOR: Record<PrimaryMood, string>` (hex values), used by Task 9 (`JournalCalendarFilter`) to build `markedDates`.

- [ ] **Step 1: Add the map**

Append to `client/src/modules/journal/moodColors.ts`:

```ts
export const MOOD_RING_COLOR: Record<PrimaryMood, string> = {
  happy: '#A8532F',
  calm: '#55684A',
  sad: '#2C3E52',
  anxious: '#B98A2E',
  angry: '#7A2E1E',
};
```

- [ ] **Step 2: Typecheck**

```bash
npm run build --workspace=client
```

Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/journal/moodColors.ts
git commit -m "feat(client): add MOOD_RING_COLOR map for the calendar day ring"
```

---

### Task 8: `MarkedRangeCalendar` (shared, module-agnostic)

**Files:**
- Create: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.tsx`
- Create: `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx`

**Interfaces:**
- Consumes: `Calendar` from `client/src/components/ui/calendar.tsx` (Task 1).
- Produces:
  ```ts
  export interface DateRangeValue {
    from?: Date;
    to?: Date;
  }
  export interface MarkedRangeCalendarProps {
    markedDates: Map<string, string>;
    visibleMonth: Date;
    onVisibleMonthChange: (month: Date) => void;
    selectedRange: DateRangeValue;
    onRangeChange: (range: DateRangeValue) => void;
  }
  export function MarkedRangeCalendar(props: MarkedRangeCalendarProps): JSX.Element;
  export function computeNextRange(current: DateRangeValue, clicked: Date): DateRangeValue;
  export function toIsoDate(date: Date): string;
  ```
  Used by Task 9 (`JournalCalendarFilter`).

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { MarkedRangeCalendar, computeNextRange, toIsoDate } from './MarkedRangeCalendar.tsx';

describe('computeNextRange', () => {
  it('starts a one-day range on the first click', () => {
    const clicked = new Date(2026, 7, 15);
    expect(computeNextRange({}, clicked)).toEqual({ from: clicked, to: clicked });
  });

  it('extends the range on a second, later click', () => {
    const first = new Date(2026, 7, 10);
    const second = new Date(2026, 7, 20);
    expect(computeNextRange({ from: first, to: first }, second)).toEqual({
      from: first,
      to: second,
    });
  });

  it('resets the range when the second click is before the current start', () => {
    const first = new Date(2026, 7, 15);
    const earlier = new Date(2026, 7, 5);
    expect(computeNextRange({ from: first, to: first }, earlier)).toEqual({
      from: earlier,
      to: earlier,
    });
  });

  it('starts a fresh one-day range on the click after a completed two-day range', () => {
    const from = new Date(2026, 7, 5);
    const to = new Date(2026, 7, 15);
    const next = new Date(2026, 7, 10);
    expect(computeNextRange({ from, to }, next)).toEqual({ from: next, to: next });
  });
});

describe('MarkedRangeCalendar', () => {
  const visibleMonth = new Date(2026, 7, 1);

  it('only renders marked days as enabled, clickable buttons', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2026-08-15' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: '2026-08-16' })).toBeDisabled();
  });

  it('calls onRangeChange when a marked day is clicked', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    const handleRangeChange = vi.fn();
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={handleRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-08-15' }));

    expect(handleRangeChange).toHaveBeenCalledWith({
      from: new Date(2026, 7, 15),
      to: new Date(2026, 7, 15),
    });
  });

  it('does not call onRangeChange when an unmarked day is clicked', () => {
    const markedDates = new Map([['2026-08-15', '#A8532F']]);
    const handleRangeChange = vi.fn();
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={handleRangeChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '2026-08-16' }));

    expect(handleRangeChange).not.toHaveBeenCalled();
  });

  it('renders both the visible month and the next month', () => {
    const markedDates = new Map([
      ['2026-08-15', '#A8532F'],
      ['2026-09-01', '#55684A'],
    ]);
    render(
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={vi.fn()}
        selectedRange={{}}
        onRangeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '2026-08-15' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2026-09-01' })).toBeInTheDocument();
  });
});

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 5))).toBe('2026-08-05');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx --workspace=client
```

Expected: FAIL — the module does not exist yet.

- [ ] **Step 3: Implement `MarkedRangeCalendar`**

Create `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.tsx`:

```tsx
import { useMemo } from 'react';
import type { ComponentProps } from 'react';
import type { DayButton } from 'react-day-picker';
import { Calendar } from '../ui/calendar.tsx';

export interface DateRangeValue {
  from?: Date;
  to?: Date;
}

export interface MarkedRangeCalendarProps {
  markedDates: Map<string, string>;
  visibleMonth: Date;
  onVisibleMonthChange: (month: Date) => void;
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date): boolean => toIsoDate(a) === toIsoDate(b);

export const computeNextRange = (current: DateRangeValue, clicked: Date): DateRangeValue => {
  if (!current.from) {
    return { from: clicked, to: clicked };
  }
  const isSingleDaySelection = !current.to || isSameDay(current.from, current.to);
  if (!isSingleDaySelection) {
    return { from: clicked, to: clicked };
  }
  if (clicked.getTime() < current.from.getTime()) {
    return { from: clicked, to: clicked };
  }
  return { from: current.from, to: clicked };
};

const isInRange = (date: Date, range: DateRangeValue): boolean => {
  if (!range.from || !range.to) return false;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime();
};

const isEndpoint = (date: Date, range: DateRangeValue): boolean =>
  Boolean(
    (range.from && isSameDay(date, range.from)) || (range.to && isSameDay(date, range.to)),
  );

export function MarkedRangeCalendar({
  markedDates,
  visibleMonth,
  onVisibleMonthChange,
  selectedRange,
  onRangeChange,
}: MarkedRangeCalendarProps) {
  const isDisabled = (date: Date): boolean => !markedDates.has(toIsoDate(date));

  const DayButtonComponent = useMemo(
    () =>
      function MarkedDayButton({
        className,
        day,
        modifiers,
        children,
        ...props
      }: ComponentProps<typeof DayButton>) {
        const iso = toIsoDate(day.date);
        const ringColor = markedDates.get(iso);
        const disabled = !ringColor;
        const inRange = !disabled && isInRange(day.date, selectedRange);
        const endpoint = !disabled && isEndpoint(day.date, selectedRange);

        return (
          <button
            type="button"
            aria-label={iso}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              onRangeChange(computeNextRange(selectedRange, day.date));
            }}
            className={[
              'flex aspect-square size-full items-center justify-center font-mono text-xs',
              disabled ? 'cursor-default text-ink-soft opacity-30' : 'cursor-pointer text-ink',
              inRange && !endpoint ? 'bg-moss/[0.14]' : '',
              endpoint ? 'bg-moss text-paper' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={ringColor && !endpoint ? { boxShadow: `inset 0 0 0 1.3px ${ringColor}` } : undefined}
            {...props}
          >
            {children ?? day.date.getDate()}
          </button>
        );
      },
    [markedDates, selectedRange, onRangeChange],
  );

  return (
    <Calendar
      numberOfMonths={2}
      month={visibleMonth}
      onMonthChange={onVisibleMonthChange}
      disabled={isDisabled}
      showOutsideDays={false}
      classNames={{
        root: 'w-fit',
        months: 'flex gap-6',
        month: 'flex flex-col gap-2',
        nav: 'hidden',
        month_caption:
          'flex items-center justify-center px-2 py-1 font-mono text-xs uppercase text-ink-soft',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'flex-1 text-center font-mono text-[0.65rem] uppercase text-ink-soft',
        week: 'flex w-full',
        day: 'aspect-square w-9 p-0.5 text-center',
      }}
      components={{ DayButton: DayButtonComponent }}
    />
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/components/MarkedRangeCalendar/MarkedRangeCalendar.test.tsx --workspace=client
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/MarkedRangeCalendar/
git commit -m "feat(client): add MarkedRangeCalendar shared component"
```

---

### Task 9: `JournalCalendarFilter` (journal-specific wrapper)

**Files:**
- Create: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`
- Create: `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx`

**Interfaces:**
- Consumes: `MarkedRangeCalendar`, `DateRangeValue` (Task 8); `useEntriesByRange` (Task 6); `MOOD_RING_COLOR` (Task 7); `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` (Task 1).
- Produces:
  ```ts
  export interface JournalCalendarFilterProps {
    selectedRange: DateRangeValue;
    onRangeChange: (range: DateRangeValue) => void;
  }
  export function JournalCalendarFilter(props: JournalCalendarFilterProps): JSX.Element;
  export function formatRangeLabel(range: DateRangeValue): string;
  ```
  Used by Task 10 (`journal/index.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as journalHooks from '../../api/journalHooks.ts';
import { JournalCalendarFilter, formatRangeLabel } from './JournalCalendarFilter.tsx';

vi.mock('../../api/journalHooks.ts', () => ({
  useEntriesByRange: vi.fn(),
}));

const mockedUseEntriesByRange = vi.mocked(journalHooks.useEntriesByRange);

const toIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fakeEntry = (date: string) => ({
  id: 1,
  userId: 1,
  date,
  title: 'Entry',
  primaryMood: 'happy' as const,
  specificEmotion: null,
  content: '<p>Hi</p>',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
});

describe('JournalCalendarFilter', () => {
  it('marks days that have entries in the visible months', () => {
    const today = new Date();
    const sampleDate = new Date(today.getFullYear(), today.getMonth(), 10);
    mockedUseEntriesByRange.mockReturnValue({
      data: [fakeEntry(toIso(sampleDate))],
    } as ReturnType<typeof journalHooks.useEntriesByRange>);

    render(<JournalCalendarFilter selectedRange={{}} onRangeChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: toIso(sampleDate) })).not.toBeDisabled();
  });

  it('shows a clear-filter link only when a range is active', () => {
    mockedUseEntriesByRange.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof journalHooks.useEntriesByRange
    >);

    const { rerender } = render(
      <JournalCalendarFilter selectedRange={{}} onRangeChange={vi.fn()} />,
    );
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();

    const day = new Date(2026, 7, 1);
    rerender(
      <JournalCalendarFilter selectedRange={{ from: day, to: day }} onRangeChange={vi.fn()} />,
    );
    expect(screen.getByText('Clear filter')).toBeInTheDocument();
  });
});

describe('formatRangeLabel', () => {
  it('formats a single-day range', () => {
    const day = new Date(2026, 7, 15);
    expect(formatRangeLabel({ from: day, to: day })).toBe('Showing entries 2026-08-15');
  });

  it('formats a multi-day range', () => {
    expect(formatRangeLabel({ from: new Date(2026, 7, 1), to: new Date(2026, 7, 5) })).toBe(
      'Showing entries 2026-08-01 – 2026-08-05',
    );
  });

  it('returns an empty string when there is no range', () => {
    expect(formatRangeLabel({})).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx --workspace=client
```

Expected: FAIL — the module does not exist yet.

- [ ] **Step 3: Implement `JournalCalendarFilter`**

Create `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`:

```tsx
import { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select.tsx';
import {
  MarkedRangeCalendar,
  type DateRangeValue,
} from '../../../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';
import { useEntriesByRange } from '../../api/journalHooks.ts';
import { MOOD_RING_COLOR } from '../../moodColors.ts';

export interface JournalCalendarFilterProps {
  selectedRange: DateRangeValue;
  onRangeChange: (range: DateRangeValue) => void;
}

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function formatRangeLabel(range: DateRangeValue): string {
  if (!range.from) return '';
  const { from, to } = range;
  if (!to || toIsoDate(from) === toIsoDate(to)) {
    return `Showing entries ${toIsoDate(from)}`;
  }
  return `Showing entries ${toIsoDate(from)} – ${toIsoDate(to)}`;
}

export function JournalCalendarFilter({
  selectedRange,
  onRangeChange,
}: JournalCalendarFilterProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(new Date()));

  const rangeStart = toIsoDate(startOfMonth(visibleMonth));
  const rangeEnd = toIsoDate(endOfMonth(addMonths(visibleMonth, 1)));
  const { data } = useEntriesByRange({ start: rangeStart, end: rangeEnd });

  const markedDates = useMemo(() => {
    const map = new Map<string, string>();
    (data ?? []).forEach((entry) => {
      map.set(entry.date, MOOD_RING_COLOR[entry.primaryMood]);
    });
    return map;
  }, [data]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  const hasFilter = Boolean(selectedRange.from);

  return (
    <div className="border border-line bg-paper-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            className="border border-ink-blue bg-transparent px-2 py-1 font-mono text-xs text-ink-blue"
          >
            &lsaquo;
          </button>
          <Select
            value={String(visibleMonth.getMonth())}
            onValueChange={(value) =>
              setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(value), 1))
            }
          >
            <SelectTrigger className="rounded-none border-line font-mono text-xs uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(visibleMonth.getFullYear())}
            onValueChange={(value) =>
              setVisibleMonth(new Date(Number(value), visibleMonth.getMonth(), 1))
            }
          >
            <SelectTrigger className="rounded-none border-line font-mono text-xs uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            className="border border-ink-blue bg-transparent px-2 py-1 font-mono text-xs text-ink-blue"
          >
            &rsaquo;
          </button>
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => onRangeChange({})}
            className="font-mono text-xs uppercase text-moss underline"
          >
            Clear filter
          </button>
        )}
      </div>
      <MarkedRangeCalendar
        markedDates={markedDates}
        visibleMonth={visibleMonth}
        onVisibleMonthChange={setVisibleMonth}
        selectedRange={selectedRange}
        onRangeChange={onRangeChange}
      />
      {hasFilter && (
        <p className="mt-3 font-mono text-xs uppercase text-ink-soft">
          {formatRangeLabel(selectedRange)}
          {data ? ` · ${data.length} entries` : ''}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.test.tsx --workspace=client
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/journal/components/JournalCalendarFilter/
git commit -m "feat(client): add JournalCalendarFilter component"
```

---

### Task 10: Wire the calendar strip into `/journal`

**Files:**
- Modify: `client/src/routes/journal/index.tsx`

**Interfaces:**
- Consumes: `JournalCalendarFilter` (Task 9), `DateRangeValue` (Task 8), `useEntries` (existing), `useEntriesByRange` (Task 6).

- [ ] **Step 1: Replace `client/src/routes/journal/index.tsx`**

```tsx
import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useEntries, useEntriesByRange } from '../../modules/journal/api/journalHooks.ts';
import { MOOD_DOT_CLASS, MOOD_LABEL } from '../../modules/journal/moodColors.ts';
import { stripHtml } from '../../modules/journal/textUtils.ts';
import { requireAuth } from '../../auth/requireAuth.ts';
import { JournalCalendarFilter } from '../../modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx';
import type { DateRangeValue } from '../../components/MarkedRangeCalendar/MarkedRangeCalendar.tsx';

export interface JournalIndexSearch {
  page: number;
}

const routeApi = getRouteApi('/journal/');

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function JournalIndexPage() {
  const { page } = routeApi.useSearch();
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>({});
  const hasFilter = Boolean(selectedRange.from);

  const paginated = useEntries(page);
  const filtered = useEntriesByRange({
    start: selectedRange.from ? toIsoDate(selectedRange.from) : '',
    end: selectedRange.to ? toIsoDate(selectedRange.to) : '',
  });

  const entries = hasFilter ? (filtered.data ?? []) : (paginated.data?.entries ?? []);
  const dataLoaded = hasFilter ? filtered.data !== undefined : paginated.data !== undefined;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Journal</h1>
        <Link
          to="/journal/new"
          className="bg-ink-blue px-3 py-2 font-mono text-xs uppercase text-paper"
        >
          New entry
        </Link>
      </div>
      <div className="mb-4">
        <JournalCalendarFilter selectedRange={selectedRange} onRangeChange={setSelectedRange} />
      </div>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="border border-line bg-paper-card p-4">
            <Link to="/journal/$entryId" params={{ entryId: String(entry.id) }} className="block">
              <div className="flex items-center gap-2 font-mono text-xs uppercase text-ink-soft">
                <span
                  className={`h-2 w-2 rounded-full ${MOOD_DOT_CLASS[entry.primaryMood]}`}
                  aria-hidden="true"
                />
                {entry.date} &middot; {MOOD_LABEL[entry.primaryMood]}
              </div>
              <h2 className="font-display text-lg font-medium text-ink">{entry.title}</h2>
              <p className="font-body text-ink-soft">{stripHtml(entry.content).slice(0, 140)}</p>
            </Link>
          </li>
        ))}
      </ul>
      {dataLoaded && entries.length === 0 && <p className="text-ink-soft">No entries yet.</p>}
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

- [ ] **Step 2: Run the client test suite**

```bash
npm test --workspace=client
```

Expected: PASS, no regressions in any existing `journal` route or component test.

- [ ] **Step 3: Manual smoke check**

```bash
npm run dev --workspace=backend &
npm run dev --workspace=client
```

In a browser, log in and visit `/journal`. Confirm: the calendar strip renders above the list; days with entries show a mood-colored ring and are clickable; days without entries are muted and inert; clicking an entry-day filters the list to that date and shows "Clear filter"; a second, later click extends the range; "Clear filter" restores the paginated list; changing the month/year selects re-marks the grid without clearing an active filter. Stop both dev servers when done.

- [ ] **Step 4: Full workspace verification**

```bash
npm run build
npm run lint
npm test
```

Expected: all succeed (backend Jest suite + client Vitest suite + shared-types/client/backend lint + full build).

- [ ] **Step 5: Commit**

```bash
git add client/src/routes/journal/index.tsx
git commit -m "feat(client): wire calendar strip and range filtering into /journal"
```

---

## Self-Review

**Spec coverage:**
- UI/layout (panel styling, header row, two-month grid, day-of-week labels) → Tasks 1, 8, 9.
- Day cell states (empty/has-entry/in-range/endpoint) → Task 8.
- Interaction model (click/extend/reset/clear, month/year change doesn't clear filter) → Tasks 8 (`computeNextRange`), 9 (clear-filter button, independent `onVisibleMonthChange`).
- Component architecture (shared `MarkedRangeCalendar` vs. journal-specific `JournalCalendarFilter`) → Tasks 8, 9.
- Data flow (single by-range endpoint serving both grid-marking and list-filtering, client hook, shared types) → Tasks 2, 3, 4, 5, 6, 9, 10.
- Error handling (400s, empty-200, implicit ownership scoping) → Tasks 4, 5.
- Testing requirements (validation/controller/routes/db on backend; component tests on client) → Tasks 3, 4, 5, 8, 9.
- Out-of-scope boundary (only `/journal/index.tsx` touched, no other journal routes) → Task 10 confirms.

**Placeholder scan:** every step has literal code, no "TBD"/"add error handling"/"similar to Task N" placeholders.

**Type consistency:** `DateRangeValue`, `MarkedRangeCalendarProps`, `computeNextRange`, `toIsoDate` (Task 8) match their usage in Task 9 and Task 10. `EntryRangeQuery` (Task 2) documents the query shape; the endpoint itself is typed ad hoc as `{ start: string; end: string }` in the controller and hook, matching. `useEntriesByRange`'s query key (`journalKeys.byRange`) and hook signature (Task 6) match all three call sites (Task 9, Task 10). `MOOD_RING_COLOR` (Task 7) keys match `PrimaryMood` and are consumed identically in Task 9.
