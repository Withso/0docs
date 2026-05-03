#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Schema push is slow on Neon (~25s for the introspection step alone, even
# with zero diff) — well over the 20s post-merge timeout. Only run it when
# the merged commit actually touched schema files.
if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -qE '^lib/db/src/schema/'; then
  echo "[post-merge] schema files changed — pushing to SHARED_DATABASE_URL"
  if [ -n "$SHARED_DATABASE_URL" ]; then
    DATABASE_URL="$SHARED_DATABASE_URL" pnpm --filter db push
  else
    pnpm --filter db push
  fi
else
  echo "[post-merge] no schema changes detected — skipping db push"
fi
