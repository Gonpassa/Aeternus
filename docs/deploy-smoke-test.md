# Production deploy smoke test

Run this checklist after every `fly deploy` to `aeternus`.
It confirms the deploy actually shipped a working app before you trust it.

## Automatable checks

These can be run by anyone (including an agent) - no credentials involved.

```sh
curl -i https://aeternus.fly.dev/api/health
# expect: HTTP/2 200, body {"status":"ok"}

curl -i https://aeternus.fly.dev/
# expect: HTTP/2 200, text/html, renders the client shell (<title>Aeternus</title>)

curl -i https://aeternus.fly.dev/journal/some-existing-entry-id
# expect: HTTP/2 200, text/html - same index.html as above, not a 404
# confirms the SPA fallback survives a hard refresh on a deep client route
```

## Manual-only check

This step requires a real login and must be done by the developer directly in a browser, not by an agent.

- Open `https://aeternus.fly.dev/` in a browser.
- Log in with your real credentials.
- Confirm the session persists across a page reload (no redirect back to login).
- Confirm your real journal entries are visible (once #38's data migration has run).

## If something fails

- `/api/health` failing or timing out: check `fly status -a aeternus` and `fly logs -a aeternus`.
- Root page 404s or serves JSON instead of HTML: the built `client/dist` likely wasn't copied into the image - check the Dockerfile's `build` stage output.
- Deep route 404s: the SPA fallback in `backend/src/app.ts` isn't registered, or is registered before the API routes.
- Login doesn't persist: check `SESSION_SECRET` and `DATABASE_URL` are set via `fly secrets list -a aeternus`, and that the Postgres session table migrated correctly.
