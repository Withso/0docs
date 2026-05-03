#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Push schema to BOTH databases:
#  - DATABASE_URL: per-environment (workspace) Postgres
#  - SHARED_DATABASE_URL: the persistent project-shared Neon DB the api-server
#    actually queries in production
pnpm --filter db push
if [ -n "$SHARED_DATABASE_URL" ] && [ "$SHARED_DATABASE_URL" != "$DATABASE_URL" ]; then
  echo "Pushing schema to SHARED_DATABASE_URL as well..."
  DATABASE_URL="$SHARED_DATABASE_URL" pnpm --filter db push
fi
