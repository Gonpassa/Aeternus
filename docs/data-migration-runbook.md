# Production data migration runbook

**Run every command in this file yourself, directly in your own terminal.**
Per this repo's data-privacy rule, the `nee3` database holds your real journal content, so no agent tool should execute these commands or capture their output - not even to "just check" something looks right.

## 1. Open a tunnel to the production Postgres instance

Fly Postgres only listens on the private network (6PN) - it isn't reachable directly from your laptop. Proxy a local port to it first, before anything else in this runbook:

```sh
fly proxy 5433:5432 -a aeternus-db
```

Leave this running in its own terminal for the rest of this runbook. Every command below connects through `localhost:5433`, not the internal `DATABASE_URL` host directly.

In a second terminal, confirm the actual database name before doing anything else - `fly postgres create` does not create a database matching the app name, only the cluster defaults:

```sh
psql "postgres://postgres:<password>@localhost:5433/postgres" -c "\l"
```

Use the real name from that listing (likely just `postgres`) as `<production-db-name>` below - not the Fly app name (`aeternus-db`).

## 2. Apply the schema to production

From `backend/`, still in the second terminal, with `DATABASE_URL` rewritten to go through the tunnel - same user/password as the production secret, `localhost:5433` as the host, and the real database name from the step above:

```sh
cd backend
DATABASE_URL="postgres://<user>:<password>@localhost:5433/<production-db-name>" npm run db:migrate
```

Fill in `<user>` and `<password>` from the production `DATABASE_URL` you set as a Fly secret in #36 (`fly secrets list -a aeternus` shows the digest, not the value - use your own record of it).

If this password was ever typed into a chat, terminal-sharing session, or anywhere else outside your own shell, rotate it before going further: `fly postgres connect -a aeternus-db`, then `ALTER USER postgres WITH PASSWORD '<new-password>';`, then update the `DATABASE_URL` Fly secret (#36) to match.

Review the migration output yourself before continuing - confirm it applied cleanly with no errors.

## 3. Copy your real journal entries from local `nee3` to production

Still in the second terminal. This dumps **data only**, scoped to the two application tables (`users`, `entries`) - not the full database. A full-database dump/restore would overwrite the schema step 2 just migrated, including Drizzle's own migration-tracking table and the `connect-pg-simple` session table, so avoid `pg_dump` without `--data-only` and `--table` here:

```sh
pg_dump --data-only --no-owner --no-acl \
  --table=users --table=entries \
  postgres://localhost:5432/nee3 > ~/aeternus-nee3-dump.sql

psql postgres://<user>:<password>@localhost:5433/<production-db-name> \
  -v ON_ERROR_STOP=1 \
  -f ~/aeternus-nee3-dump.sql
```

Same `<user>`, `<password>`, and `<production-db-name>` as step 2.

Delete the local dump file (`~/aeternus-nee3-dump.sql`) once you've confirmed the restore succeeded - it's a plaintext copy of your real journal data sitting on disk.

## 4. Verify

- Stop the `fly proxy` tunnel from step 1 (Ctrl-C).
- Open `https://aeternus.fly.dev/` in a browser, log in with your real credentials, and confirm:
  - The session persists across a page reload (closes out #37's deferred login check).
  - Your real journal entries are present and look correct.

Once you've confirmed this, the deploy epic (#33) is complete - Aeternus is live in production with your real data.
