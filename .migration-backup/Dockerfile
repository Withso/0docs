FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM deps AS build
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN bun run build

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
