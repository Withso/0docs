# Portable backend functions

The current backend functions are Deno-compatible and live in `supabase/functions/*`.
For self-hosting, run them with the Supabase CLI or a Deno Deploy-compatible runtime.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for seed/admin functions only
- `LOVABLE_API_KEY` for `ask-docs`

Phase 5 keeps these functions in their existing runtime so the hosted product remains stable.
A future phase can wrap them in a standalone Hono service if the project chooses a non-Supabase backend.
