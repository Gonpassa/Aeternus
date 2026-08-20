# Chakra Encapsulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.
>
> This document is the Phase 1 deliverable named in `docs/superpowers/specs/2026-08-19-chakra-encapsulation-design.md` ("Phase 1 — Inventory and variant design"). It is the variant shortlist, file-by-file task breakdown, and effort estimate that spec requires be reviewed before Phase 2 (building the new primitives) starts. No call sites or `theme.ts` recipes are touched by this document itself — it is the plan, not the implementation.

**Goal:** Make `client/src/components/ui/` the sole boundary that imports `@chakra-ui/react`, per the spec's Goals section, without changing any visual output.

**Method:** Every distinct Chakra style-prop shape across the 14 non-`ui/` files that import `@chakra-ui/react` was cataloged below. A shape recurring across **2 or more** of the 14 files is promoted to a shared `components/ui/` component or theme recipe variant (spec's Phase 1 rule). A shape seen in only one file stays local, converted to plain composition of the new shared primitives plus the `className`/CSS-Module escape hatch (spec's Architecture section) where no existing primitive covers it.

---

## Part A: Variant shortlist (Phase 2 scope)

### A1. New `components/ui/` atoms

| Component | Shape it replaces | Files it appears in (count) |
|---|---|---|
| `Stack` | `chakra.div`/`chakra.form`/`Flex` used purely for `display=flex` + `flexDirection`/`gap`/`align`/`justify` layout, no other styling | Nav (button-link row), EntryForm (form wrapper, action-button row), login/register (form wrapper), journal/index (header row), journal/$entryId (action-button row) — **7 files** |
| `PageContainer` | `Box maxW={"sm"\|"2xl"} p="4"` page-width wrapper | login, register, journal/index, journal/new, journal/$entryId, journal/$entryId_.edit — **6 files** |
| `FieldLabel` | `chakra.label display="flex" flexDirection="column" gap="1"` label+field stack | login (×2), register (×4), EntryForm (entry-date label) — **3 files** |
| `Card` | `Box borderWidth="1px" borderColor="line" bg="paperCard" p="…"` bordered panel | journal/index (entry `li`), JournalCalendarFilter (container), RichTextEditor (editor wrapper), EntryForm (collision-notice panel) — **4 files** |
| `Dot` | `Box boxSize="2"/"2.5" borderRadius="full" bg={color} aria-hidden` small color indicator | journal/index, EntryView, MoodPicker (swatch inner dot) — **3 files** |
| `Prose` | `Box className="entry-content" …` wrapper around sanitized/editor HTML, named explicitly in spec Architecture | EntryView, RichTextEditor — **2 files** |
| `Text` (wrapper, mirrors existing `Button.tsx` pattern) | direct `import { Text } from '@chakra-ui/react'` | 10 of the 14 files | 
| `Heading` (wrapper, same pattern) | direct `import { Heading } from '@chakra-ui/react'` | login, register, journal/index, journal/new, journal/$entryId_.edit, EntryView — **6 files** |
| `Input` (wrapper, same pattern) | direct `import { Input } from '@chakra-ui/react'` | login, register, EntryForm, MoodPicker — **4 files** |

`Stack`/`PageContainer`/`FieldLabel` are the three examples the spec's Architecture section names explicitly (line 31); the inventory above confirms all three clear the 2-file threshold independently. `Card` and `Dot` are additions the spec didn't name but the inventory surfaces as recurring ≥3 times each. `Prose` is spec-named (line 33). `Text`/`Heading`/`Input` aren't new visual patterns so much as the mandatory wrapper shells every other atom already has (`Button.tsx`) — without them, call sites can't stop importing `Text`/`Heading`/`Input` from `@chakra-ui/react` directly.

A **`railed`** variant on `Card` (or a boolean `railed` prop) covers the dashed-left-border content wrapper (`borderLeftWidth="2px" borderLeftStyle="dashed" borderColor="line" pl="10"`) shared by `EntryForm`'s `<form>` and `EntryView`'s `<article>` — **2 files**, promoted per the same rule.

### A2. New `theme.ts` recipe variants (text/heading-as-style, not full components)

| Variant | Shape | Files (count) |
|---|---|---|
| `Text` variant `eyebrow` | `fontFamily="mono" fontSize="xs" textTransform="uppercase"` (+ `letterSpacing="wide"` in most) | Nav (×2), EntryForm (date label, collision notice), EntryView (date, mood row), MoodPicker (legend), JournalCalendarFilter (filter label), journal/index (mood row) — **6 files** |
| `Text` variant `muted` | `color="inkSoft"` informational copy | journal/$entryId ("Loading..."), journal/$entryId_.edit ("Loading..."), journal/index ("No entries yet."), login ("Don't have an account?") — **4 files** |
| `Text` variant `error` | `color="rust"` inline form error | EntryForm — **1 file today**, but promoted anyway since `error` state is a generic `Text` concern any form will need; cheap to add alongside the other variants being built in the same recipe pass |
| `Text` variant `formError` | `color="red.600"` inline form error | login, register — **2 files** |
| `Heading` variant `page` | `fontFamily="heading" fontSize="3xl" fontWeight="semibold" color="ink"` | journal/index, journal/new, journal/$entryId_.edit, EntryView — **4 files** |

**Open item carried to Phase 2, not resolved here:** `error` (`rust`, `#A8532F`) and `formError` (`red.600`, Chakra's default `#E53E3E`) are visually different colors for the same semantic role (inline form validation error) — an existing inconsistency predating this spec, not something this migration introduces. Per the spec's pixel-identical constraint (Goals), Phase 2 must keep both variants distinct rather than unifying them; unifying the color is a design decision out of scope for this structural move and should go through `docs/design/design-system.md` separately if wanted.

### A3. Stays local (single-file shapes, `className`/CSS-Module escape hatch)

These appear in exactly one of the 14 files and don't clear the 2-file promotion threshold. Each converts to composition of the Part A1/A2 primitives plus a colocated `<CallSite>.module.css` for the residual one-off bit, per the spec's escape-hatch rule:

- **Nav.tsx** — `RailLink`'s active/inactive box-shadow + background treatment (nav-specific interactive state, no other file has this shape).
- **Nav.tsx** — the "Journal & commonplace book" subtitle's exact sizing (`fontSize="11px"` distinct from the `eyebrow` variant's `xs`).
- **EntryForm.tsx** — the title `<Input>`'s borderless-underline-large-heading style. Lives as an `Input` variant (`title`) rather than a `className` override even though single-file, since `Input` is already a shared atom being built in A1 and a named variant documents intent better than an escape hatch for a field this central to the form. Flagging for reviewer sign-off since it's a judgment call against the "2+ files" default.
- **EntryForm.tsx** — the `PopoverContent` sizing (`w="auto" p="2"`) for the date picker. `PopoverContent` is already inside the boundary (`components/ui/Popover/`); this can stay as a prop passed at the call site since `Popover*` components legitimately accept full Chakra props themselves (they don't need the `className`-only restriction — that restriction is for *non*-`ui/` call sites, not for how a `ui/` component's own consumers configure it).
- **MoodPicker.tsx** — the primary-mood swatch button and specific-emotion pill button (`chakra.button` with custom sizing/shape). Neither maps cleanly onto the `Button` recipe's existing variants (circular swatch with an inset dot; pill toggle). Becomes two local sibling files, `MoodPicker/MoodSwatchButton.tsx` and `MoodPicker/EmotionPillButton.tsx` (per the client-frontend-architecture skill's "extracted sub-pieces stay flat sibling files" rule), built from a plain `<button>` plus a colocated `MoodPicker.module.css` for the shape-specific bits the `Button` recipe doesn't cover.
- **JournalCalendarFilter.tsx** — `SelectTrigger`/`SelectContent`'s `borderRadius="0"`/`boxShadow="none"` overrides. Single call site; stays as props passed directly (same reasoning as `PopoverContent` above — `Select*` are already `ui/` components).

---

## Part B: File-by-file task breakdown (Phase 3 scope, sequencing per spec)

Each row becomes one commit in Phase 3, in the spec's stated leaf-first order. "Consumes" lists the Part A primitives the converted file will import; anything not listed there is either already `ui/`-only (e.g. `Popover`, `Select`, `Calendar`, `ConfirmDialog`, `Tooltip`, `VisuallyHidden`, existing `Button`) or a local escape-hatch piece from A3.

1. `MoodPicker.tsx` — consumes `Text` (`eyebrow`), `Input`; adds local `MoodSwatchButton`, `EmotionPillButton`, `MoodPicker.module.css`.
2. `RichTextEditor.tsx` — consumes `Card`, `Prose`.
3. `EntryView.tsx` — consumes `PageContainer`(-shaped `Card railed`), `Text` (`eyebrow`), `Heading` (`page`), `Dot`, `Prose`.
4. `JournalCalendarFilter.tsx` — consumes `Card`, `Stack`, `Text` (`eyebrow`); `Select*` props stay inline (A3).
5. `EntryForm.tsx` — consumes `Stack`, `FieldLabel`, `Card`, `Text` (`eyebrow`, `error`), `Input` (`default`, `title`); `PopoverContent` props stay inline (A3).
6. `shell/Nav.tsx` — consumes `Stack`, `Text` (`eyebrow`); `RailLink` styling stays local (A3) via `Nav.module.css`.
7. `shell/Layout.tsx` — consumes `Stack` (replaces the top-level `Flex`) and `Box`-as-`main` becomes plain `<main>` inside it, or a thin `Stack`-as `<main>` if semantics need preserving — confirm during implementation which reads better; both are style-prop-free either way.
8. `routes/index.tsx` — trivial; consumes `PageContainer`.
9. `routes/login.tsx` — consumes `PageContainer`, `Stack`, `FieldLabel`, `Heading`, `Input`, `Text` (`formError`).
10. `routes/register.tsx` — same as login.
11. `routes/journal/index.tsx` — consumes `PageContainer`, `Stack`, `Heading` (`page`), `Card`, `Dot`, `Text` (`eyebrow`, `muted`).
12. `routes/journal/new.tsx` — consumes `PageContainer`, `Heading` (`page`).
13. `routes/journal/$entryId.tsx` — consumes `Stack`, `Text` (`muted`).
14. `routes/journal/$entryId_.edit.tsx` — consumes `PageContainer`, `Heading` (`page`), `Text` (`muted`).

Each commit: replace direct Chakra imports/style props with the atoms above, run that file's existing Vitest suite (if any) before/after as a regression check, `npm run lint --workspace client`, commit — per the spec's Testing strategy and Phase 3 description.

---

## Effort estimate

- **Phase 2** (build ~9 new `components/ui/` files + ~5 theme recipe variants, no call sites touched, existing tests keep passing unmodified): **1 session.**
- **Phase 3** (14 file conversions across 6 commits per the spec's grouping, each with a regression run): **2-3 sessions** — `EntryForm.tsx` (item 5) and `Nav.tsx` (item 6) are the two files with genuine layout complexity (popover-driven date field, active-link state); the rest are mechanical substitution.
- **Phase 4** (`no-restricted-imports` ESLint rule + full verification + manual click-through against `demo.html`): **under 1 session.**

Total: roughly 4-5 sessions across the three remaining phases, spread over separately reviewable PRs as the spec's Migration plan specifies.

## Risks / open questions carried from the spec

- The `error`/`formError` `Text` variant split (A2) is a deliberate decision to preserve an existing color inconsistency rather than fix it silently — flagging again here so Phase 2 doesn't "clean it up" by accident.
- `EntryForm`'s title `Input` variant (A3) is the one place this plan promotes a single-file shape to a named variant instead of the `className` escape hatch, because `Input` is already a shared atom under construction in the same phase. If a reviewer disagrees, it's a one-line change to route it through `className`/CSS Module instead.
- `MoodSwatchButton`/`EmotionPillButton` (A3) are the only genuinely new local sub-components this plan introduces beyond what the spec's Migration plan file list implies — flagging since they add two files not explicitly named in the spec, though they live inside `MoodPicker/` per the existing folder-per-component convention and don't cross the `ui/` boundary.
