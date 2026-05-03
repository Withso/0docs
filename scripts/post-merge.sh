#!/bin/bash
set -e
pnpm install --frozen-lockfile

# The api-server only ever reads SHARED_DATABASE_URL (the persistent
# project-shared Neon DB). Push schema there only — pushing to the
# per-environment DATABASE_URL too pushes us past the 20s post-merge
# timeout and isn't needed since nothing in this stack queries it.
if [ -n "$SHARED_DATABASE_URL" ]; then
  DATABASE_URL="$SHARED_DATABASE_URL" pnpm --filter db push
else
  pnpm --filter db push
fi
