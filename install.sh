#!/usr/bin/env bash
# 0docs — one-command self-host installer.
#
# Idempotent: re-running it is safe and only does work that's actually needed.
#
# What it does:
#   1. Verifies Node + pnpm are installed.
#   2. Copies .env.example → .env if missing, generates SESSION_SECRET.
#   3. Starts Postgres via Docker Compose (skipped if you've set
#      DATABASE_URL to point somewhere else and Docker isn't installed).
#   4. Installs npm deps with pnpm.
#   5. Pushes the Drizzle schema to the database.
#   6. Prints the URLs and next steps.
#
# After this completes, run `pnpm run selfhost:dev` to start the API + web.

set -euo pipefail

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "  \033[36m›\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$*"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$*" >&2; exit 1; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }

bold "0docs · self-host install"
echo

# ── 1. Prereqs ────────────────────────────────────────────────────────
command -v node >/dev/null 2>&1 || fail "Node.js is not installed (need v20+)."
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js v20+ required (found v$NODE_MAJOR)."
fi
ok "Node.js $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  warn "pnpm not found — installing via corepack"
  corepack enable >/dev/null 2>&1 || fail "corepack enable failed; install pnpm manually."
fi
ok "pnpm $(pnpm -v)"

HAS_DOCKER=0
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  HAS_DOCKER=1
  ok "docker compose $(docker compose version --short 2>/dev/null || echo present)"
else
  warn "docker compose not found — you'll need to provide your own Postgres"
fi

# ── 2. .env ──────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  ok "created .env from .env.example"
fi

if grep -q "^SESSION_SECRET=replace-me" .env || ! grep -q "^SESSION_SECRET=" .env; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if grep -q "^SESSION_SECRET=" .env; then
    # POSIX-safe in-place edit (works on Linux + macOS).
    tmp=$(mktemp)
    sed "s|^SESSION_SECRET=.*|SESSION_SECRET=${SECRET}|" .env > "$tmp" && mv "$tmp" .env
  else
    printf "\nSESSION_SECRET=%s\n" "$SECRET" >> .env
  fi
  ok "generated SESSION_SECRET"
fi

# Force AUTH_MODE=selfhost when running the installer (operators expect this).
if grep -q "^AUTH_MODE=replit" .env; then
  tmp=$(mktemp)
  sed "s|^AUTH_MODE=.*|AUTH_MODE=selfhost|" .env > "$tmp" && mv "$tmp" .env
  ok "set AUTH_MODE=selfhost"
fi

# ── 3. Postgres ─────────────────────────────────────────────────────
if [ "$HAS_DOCKER" = "1" ]; then
  info "starting Postgres via docker compose"
  docker compose up -d postgres
  # Wait for health.
  for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U postgres -d zerodocs >/dev/null 2>&1; then
      ok "Postgres ready"
      break
    fi
    sleep 1
  done
else
  warn "skipping Postgres — make sure DATABASE_URL in .env points at a running Postgres"
fi

# ── 4. Dependencies ─────────────────────────────────────────────────
info "installing dependencies (this can take a minute on a cold cache)"
pnpm install
ok "dependencies installed"

# ── 5. Migrations ────────────────────────────────────────────────────
info "pushing database schema"
# shellcheck disable=SC2046
set -a; . ./.env; set +a
pnpm --filter @workspace/db run push
ok "schema applied"

# ── 6. Seed admin (if ADMIN_EMAIL + ADMIN_PASSWORD set) ──────────────
info "seeding admin user (skipped if ADMIN_EMAIL/ADMIN_PASSWORD unset)"
node scripts/seed-admin.mjs
ok "admin seed step complete"

# ── 7. Optionally start the stack ──────────────────────────────────
START_STACK=0
for arg in "$@"; do
  case "$arg" in
    --start|--up) START_STACK=1 ;;
    --no-start)   START_STACK=0 ;;
  esac
done
# Default to starting unless the operator explicitly opted out by
# passing --no-start (or running in CI). This makes `./install.sh` a
# true one-command install + boot.
if [ "$START_STACK" = "0" ] && [ "${CI:-}" != "1" ] && [ -t 1 ]; then
  START_STACK=1
fi

echo
bold "✓ Install complete"
echo

if [ "$START_STACK" = "1" ]; then
  cat <<EOF
Starting 0docs at http://localhost:${WEB_PORT:-8080}

  Press Ctrl-C to stop. To start later, run:  pnpm run selfhost:dev
  Full container stack:                       docker compose up

Docs: README.md, SELFHOSTING.md.
EOF
  exec pnpm run selfhost:dev
else
  cat <<EOF
Next steps:

  Start the dev server:
    pnpm run selfhost:dev

  Or run the full stack in containers:
    docker compose up

  Then open: http://localhost:${WEB_PORT:-8080}

  Admin user: set ADMIN_EMAIL + ADMIN_PASSWORD in .env and re-run
  ./install.sh to seed one. Otherwise the first account created via
  the web UI becomes the admin.

Docs: see README.md and SELFHOSTING.md.
EOF
fi
