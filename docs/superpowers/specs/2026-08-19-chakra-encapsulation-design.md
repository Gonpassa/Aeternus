# Chakra Encapsulation Design

## Context

The Chakra UI v3 migration (`docs/superpowers/specs/2026-08-12-chakra-ui-migration-design.md`) made Chakra the sole styling system, but it converted call sites in place: routes, module components, and shell components import Chakra primitives (`Box`, `Flex`, `Text`, `Heading`, `Input`, `chakra.div`, etc.) directly and style them with inline style props at the call site.

Today, 14 files outside `client/src/components/ui/` import from `@chakra-ui/react` directly: `shell/Layout.tsx`, `shell/Nav.tsx`, `routes/index.tsx`, `routes/login.tsx`, `routes/register.tsx`, `routes/journal/index.tsx`, `routes/journal/new.tsx`, `routes/journal/$entryId.tsx`, `routes/journal/$entryId_.edit.tsx`, `modules/journal/components/EntryForm/EntryForm.tsx`, `modules/journal/components/EntryView/EntryView.tsx`, `modules/journal/components/MoodPicker/MoodPicker.tsx`, `modules/journal/components/JournalCalendarFilter/JournalCalendarFilter.tsx`, `modules/journal/components/RichTextEditor/RichTextEditor.tsx` (plus `main.tsx` for `ChakraProvider` and `theme.ts` itself, which are exempt — see Non-goals).

The user's concern: this lets every call site independently reinvent spacing, borders, and typography via style props, the same "unopinionated, re-derive per component" failure mode the Chakra migration was meant to fix for the shadcn/`cva` approach it replaced (see that design's Context section). A design system only holds if its primitives are the *only* way to touch Chakra — everything else consumes a small, named set of components and their variants.

## Goals

- Establish `client/src/components/ui/` as the sole boundary that imports `@chakra-ui/react` (plus `main.tsx`/`theme.ts`, which wire up the provider and theme itself and aren't call sites).
- Every route, module component, and shell component consumes only `components/ui/` components (and plain HTML/semantic composition through them) — no direct Chakra imports, no inline Chakra style props, outside that boundary.
- Keep the existing visual output pixel-identical — this is a structural/encapsulation change, not a redesign. `docs/design/design-system.md`/`demo.html` remain the visual source of truth and don't change.
- Provide a small, deliberate escape hatch (see Architecture) for the genuinely rare one-off override, so the rule doesn't produce contorted variant explosions for single-use styling.

## Non-goals

- Redesigning any visual language, spacing, or component behavior — purely moving existing style-prop usage from call sites into named, reusable components.
- Touching `main.tsx` (`ChakraProvider` wiring) or `theme.ts` (theme/token definitions) — both legitimately live outside `components/ui/` and are not "call sites" in the sense this spec restricts.
- Changing `react-day-picker` as the `Calendar` engine, or any other primitive's underlying library choice.
- Backend or `shared-types` changes.
- Introducing a new component library or replacing Chakra.

## Architecture

**The boundary.** `client/src/components/ui/` is the only place in the client that imports anything from `@chakra-ui/react`. Every other file — routes, shell, module components — imports only from `components/ui/*` (design-system atoms) or module-local molecules that themselves are built purely from `components/ui/*` and plain JSX, per the existing folder-per-component/atom-molecule convention in the `client-frontend-architecture` skill.

**What moves into `components/ui/`.** Each distinct visual pattern currently expressed as ad hoc style props at a call site becomes a variant (or a new small component) inside `components/ui/`. Concretely, from the current 14 call sites:
- Layout primitives used repeatedly with the same shape (`chakra.div display="flex" justifyContent="flex-end" gap="3"`, page-width wrappers with `maxW="2xl"`, label+field stacks like `chakra.label display="flex" flexDirection="column" gap="1" fontFamily="mono" fontSize="xs" textTransform="uppercase"`) become named layout components (e.g. `Stack`, `PageContainer`, `FieldLabel`) in `components/ui/`.
- Typographic patterns (mono/uppercase eyebrow text, heading sizes, muted "soft ink" text) become `Text`/`Heading` variants defined once via a Chakra recipe in `theme.ts`, consumed as `<Text variant="eyebrow">` rather than repeating `fontFamily="mono" fontSize="xs" textTransform="uppercase"` at each call site.
- One-off structural wrappers that exist only to apply the `.entry-content` prose styling (`EntryView`, `RichTextEditor`) become a single `components/ui/Prose/Prose.tsx` component.
- Truly module-specific composites (`EntryForm`, `MoodPicker`, `JournalCalendarFilter`) stay where they are under `modules/journal/components/`, but are rewritten to compose only `components/ui/*` atoms instead of raw Chakra elements + style props.

**Escape hatch.** A `components/ui/*` component may accept an optional `className` prop (not arbitrary style props) for the rare case a call site needs a one-off tweak no existing variant covers. This is intentionally narrow: it doesn't reopen the door to arbitrary Chakra style props at call sites, and reaching for it repeatedly for the same shape is a signal that shape belongs as a new variant instead, not a component to introduce lightly.

**Enforcement.** Once the retrofit (see Migration plan) is complete, add an ESLint restriction — likely `no-restricted-imports` scoped via `eslint.config.js` overrides — that forbids importing `@chakra-ui/react` from any file under `client/src/**` except `client/src/components/ui/**`, `client/src/main.tsx`, and `client/src/theme.ts`. This turns the rule from a convention into something the linter catches, consistent with how this repo already encodes several Airbnb-rule overrides explicitly (see the `eslint-config` skill).

## Migration plan (phased, incremental)

**Phase 1 — Inventory and variant design.** For each of the 14 non-`ui/` files, catalog every distinct Chakra style-prop pattern in use. Group patterns that recur across files (e.g. the "mono uppercase label" pattern appears in `EntryForm`, `EntryView`, `JournalCalendarFilter`) into a shortlist of new `components/ui/` components/variants before writing any code, so the same shape doesn't get re-invented twice under different names.

**Phase 2 — Build the new primitives.** Add the shortlisted components/variants to `components/ui/` (and corresponding recipes to `theme.ts` where the pattern is closer to "a text/box style" than "a distinct component"). No call sites change yet in this phase; existing tests continue to pass unmodified.

**Phase 3 — File-by-file call-site conversion**, one commit per file/group, leaf-first (module components before the routes that render them, so a route conversion can immediately consume an already-converted component):
1. `modules/journal/components/MoodPicker/MoodPicker.tsx`, `RichTextEditor/RichTextEditor.tsx`
2. `modules/journal/components/EntryView/EntryView.tsx`, `JournalCalendarFilter/JournalCalendarFilter.tsx`
3. `modules/journal/components/EntryForm/EntryForm.tsx`
4. `shell/Nav.tsx`, `shell/Layout.tsx`
5. `routes/index.tsx`, `routes/login.tsx`, `routes/register.tsx`
6. `routes/journal/index.tsx`, `routes/journal/new.tsx`, `routes/journal/$entryId.tsx`, `routes/journal/$entryId_.edit.tsx`

Each file's commit: replace direct Chakra imports/style props with `components/ui/*` equivalents, run that file's existing test (if any) as a before/after regression check, `npm run lint --workspace client`, commit.

**Phase 4 — Lock it in.** Add the `no-restricted-imports` ESLint rule described in Architecture. Run `grep -rl "@chakra-ui/react" client/src` and confirm the only matches are `components/ui/**`, `main.tsx`, `theme.ts`. Full verification (`npm run lint && npx tsc -b && npm test && npm run build`, from `client/`) plus a manual click-through of every route against `demo.html` to confirm the visual output is unchanged.

## Testing strategy

Existing Vitest + Testing Library suites (`EntryForm.test.tsx`, `EntryView.test.tsx`, `MoodPicker.test.tsx`, `JournalCalendarFilter.test.tsx`) are the regression net, same approach as the Chakra migration: baseline run before each file's conversion, re-run after, fix any query selectors that assumed a specific DOM shape now produced by the new shared component instead of inline elements.

No new tests are added purely for the encapsulation move — like the Chakra migration itself, this is structural, not new functionality. New `components/ui/` primitives introduced in Phase 2 get their own tests if the existing folder convention calls for it (most current `components/ui/*` files are thin enough not to have one, per the `client-frontend-architecture` skill's guidance to only extract/test where there's real logic).

## Risks / open questions

- Variant granularity is a judgment call during Phase 1: too few variants forces awkward reuse of a shape that doesn't quite fit; too many recreates the same "restyle per call site" problem one level down. Err toward fewer, more general variants and use the `className` escape hatch for genuine one-offs rather than adding a variant for a single call site.
- The `no-restricted-imports` rule needs to exempt `components/ui/**` itself but still catch `components/ui/SomeNewFile.tsx` importing from `@chakra-ui/react` incorrectly if it's not actually meant to be a design-system atom (unlikely in practice, since everything in that folder is expected to touch Chakra) — worth a quick lint-config sanity check during Phase 4 with a deliberately-placed bad import.
- This spec doesn't cover a plan doc or effort estimate yet — Phase 1's inventory should inform how big Phase 2/3 actually are before scheduling the work.
