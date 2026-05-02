# Deploy on Railway

This repo includes `railway.json` and a Dockerfile.

## Variables

Set these Railway variables for the web service:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `FUNCTIONS_URL` optional, defaults to `${VITE_SUPABASE_URL}/functions/v1`

## Deploy

1. Create a Railway project from the repository.
2. Select Dockerfile build.
3. Add the variables above.
4. Deploy the web service.

For a fully self-hosted setup, add separate services for the database/auth backend and the Deno-compatible functions, then point `FUNCTIONS_URL` at the functions service.
