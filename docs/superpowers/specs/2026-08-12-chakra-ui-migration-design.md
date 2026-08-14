# Chakra UI Migration Design

## Context

Aeternus.3's client began a shadcn/ui migration (see `docs/superpowers/specs/2026-08-12-shadcn-ui-migration-plan.md` and its 8 completed commits: theme tokens, `Button` restyle, `Popover` scaffold, `EntryForm`/`JournalCalendarFilter`/`$entryId`/`Nav` call-site migrations).
That work produced four Radix-backed primitives under `client/src/components/ui/` (`button.tsx`, `calendar.tsx`, `popover.tsx`, `select.tsx`), each hand-styled against `docs/design/design-system.md` via Tailwind utility classes and `cva` variant strings.

The user found this too unopinionated: every component's visual spec (radius, transitions, uppercase mono labels, variant colors) has to be manually re-derived and re-encoded per component in Tailwind/`cva`, rather than set once and inherited.
This design replaces that approach with Chakra UI v3, a batteries-included component library (behavior + styling) with a deep theming API, while preserving the bespoke design-system.md visual language (Fraunces/Newsreader/IBM Plex Mono type stack, paper/ink/ink-blue/moss/rust palette, index-card aesthetic).

## Goals

- Replace Tailwind CSS v4 as the client's styling system with Chakra UI v3, end to end — not a partial/coexisting adoption.
- Encode the design-system.md visual language once, in a Chakra theme, so individual components consume it via variants/semantic tokens instead of repeating utility classes or `cva` strings.
- Preserve existing behavior and test coverage across all 19 files that currently use Tailwind classes.
- Keep `react-day-picker` as the calendar engine (not Chakra's native `DatePicker`/`Calendar`), reskinned via Chakra style props, to avoid rebuilding `MarkedRangeCalendar`'s custom mood-ring day-cell rendering on an unfamiliar API.

## Non-goals

- Redesigning the visual language itself — `docs/design/design-system.md` and `docs/design/demo.html` remain the source of truth for what things should look like; this migration only changes how that look is implemented.
- Migrating calendar behavior onto Chakra's native `DatePicker`/Ark UI primitives.
- Any backend or `shared-types` changes.
- Adding new features or UI beyond what already exists (no scope creep during the swap).

## Architecture

Chakra UI v3 (`@chakra-ui/react`) becomes the sole styling system.
`@tailwindcss/vite` and the `@theme` block in `client/src/styles.css` are removed once the migration completes; `<ChakraProvider>` wraps the app in `client/src/main.tsx`, alongside the existing `QueryClientProvider`/`RouterProvider`.

A new `client/src/theme.ts` defines a custom Chakra theme (via `createSystem` extending `defaultConfig`) carrying every token currently in `styles.css`'s `@theme` block: raw colors (`paper`, `paperCard`, `ink`, `inkSoft`, `inkBlue`, `moss`, `rust`, `line`, `moodAnxious`, `moodAngry`), semantic tokens (`primary`, `primary.foreground`, `secondary`, `destructive`, `accent`, `accent.foreground`, `ring`, `background`, `border`), fonts (`heading` → Fraunces, `body` → Newsreader, `mono` → IBM Plex Mono), and a shared `radii.md = 4px` token.

The four existing `components/ui/*` shadcn primitives are deleted and replaced:
- `button.tsx` → a thin wrapper re-exporting Chakra's `Button`, with variants (`default`/`destructive`/`outline`/`secondary`/`ghost`/`link`) and sizes defined as a Chakra recipe in `theme.ts` rather than a `cva` call — this recipe encodes the button spec (`font-mono text-xs uppercase tracking-[0.04em]`, `rounded-[4px]` via the shared radii token, background/border-only 150ms transitions, no shadow) once, for every call site to inherit.
- `select.tsx`, `popover.tsx` → thin wrappers around Chakra's native `Select`/`Popover` components.
- `calendar.tsx` → keeps `react-day-picker` as its engine; its `classNames`/`components` overrides are rewritten to apply Chakra style props (or Chakra's `css` prop) instead of Tailwind utility classes, preserving the existing external API (`mode="single"`, `selected`, `onSelect`).

`cva`, `class-variance-authority`, `tailwind-merge`, `clsx`, and `client/src/lib/utils.ts`'s `cn` helper are removed once no file references them.

## Migration plan (phased, incremental)

**Phase 1 — Foundation.** Install `@chakra-ui/react` and peer dependencies. Write `client/src/theme.ts` per the Architecture section. Wrap `main.tsx` with `<ChakraProvider value={system}>`. At the end of this phase the app builds and runs with Chakra and Tailwind both present but not yet interacting — no existing file has been converted.

**Phase 2 — File-by-file conversion**, one commit per file/group, in dependency order (leaf primitives first, so later files can immediately consume the finished Chakra wrappers):

1. `components/ui/button.tsx`
2. `components/ui/select.tsx`, `components/ui/popover.tsx`
3. `components/ui/calendar.tsx` (reskin `react-day-picker`, keep its API)
4. `components/MarkedRangeCalendar/MarkedRangeCalendar.tsx` (its mood-ring `DayButton`/nav overrides were explicitly excluded from the shadcn migration; they're in scope now since they use Tailwind classes directly)
5. `modules/journal/components/MoodPicker/MoodPicker.tsx`, `EntryForm/EntryForm.tsx`, `JournalCalendarFilter/JournalCalendarFilter.tsx`, `EntryView/EntryView.tsx`, `RichTextEditor/RichTextEditor.tsx`
6. `routes/index.tsx`, `routes/login.tsx`, `routes/register.tsx`, `routes/journal/index.tsx`, `routes/journal/new.tsx`, `routes/journal/$entryId.tsx`, `routes/journal/$entryId.edit.tsx`
7. `shell/Nav.tsx`, `shell/Layout.tsx`

Each file's commit: convert Tailwind classes to Chakra style props/theme tokens, run its existing test file (if any) as a before/after regression check, `npm run lint --workspace client`, commit.

**Phase 3 — Cutover.** Once `grep -rl "className=" client/src` (client-side) returns empty, remove Tailwind: the `@tailwindcss/vite` plugin from `vite.config.ts`, the `tailwindcss`/`@tailwindcss/vite` npm dependencies, the `@theme` block in `styles.css`, and `cva`/`tailwind-merge`/`clsx`/`lib/utils.ts`. Run the full verification suite (`npm run lint && npx tsc -b && npm test && npm run build`, from `client/`) plus a manual click-through of every route, mirroring the shadcn plan's Task 8.

## Testing strategy

Existing Vitest + Testing Library suites (`EntryForm.test.tsx`, `JournalCalendarFilter.test.tsx`, `MarkedRangeCalendar.test.tsx`) are the regression net for their respective files: run as a baseline before each file's conversion, then re-run after, fixing any query selectors that assumed Radix/Tailwind-specific DOM structure (e.g., `react-day-picker`'s day-cell attributes may differ once its `classNames` overrides change, though its underlying DOM/attribute structure is unaffected by a styling-only reskin).

No new tests are added purely for the styling swap — this is a like-for-like behavioral migration, not new functionality.
Phase 3 ends with the full-suite run described above and a manual click-through of every route against `docs/design/demo.html`/`design-system.md`, fixing any visual regression before considering the migration complete.

## Risks / open questions

- Chakra v3's recipe/theming API is less mature than Tailwind+`cva` for pixel-level one-off tweaks; some call sites that today use an inline `className` override (e.g. `Nav.tsx`'s "Log out" `text-ink-blue` override noted in the shadcn plan) will need an equivalent Chakra mechanism (style prop override or a recipe variant) — expect a small amount of per-file judgment during Phase 2, not a mechanical find-replace.
- `react-day-picker`'s Tailwind-based `classNames` API needs a Chakra-styled equivalent; if Chakra's `css`/style-prop system can't cleanly express every class currently applied (e.g. compound `data-[state=...]` selectors), a fallback is a small scoped CSS module for `calendar.tsx` only — to be resolved during that file's Phase 2 commit, not decided upfront.
- `docs/design/design-system.md` and `demo.html` are unchanged by this migration; they remain the visual source of truth throughout.
