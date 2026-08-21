# npm workspaces monorepo, with shared-types as the only shared runtime package

Aeternus.3 is a deliberate departure from Nee.2, which kept `client/` and `backend/` as fully independent packages with no root tooling.
Aeternus.3 instead uses an npm workspaces monorepo (`"workspaces": ["client", "backend", "packages/*"]`) so client, backend, and `packages/shared-types` share one root `tsconfig.base.json`, one install step, and one root lint/build invocation, instead of keeping two copies of tooling config in sync by hand.

This does not reopen the door to shared runtime code between client and backend.
`packages/shared-types` is the one deliberate exception: it ships only compile-time type definitions (API request/response shapes), erased at build time, so nothing actually executes across the client/backend boundary.
Everything else about the two sides — runtime logic, dependencies, deployment — stays independent; the workspace only links dev tooling and installs.

## Status

Accepted.

## Considered options

Keep `client/` and `backend/` fully independent (Nee.2's approach). Rejected because it meant maintaining duplicate TypeScript/lint config as both sides evolved, with no mechanism to catch API request/response shape drift between them.
