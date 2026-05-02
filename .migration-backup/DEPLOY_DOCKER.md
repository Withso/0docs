# Deploy with Docker

## Build

```sh
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  --build-arg VITE_SUPABASE_PROJECT_ID="$VITE_SUPABASE_PROJECT_ID" \
  -t 0docs .
```

## Run

```sh
docker run --rm -p 8080:8080 \
  -e VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  -e VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  -e VITE_SUPABASE_PROJECT_ID="$VITE_SUPABASE_PROJECT_ID" \
  -e FUNCTIONS_URL="$FUNCTIONS_URL" \
  0docs
```

Open `http://localhost:8080`.

## Docker Compose

```sh
VITE_SUPABASE_URL=... \
VITE_SUPABASE_PUBLISHABLE_KEY=... \
VITE_SUPABASE_PROJECT_ID=... \
docker compose up --build
```
