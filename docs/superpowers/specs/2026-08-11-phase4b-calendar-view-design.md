# Phase 4b: Calendar View — Design

## Status

Brainstorm approved.

## Problem

Phase 4a shipped journal entry CRUD, mood tagging, and a paginated reverse-chronological list at `/journal`.
Phase 4's README scope also calls for a calendar view and insights/overview; the 4a spec split those out as **4b** (calendar) and a separate, already-written `journal-insights` design (AI-assisted, scheduled after 4b).
This spec covers **4b only**: a calendar-based way to browse and filter journal entries by date.
Insights/overview and the AI-assisted work are out of scope here.

## Prior art

- `harmonee/` (live production app): server-rendered single-month grid (`views/calendar.html`, `controllers/calendar.js`), one month at a time, day cells get a mood-colored `filled` class, clicking a day opens a modal. Functional but visually generic and single-month only — not a direct model for this design, though it confirms the "mark days with mood color" pattern is validated prior art.
- `Nee.2/`: no calendar view was built.

## UI & layout

The calendar is not a separate page — it's a strip that lives above the existing entry list on `/journal`, since it's a different way of looking at the same data ("browse my entries"), not a distinct feature.

**Panel styling:** flat `--paper-card` fill, 1px `--line` border, 4px radius — the design system's quiet/rectilinear component treatment. It is deliberately *not* styled as an index card; that flourish (die-cut tab, punch hole) is reserved for the research catalog per `design-system.md`.

**Header row:** `‹`/`›` arrow buttons (secondary-button style: transparent fill, 1.5px `--ink-blue` border) flank a Month select and a Year select (shadcn `Select`, restyled to the design system's flat/mono look — not shadcn's default theme). The selects target the left-hand month directly; the right-hand month is always left+1 and has no independent control. A "Clear filter" link (mono, `--moss`, underline) appears in the header when a date filter is active.

**Grid:** always shows **two months side by side** (not a toggle — confirmed during brainstorming: the user wants to see more than one month at once by default, and a toggle adds state/complexity for no real benefit). Each month is its own 7-column day grid (shadcn `Calendar`/react-day-picker, `numberOfMonths={2}`), squares sized smaller than a single-month view to fit both side by side. Day-of-week header row uses single-letter mono labels (S M T W T F S).

**Day cell states:**
- Empty (no entry): rendered inert — no ring, `opacity: .3`-ish muted, not hoverable, not clickable, not a react-day-picker `disabled` target for range anchoring.
- Has an entry: a 1.3px ring around the day number, colored by that entry's primary mood (using the existing 5-color mood-mark palette from `design-system.md`/`moodColors.ts`). This was chosen over a dot-under-the-number treatment (mockup "A") for being more legible at the smaller two-month cell size, at the cost of introducing a second mood-marking shape (list view keeps its dot).
- In an active selected range: soft moss fill (`rgba(85,104,74,0.14)`) behind the day number.
- Range endpoint: solid `--moss` fill, paper-colored text.

## Interaction model

- Only days with an entry are clickable. Empty days are fully inert — no new-entry shortcut from the calendar (that stays on the existing `/journal/new` flow).
- **Single click** on an entry-day immediately filters the list below to that single date (a one-day "range" — `from === to`).
- **Second click** on a later entry-day extends the range from the first click's date to the second.
- **Click before the current start** resets the range to start at the newly clicked date (standard react-day-picker range semantics), discarding the previous end.
- **Clear filter** link resets the range to empty and restores the normal paginated list view.
- Changing month/year via the selects or arrows re-marks the visible grids for whatever months are now shown; it does not by itself change or clear an active filter.
- The filter strip above the list reads `Showing entries <start> – <end>, <year> · N entries` (or just the single date when `from === to`), matching the mono/uppercase meta-text style used elsewhere.

## Component architecture

**Shared, module-agnostic component:** `client/src/components/MarkedRangeCalendar/MarkedRangeCalendar.tsx`.
Built during this brainstorm as a reusable primitive (not journal-specific) because later phases — the standalone Calendar module (README phase 6) — will likely need the same "mark some dates, select a range, only marked dates are clickable" behavior. It knows nothing about journal entries or moods.

Props (illustrative, finalized during planning):
```ts
type MarkedRangeCalendarProps = {
  markedDates: Map<string, string>; // ISO date -> ring color
  visibleMonth: Date;               // controls the left-hand month; right is +1
  onVisibleMonthChange: (month: Date) => void;
  selectedRange: { from?: Date; to?: Date };
  onRangeChange: (range: { from?: Date; to?: Date }) => void;
};
```
Wraps shadcn's `Calendar` (react-day-picker) with `numberOfMonths={2}`, `disabled` set to everything not in `markedDates`, and custom day-cell rendering for the mood-ring style. shadcn's `calendar` and `select` primitives are added via `npx shadcn add calendar select` and then restyled per `design-system.md` rather than left in shadcn's default theme.

**Journal-specific wrapper:** `client/src/modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`.
Fetches entries for the two currently visible months, builds the `markedDates` map (date → mood-mark color via `moodColors.ts`), owns the `visibleMonth`/`selectedRange` state, and calls back up to `journal/index.tsx` with the active range so the route can swap the list's data source.

## Data flow

New backend endpoint: `GET /api/journal/entries/by-range?start=YYYY-MM-DD&end=YYYY-MM-DD`, scoped to `req.user.id`, behind `ensureAuth`, in the existing `backend/src/modules/journal/` module (`routes.ts`/`controller.ts`). Returns entries whose `date` falls within `[start, end]` inclusive, sorted ascending by date. No pagination — the ranges this endpoint is called with (a visible two-month span, or a user-selected filter range) are small by construction.

This single endpoint serves two call sites:
1. **Marking the grid:** `JournalCalendarFilter` calls it with `start`/`end` covering the two currently visible months whenever `visibleMonth` changes, to populate `markedDates`.
2. **Filtering the list:** `journal/index.tsx` calls it with the active `selectedRange` instead of the normal paginated `useEntries(page)` call, whenever a range is selected. Clearing the filter switches back to `useEntries`.

**Client hook:** `useEntriesByRange({ start, end })` added to `client/src/modules/journal/api/journalHooks.ts`, following the existing hooks' shape (TanStack Query, same query-key conventions as `useEntries`/`useEntry`).

**Shared types:** `packages/shared-types/src/index.ts` gains an `EntryRangeQuery`/reuses the existing `Entry` type for the response array — no new envelope type needed since this isn't paginated.

## Error handling

- 400 if `start`/`end` are missing, malformed, or `start > end`.
- Empty array (200), not 404, when no entries fall in range — an empty result is a valid, expected state (e.g., a two-month span with no journaling).
- Ownership scoping is implicit via `req.user.id` in the query itself (no separate per-entry ownership check needed, unlike the single-entry routes).

## Testing

Following the `journal/` module's existing split (established in 4a):
- `validation.test.ts` — invalid/missing `start`/`end`, `start > end`.
- `controller.test.ts` — mocked DB layer: correct range filtering, empty-array case, user-scoping.
- `routes.test.ts` — Supertest integration test against the real test DB: entries inside/outside the range, cross-user isolation.
- Client: `MarkedRangeCalendar` tests for the click-to-select / extend-range / reset-before-start interaction logic, and disabled (unmarked) days being non-interactive. `JournalCalendarFilter` tests for marking the correct days from fetched entries and for the filter-strip text/count. Standard RTL coverage otherwise.

## Explicitly out of scope (this spec)

- Insights/overview (mood trends, streaks, etc.) — separate, not yet designed.
- AI-assisted features — → the already-written `journal-insights` design, scheduled after 4b.
- Migrating historical entries from the live Harmonee MongoDB database — separate future task.
- A 1-month/2-month toggle — decided against; always two months.
- Any change to `/journal/new`, `/journal/:entryId`, or `/journal/:entryId.edit` — this spec only touches `/journal/index.tsx` and adds the calendar strip + filtering.
