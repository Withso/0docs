#!/usr/bin/env sh
set -eu

cat > /usr/share/nginx/html/config.json <<JSON
{
  "backendUrl": "${VITE_SUPABASE_URL:-}",
  "publishableKey": "${VITE_SUPABASE_PUBLISHABLE_KEY:-}",
  "projectId": "${VITE_SUPABASE_PROJECT_ID:-}",
  "functionsUrl": "${FUNCTIONS_URL:-${VITE_SUPABASE_URL:-}/functions/v1}"
}
JSON

exec nginx -g 'daemon off;'
