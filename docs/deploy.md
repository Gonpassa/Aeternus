# Deploying main to production

Aeternus deploys as a single Docker image (backend serves the built client, see `Dockerfile`) to the Fly.io app `aeternus`.
There is no CI/CD pipeline - deploys are triggered manually from your own terminal, and only from `main`.

## Prerequisites

- `flyctl` installed and authenticated (`fly auth login`).
- You're on `main`, up to date with the remote, and the working tree is clean.
- `npm run lint`, `npm run build`, and `npm test` pass locally.
  The Dockerfile's `build` stage runs `npm run build` again inside the image, but catching a failure locally first is faster than waiting on a Fly build.

## Normal deploy (no schema change)

Most deploys are just the app code - no new migration to apply:

```sh
fly deploy -a aeternus
```

This builds the image from the Dockerfile, pushes it, and rolls it out.
`fly.toml` has no `release_command`, so this step alone never touches the database.

## Deploy with a schema change

If your changes include a new Drizzle migration (`backend/src/db/migrations/`), the migration must be applied to production **yourself, by hand** before or right after deploying - never by an agent.
Per this repo's data-privacy rule, the production database (`nee3`-derived data on `aeternus-db`) is off-limits to agent-driven commands.

1. `fly deploy -a aeternus` (as above).
2. Follow the "Apply the schema to production" steps in `docs/data-migration-runbook.md` (open a `fly proxy` tunnel, then run `db:migrate` against production through it).
   Ignore the runbook's data-copy steps (3) if you're not migrating new source data - only the schema step applies.

## After every deploy

Run the checklist in `docs/deploy-smoke-test.md` - it has automatable `curl` checks anyone (including an agent) can run, plus a manual login check you must do yourself in a browser.

## If something goes wrong

- Check `fly status -a aeternus` and `fly logs -a aeternus` for the running app.
- To roll back, deploy the previous known-good commit: `git checkout <previous-sha> -- .` is unnecessary - instead `git revert` or check out that commit into a throwaway branch and `fly deploy -a aeternus` from there. Fly also keeps prior image releases (`fly releases -a aeternus`) if you need to redeploy an old image directly.
- Secrets (`SESSION_SECRET`, `DATABASE_URL`) are managed via `fly secrets set/list -a aeternus` and are not touched by a normal deploy.
