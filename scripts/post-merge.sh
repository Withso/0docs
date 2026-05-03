#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Push schema to BOTH databases in parallel:
#  - DATABASE_URL: per-environment (workspace) Postgres
#  - SHARED_DATABASE_URL: the persistent project-shared Neon DB the api-server
#    actually queries in production
# Each push takes ~15-20s against Neon, so serializing them blows the
# 20s post-merge timeout. Run them concurrently and wait for both.
pnpm --filter db push &
PID_LOCAL=$!

if [ -n "$SHARED_DATABASE_URL" ] && [ "$SHARED_DATABASE_URL" != "$DATABASE_URL" ]; then
  DATABASE_URL="$SHARED_DATABASE_URL" pnpm --filter db push &
  PID_SHARED=$!
  wait $PID_LOCAL
  wait $PID_SHARED
else
  wait $PID_LOCAL
fi
