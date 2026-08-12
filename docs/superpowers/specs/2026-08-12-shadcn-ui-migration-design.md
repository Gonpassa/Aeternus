# shadcn/ui Migration (Buttons, New-Entry Date Picker) — Design

## Status

Brainstorm approved.

## Problem

The client has three shadcn/ui primitives scaffolded (`components/ui/button.tsx`, `select.tsx`, `calendar.tsx`), but adoption is inconsistent.
`Select` is already used correctly (`JournalCalendarFilter`'s month/year pickers).
`Calendar` is used correctly for filtering (`JournalCalendarFilter` via `MarkedRangeCalendar`), but the new-entry date field (`EntryForm.tsx`) never got wired to it — it's still a plain native `<input type="date">`, which is why the calendar the user sees when creating an entry doesn't match the calendar used elsewhere in the app.
`Button` has zero app-level call sites at all — every button across the client is a native `<button>`, and the primitive itself is effectively unstyled because the CSS variables it depends on (`--color-primary`, `--color-destructive`, etc.) were never defined; only the raw palette (`--color-ink-blue`, `--color-moss`, `--color-rust`) exists in `styles.css`.

This spec covers bringing both gaps into line: wiring `Calendar` into the new-entry flow, and migrating native buttons to `Button`, in one pass since they share the same root cause (missing theme tokens) and touch overlapping files.

## Prior art

- `JournalCalendarFilter.tsx` / `MarkedRangeCalendar.tsx`: existing, working shadcn `Calendar` + `Select` usage with design-system-matched restyling via `classNames`/`className` overrides. This is the reference pattern for how shadcn primitives get adapted to this app's look rather than left in shadcn's default theme.
- `docs/design/design-system.md`: defines the button spec (primary/secondary/ghost variants, mono uppercase labels, 4px radius, no shadow) and input/select spec (flat paper-card fill, line border, ink-blue/moss focus) that this migration must match.

## Theme tokens

`client/src/styles.css`'s `@theme` block gets new semantic tokens alongside the existing raw palette, so shadcn's standard variant classes (`bg-primary`, `bg-destructive`, `bg-accent`, `ring-ring`, etc.) resolve instead of silently doing nothing:

```css
--color-primary: var(--color-ink-blue);
--color-primary-foreground: var(--color-paper);
--color-secondary: transparent;
--color-secondary-foreground: var(--color-ink-blue);
--color-destructive: var(--color-rust);
--color-accent: var(--color-moss);
--color-accent-foreground: var(--color-paper);
--color-ring: var(--color-moss);
--color-background: var(--color-paper-card);
--color-border: var(--color-line);
```

This is additive only — the existing raw palette tokens (`--color-ink-blue`, `--color-moss`, `--color-rust`, `--color-paper`, `--color-paper-card`, `--color-line`) stay as-is, and `Select`'s existing per-instance className overrides in `JournalCalendarFilter.tsx` are untouched (they already work and don't depend on these new tokens).

## Button primitive styling

`components/ui/button.tsx`'s `buttonVariants` base class string is adjusted to match `design-system.md`'s button spec: `font-mono text-xs uppercase tracking-[0.04em]`, `rounded-[4px]`, transitions limited to `background-color, border-color` (150ms), no shadow. Variant→color mapping (via the new tokens): `default` → ink-blue fill / paper text (primary), `outline`/`secondary` → transparent fill / ink-blue border+text (secondary), `ghost`/`link` → moss text (ghost/tag), `destructive` → rust (delete actions). Existing `size` variants (`default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`) are kept as-is.

## New-entry date field

Add `components/ui/popover.tsx` — shadcn's standard `Popover` wrapper over Radix's `Popover` primitive (already installed via the `radix-ui` package, just not yet scaffolded as a `ui/` component). No new dependency needed.

In `EntryForm.tsx`, replace the native `<input type="date">` (lines 82-90) with:
- A `Button variant="outline"` trigger displaying the currently selected date in a readable format (e.g. "Aug 12, 2026"), taking the place of the current input's visual slot.
- A `Popover` anchored to that trigger, containing `Calendar mode="single"` bound to the existing `date` state (`selected={parsedDate}`, `onSelect` converts back to the `YYYY-MM-DD` string form `date` already uses elsewhere, then closes the popover).
- The trigger keeps `disabled={Boolean(initialEntry)}` — editing an existing entry still locks the date, matching current behavior.

No other `EntryForm` state or submit logic changes — `date` remains a plain ISO string, so `handleSubmit`, the collision-lookup `useEntryByDate` call, and `CreateEntryRequest` are unaffected.

## Button migration, file by file

| File | Element(s) | Change |
|---|---|---|
| `EntryForm.tsx` | Submit button | Native `<button>` → `Button` (default/primary) |
| `JournalCalendarFilter.tsx` | Prev/next month arrows | Native `<button>` → `Button variant="outline" size="icon-sm"` |
| `JournalCalendarFilter.tsx` | "Clear filter" | Native `<button>` → `Button variant="link"`, moss text |
| `routes/journal/$entryId.tsx` | "Edit" (`Link`, not a button) | Stays a `Link`; apply `buttonVariants({ variant: 'outline' })` via `cn()` for matching visuals without turning routing into a button click |
| `routes/journal/$entryId.tsx` | "Delete" | Native `<button>` → `Button variant="outline"` with destructive styling (rust border/text) |
| `routes/journal/$entryId.tsx` | "Confirm delete" | Native `<button>` → `Button variant="destructive"` (rust fill) |
| `shell/Nav.tsx` | "Log out" | Native `<button>` → `Button variant="link"`, padding/height stripped via `className` so it stays inline with sibling `<Link>` nav items |

## Explicitly excluded

- **`MoodPicker.tsx`'s mood/emotion buttons**: these are `role="radio"` toggle-chips within a `radiogroup`, with selected/unselected styling driven by ARIA state rather than a button "variant." Forcing them into `Button`'s variant system would fight the toggle-group pattern for no visual or behavioral gain. Left as native buttons.
- **`MarkedRangeCalendar.tsx`'s `DayButton` override**: react-day-picker's `DayButton` component contract requires a raw `<button>` with a forwarded ref (`ComponentProps<typeof DayButton>`); this is already an intentional, necessary override of the primitive's internal rendering, not a stray native button that was missed. Left as-is.
- **`MarkedRangeCalendar.tsx`'s own Calendar nav**: already hidden (`nav: 'hidden'`) in favor of the `Select`-based month/year controls in `JournalCalendarFilter`; unaffected by this migration.

## Testing

- Existing Vitest component tests for `EntryForm` need updating for the new Popover/Calendar interaction: open the popover, click a day, assert the `date` state/submitted value updates correctly, and assert the trigger is disabled in edit mode.
- Manual click-through in the dev server: new-entry popover positioning and open/close behavior, edit-mode disabled state, delete/confirm-delete flow on an entry, nav logout alignment, journal filter arrows/clear-filter — visual parity checked against `docs/design/demo.html` and `design-system.md`'s button spec.
