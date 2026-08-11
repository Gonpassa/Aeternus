#!/usr/bin/env bash
# Starts the backend and client dev servers in separate iTerm tabs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! osascript -e 'id of app "iTerm"' >/dev/null 2>&1; then
  echo "iTerm is not installed. Install it or run 'npm run dev' manually in backend/ and client/." >&2
  exit 1
fi

# Backend needs a real, migrated Postgres to serve auth (register/login/logout).
# Without this check, the backend just crash-loops under nodemon on connectDB's
# process.exit(1), which is a confusing way to discover Postgres isn't running.
DATABASE_URL="postgres://localhost:5432/nee3"
if [ -f "$ROOT_DIR/backend/.env" ]; then
  ENV_URL="$(grep -E '^DATABASE_URL=' "$ROOT_DIR/backend/.env" | tail -n 1 | cut -d '=' -f2-)"
  if [ -n "$ENV_URL" ]; then
    DATABASE_URL="$ENV_URL"
  fi
fi

if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
    echo "Postgres isn't reachable at $DATABASE_URL." >&2
    echo "Start it with: brew services start postgresql@16" >&2
    echo "(see README.md 'Local Postgres setup' if the 'nee3' database or migrations are missing)" >&2
    exit 1
  fi
else
  echo "Warning: pg_isready not found, skipping Postgres reachability check." >&2
fi

osascript <<EOF
tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    write text "cd \"$ROOT_DIR/backend\" && npm run dev"
  end tell
  tell newWindow
    set newTab to (create tab with default profile)
  end tell
  tell current session of newTab
    write text "cd \"$ROOT_DIR/client\" && npm run dev"
  end tell
end tell
EOF
