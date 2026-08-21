# Restrict `@chakra-ui/react` imports to `components/ui/`

The Chakra UI v3 migration made Chakra the sole styling system but converted call sites in place: routes, module components, and shell components imported Chakra primitives directly and styled them with inline style props at the call site.
This let every call site independently reinvent spacing, borders, and typography, the same "unopinionated, re-derive per component" failure mode the Chakra migration was meant to fix.

We decided `client/src/components/ui/` (plus `main.tsx` and `theme.ts`, which wire up the provider/theme rather than acting as call sites) is the only place allowed to import from `@chakra-ui/react`.
Every route, module component, and shell component consumes only `components/ui/` components instead.
This is enforced by an ESLint `no-restricted-imports` rule (see `client/eslint.config.js`), not just convention, so a design system only holds if its primitives are the *only* way to touch Chakra.

A narrow escape hatch exists for genuine one-off overrides: a `components/ui/*` component may accept an optional `className` prop sourced from a colocated CSS Module, not arbitrary style props or global class strings.

## Status

Accepted.

## Considered options

Leave call sites free to use Chakra style props directly, relying on code review to catch drift. Rejected: this is exactly the failure mode observed after the Chakra migration landed, and review-only enforcement doesn't scale as the app grows.
