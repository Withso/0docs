# Self-hosting 0docs

0docs is a React/Vite app backed by a Postgres-compatible backend with auth, row-level security, and serverless functions.
This phase makes the frontend container-ready and adds a runtime `config.json` so one image can be promoted across environments.

## Runtime configuration

At startup the app tries to load `/config.json`:

```json
{
  "backendUrl": "https://your-backend.example.com",
  "publishableKey": "your-publishable-key",
  "projectId": "your-project-ref",
  "functionsUrl": "https://your-backend.example.com/functions/v1"
}
```

The managed Lovable environment still uses the generated client configuration. Self-hosted deployments can inject the same values at container startup through environment variables.

## Required services

1. Static frontend container from this repo.
2. A Postgres/auth backend compatible with the shipped migrations.
3. Deno-compatible backend functions from `supabase/functions/*`.
4. Optional GitHub token setup for publishing docs-as-code.

## Database bootstrap

Set `DATABASE_URL`, then run:

```sh
./scripts/bootstrap-self-host.sh
```

This applies every SQL migration in `supabase/migrations` in filename order.

## Backend functions

Functions live in `supabase/functions`:

- `ask-docs`
- `github-branches`
- `publish-to-github`
- `seed-demo-project`
- `seed-homepage`

They require `SUPABASE_URL` and `SUPABASE_ANON_KEY`; seed/admin functions may require `SUPABASE_SERVICE_ROLE_KEY`. `ask-docs` also requires `LOVABLE_API_KEY`.

## Security notes

- Keep service-role keys only on the function runtime.
- Keep row-level security enabled from the migrations.
- Do not expose private GitHub tokens to the frontend.
- User roles must remain in `user_roles`, never on profiles/users.
