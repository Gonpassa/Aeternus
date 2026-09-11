# `atoms/Select` is closed, unlike the other compound atoms

`Dialog`, `Tabs`, `Popover` and (until this decision) `Select` are thin compound passthroughs: the atom styles each Chakra part and the caller assembles them as children.
For `Select` that shape leaked in two ways.
Every caller had to build a Chakra `ListCollection` by hand and then map over its items to render the options, so a Chakra implementation concept sat in feature code that only wanted to show a list of choices.
More importantly, per-part children invite per-call-site styling: `JournalCalendarFilter` was already reaching into `SelectTrigger` and `SelectContent` with `borderRadius`, `boxShadow`, `minW` and `justifyContent` overrides to get the look its calendar header wanted.
That is a caller inventing a visual variant by hand, which is precisely the drift ADR 0002 exists to prevent, arriving through composition rather than through direct Chakra imports.

We decided `Select` becomes a closed, data-driven atom: the caller passes `items` and a single-valued `value`/`onChange`, and the atom owns the trigger, the popover and the option rendering.
`SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` and the `createListCollection` re-export are removed, so there is no per-part escape hatch to drift through.
A single `itemSlot` render prop covers option content beyond a plain label (subtext, icons), with the item type inferred from `items` so the slot stays type-safe without a separate hook.
Because the atom now owns the option list, it also reserves the width of its widest option, which fixes variable-width layout shift (the month select in the journal calendar header) once for every select in the app rather than per call site.

This makes `Select` deliberately the odd one out among the compound atoms.
The distinction is not arbitrary: `Dialog`, `Tabs` and `Popover` compose caller-authored *content*, whose shape the atom cannot know, whereas a select's parts are pure chrome with a fixed structure and only the option data varies.
When an atom's parts are chrome, closing it is what makes uniformity enforceable rather than conventional.

## Status

Accepted.

## Considered options

**Leave it.** Three call sites is not much duplication, and the explicit `createListCollection` is honest about what Chakra needs.
Rejected: the duplication was never the real cost, the open per-part styling surface was, and it was already being used.

**A `useSelect` hook wrapping `createListCollection`.**
Rejected on two grounds.
It would be a `useMemo` with no rule of its own, which `client-frontend-architecture` says not to extract, and the memoization it exists to enforce turns out not to be load-bearing: Zag's select machine tracks `collection.toString()`, comparing collections by content rather than by identity, so an unmemoized collection with unchanged items is already a no-op.
Chakra also ships `useListCollection` (re-exported from Ark) for genuinely mutable lists, keyed off `initialItems` held in state, so a filterable or async select should reach for that rather than for something homegrown.

**An `items` prop with the compound parts kept.**
Rejected: it removes the word "collection" while callers still need the items to map over, so it adds surface without removing the ceremony, and it leaves the per-part styling hole open.

**A `variant` for the journal calendar header's flush month/year pair.**
Rejected: all selects should look the same, and the only part of that call site's overrides worth keeping was the layout-shift fix, which the widest-option sizing now handles generically.

## Consequences

Multi-select is not supported and will be a sibling atom (`MultiSelect`) rather than a `multiple` prop on this one.
Folding both into one component doubles its size and drags in a union-typed `value`, which was judged not worth it for a capability no current caller needs.
`Select` carries a comment recording this so the next person does not add the flag.
