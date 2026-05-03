# Multi-stage Dockerfile for 0docs self-hosted.
#
# Targets:
#   - `base`  : pnpm + node 24, monorepo installed
#   - `api`   : runs the Express API server on PORT (default 8081)
#   - `web`   : serves the built Vite app on PORT (default 8080) via vite preview

# ─────────────── base ───────────────
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Copy manifests first for cached dep install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json tsconfig.json ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/zdocs/package.json artifacts/zdocs/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/
COPY lib ./lib
COPY scripts/package.json scripts/
RUN pnpm install --frozen-lockfile

# Bring in the rest of the source.
COPY . .
RUN pnpm run typecheck:libs || true

# ─────────────── api ───────────────
FROM base AS api
ENV NODE_ENV=production
RUN pnpm --filter @workspace/api-server run build
EXPOSE 8081
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]

# ─────────────── web ───────────────
FROM base AS web
ENV NODE_ENV=production
# Vite needs to know where the API lives at build time only for absolute
# fetches; the app uses relative `/api/...` URLs so the same build works
# behind any reverse proxy that fronts both services.
RUN pnpm --filter @workspace/zdocs run build
EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/zdocs", "run", "serve"]
