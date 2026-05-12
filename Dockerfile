# Single-service Dockerfile for 0docs self-hosted.
#
# Produces one image that serves both the API and the built frontend
# from the same port (PORT, default 8081). Railway, Fly, render.com,
# and bare Docker hosts can all use this image directly.

# ─────────────── deps ───────────────
FROM node:24-alpine AS deps
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

# ─────────────── build ───────────────
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN pnpm --filter @workspace/api-server run build \
 && pnpm --filter @workspace/zdocs run build \
 && mkdir -p artifacts/api-server/dist/public \
 && cp -r artifacts/zdocs/dist/public/. artifacts/api-server/dist/public/

# ─────────────── runtime ───────────────
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8081
WORKDIR /app

# Only what's needed at runtime: the bundled api-server (with frontend
# next to it as ./public) and the source-map files for clean stack traces.
COPY --from=build /app/artifacts/api-server/dist ./dist

EXPOSE 8081
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
