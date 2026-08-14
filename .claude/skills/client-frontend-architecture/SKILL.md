---
name: client-frontend-architecture
description: Folder/file conventions for client/src components, hooks, and utils - atom/molecule structure, when to split a component or hook, where promoted shared logic lives. Use when adding or restructuring client-side components, hooks, or route files.
---

# Client frontend architecture

Conventions for organizing `client/src`, modeled loosely on atomic design (atoms -> molecules), scoped to how this repo actually splits and promotes code.

## Folder-per-component

Every component - atom or molecule - gets its own folder named for the component, containing a same-named entry file:

```
components/ui/Button/Button.tsx
components/MarkedRangeCalendar/MarkedRangeCalendar.tsx
modules/journal/components/EntryForm/EntryForm.tsx
```

Colocate `.module.css` and `.test.tsx` in that same folder when they exist. Always name the entry file `<Name>.tsx`, never `index.tsx` - one rule for atoms and molecules alike, easy to grep for.

No barrel (`index.ts`) files. Import the full path (`components/ui/Button/Button.tsx`), matching existing usage across the codebase.

**Atoms** live in `client/src/components/ui/` - the generic, design-system-level primitives (Button, Calendar, Popover, Select, Tooltip, VisuallyHidden). **Molecules** live in `client/src/components/<Name>/` when cross-module (e.g. `MarkedRangeCalendar`), or `client/src/modules/<module>/components/<Name>/` when scoped to one module (e.g. `EntryForm`, `MoodPicker`).

## When to split a component

Line count (~200 lines) is a smell that tells you to look, not the rule itself. The actual test: can you name a sub-piece with its own concern (e.g. "the button that renders a marked day")? If so, it's a split candidate.

- Extracted sub-pieces stay flat sibling files in the parent's folder (`MarkedRangeCalendar/MarkedDayButton.tsx`), not their own nested folder - unless that piece later grows enough to need its own split (its own test/css/utils).
- Component-local helper logic goes in a local `<name>.utils.ts` in the same folder.
- Promote to a shared location only when the logic is genuinely reused or reusable beyond that one component (see Promotion below).

## When to split a hook

Don't extract a hook just to hide a `useState`/`useEffect` call - that's a thin wrapper with no logic of its own. Extract when the hook coordinates more than one piece of state/effect together, or encodes a rule that's independently meaningful (validation, derived data, a state machine). The test: does this hook have a rule to test, not just state to hold?

## Promotion to shared locations

Shared `utils/` and `hooks/` folders exist at two scopes, both created lazily - only at the moment something real is promoted into them, never scaffolded empty in advance:

- **Module-scoped**: `modules/<module>/utils/`, `modules/<module>/hooks/` - for logic shared across more than one component within that module, but not general enough for the whole app.
- **Root/app-wide**: `client/src/utils/`, `client/src/hooks/` - for logic general enough to be reused across modules (e.g. generic date math, not calendar-rendering specifics).

## Routes

Route files (`client/src/routes/`) should stay thin: routing glue, not form/heading markup. When a route's content grows into a real form or a substantial block of markup, pull it into a module component (as already done for `EntryForm`, used by `routes/journal/new.tsx` and `routes/journal/$entryId.edit.tsx`).

This is a forward-looking rule, not a backlog - small existing routes (e.g. `routes/register.tsx`, `routes/login.tsx`) don't need retrofitting just to comply. Apply it when a route naturally grows past "thin," not proactively.

## Out of scope

TanStack Form adoption is a separate decision, not covered by this skill.
