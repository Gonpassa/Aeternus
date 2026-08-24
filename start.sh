#!/usr/bin/env bash
# Starts the backend and client dev servers in separate iTerm tabs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TEST_DB=0
if [ "${1:-}" = "--test-db" ]; then
  TEST_DB=1
fi

if ! osascript -e 'id of app "iTerm"' >/dev/null 2>&1; then
  echo "iTerm is not installed. Install it or run 'npm run dev' manually in backend/ and client/." >&2
  exit 1
fi

if [ "$TEST_DB" -eq 1 ]; then
  BACKEND_DEV_SCRIPT="dev:test-db"
  BACKEND_ENV_FILE="$ROOT_DIR/backend/.env.test"
  DATABASE_URL="postgres://localhost:5432/nee3_test"
  BACKEND_PORT=3001
else
  BACKEND_DEV_SCRIPT="dev"
  BACKEND_ENV_FILE="$ROOT_DIR/backend/.env"
  DATABASE_URL="postgres://localhost:5432/nee3"
  BACKEND_PORT=3000
fi

# Backend needs a real, migrated Postgres to serve auth (register/login/logout).
# Without this check, the backend just crash-loops under nodemon on connectDB's
# process.exit(1), which is a confusing way to discover Postgres isn't running.
if [ -f "$BACKEND_ENV_FILE" ]; then
  ENV_URL="$(grep -E '^DATABASE_URL=' "$BACKEND_ENV_FILE" | tail -n 1 | cut -d '=' -f2-)"
  if [ -n "$ENV_URL" ]; then
    DATABASE_URL="$ENV_URL"
  fi

  ENV_PORT="$(grep -E '^PORT=' "$BACKEND_ENV_FILE" | tail -n 1 | cut -d '=' -f2-)"
  if [ -n "$ENV_PORT" ]; then
    BACKEND_PORT="$ENV_PORT"
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
    write text "cd \"$ROOT_DIR/backend\" && npm run $BACKEND_DEV_SCRIPT"
  end tell
  tell newWindow
    set newTab to (create tab with default profile)
  end tell
  tell current session of newTab
    write text "cd \"$ROOT_DIR/client\" && VITE_BACKEND_PORT=$BACKEND_PORT npm run dev"
  end tell
end tell
EOF
