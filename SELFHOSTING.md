# Self-hosting 0docs in production

This doc covers what `README.md` doesn't: getting from "it runs on my
laptop" to "it runs on a server my team can use." For a fast local install
see [`README.md`](./README.md).

---

## Deploying on Railway

Railway is the recommended hosted option. The Postgres plugin gives you a
managed database, and the single-service Dockerfile means there's only
one app to deploy.

1. Create a new Railway project and add the **PostgreSQL plugin**.
   Railway injects `DATABASE_URL` automatically.
2. Add a new service from this repo. Railway detects the `Dockerfile`.
3. In the **app service's** Variables tab (not the Postgres service):
   - `NODE_ENV=production` (recommended, sets the Secure cookie flag).
   - `ADMIN_EMAIL` + `ADMIN_PASSWORD` (optional) — bootstrap admin user.
   - `OPENAI_API_KEY` (optional) — enables the "Ask docs" feature.
   - `SMTP_URL` + `SMTP_FROM` (optional) — enables password-reset and
     invite emails. Without these, links are printed to the server logs
     so the operator can copy and share them.
   - `S3_*` variables (optional) — enables S3-compatible media storage.
     Recommended once your corpus grows. Without it, media is stored
     inline in Postgres (works fine for small/medium installs).
4. Deploy. Railway runs migrations on boot.

You do **not** need to set `DATABASE_URL` (Railway injects it from the
Postgres plugin) or `SESSION_SECRET` (the server auto-generates and
persists one in `system_settings` on first boot).

A one-click "Deploy on Railway" template is on the roadmap.

---

## Recommended topology (Docker Compose / VPS)

```
                ┌──────────────────────────┐
                │       Reverse proxy      │   nginx / Caddy / Traefik
                │   (HTTPS, gzip, certs)   │
                └────────────┬─────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │   api-server │
                    │ + bundled web │
                    └──────┬───────┘
                           │ SQL
                           ▼
                    ┌──────────────┐
                    │   postgres   │
                    └──────────────┘
```

The web app is built into the api-server's `dist/public/` and served as
static files from the same process, so you have one HTTP service to
front. Everything lives on a single hostname.

---

## Reverse proxy (HTTPS)

### Caddy

The simplest option. `Caddyfile`:

```Caddyfile
docs.example.com {
    encode zstd gzip
    reverse_proxy api:8081
}
```

Caddy issues and renews HTTPS certs automatically.

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name docs.example.com;
    ssl_certificate     /etc/letsencrypt/live/docs.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/docs.example.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8081;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Make sure to forward `X-Forwarded-Proto`. The session cookie is set with
`Secure` when `NODE_ENV=production`, so requests must arrive over HTTPS or
the cookie won't be saved. The API also calls `app.set('trust proxy', 1)`
so `req.secure` and IP detection work correctly behind a single proxy hop.

### CORS

When the web app and API share the same hostname (the default), CORS is a
no-op. Only set `CORS_ALLOWLIST` if you split them onto different
hostnames:

```bash
CORS_ALLOWLIST=https://docs.example.com,https://app.example.com
```

---

## Backups

The only stateful component is Postgres. Back it up like any other
Postgres database — there's nothing 0docs-specific.

For the bundled `docker-compose.yml` setup:

```bash
# Daily backup
docker compose exec -T postgres pg_dump -U postgres zerodocs | \
    gzip > "backup-$(date +%F).sql.gz"

# Restore
gunzip -c backup-2025-01-01.sql.gz | \
    docker compose exec -T postgres psql -U postgres zerodocs
```

Schedule that with cron (host) or a sidecar container. Keep at least 7
daily and 4 weekly snapshots offsite (S3, B2, etc).

For a managed Postgres, use the provider's snapshot/PITR features —
Railway, Neon, Supabase, RDS, and DigitalOcean all have sensible defaults.

---

## SMTP / password reset

By default, password reset is a one-shot link with a 1-hour TTL. With no
SMTP configured (the install default), the link is printed to the API
server's stdout — useful for first-run testing, useless for real users.

To wire real email, set `SMTP_URL` and `SMTP_FROM` in `.env`:

```bash
SMTP_URL=smtps://username:password@smtp.example.com:465
SMTP_FROM=noreply@docs.example.com
```

The first time a reset is requested with `SMTP_URL` set, the API server
lazily imports `nodemailer`. Add it to the api-server's `package.json`
manually if you need to vendor it (`pnpm --filter @workspace/api-server
add nodemailer`).

---

## Upgrades

```bash
git pull
docker compose build
docker compose up -d
```

The api container runs `runMigrations()` on startup, so any new SQL files
in `lib/db/drizzle/` are applied automatically against your `DATABASE_URL`.
**Take a backup before upgrading** if your data matters.

---

## Media storage

Uploaded images, video, audio, and PDFs go through a pluggable storage
layer. Pick a backend with `STORAGE_BACKEND`:

| Backend | When to use it |
|---|---|
| `postgres` (default) | Zero infra setup. Bytes live in the `media_blobs` table and are covered by `pg_dump` backups. Best for Railway and single-VPS installs up to a few GB of media. |
| `s3` | S3-compatible object storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO). Recommended once your corpus grows, or any time you want media on a CDN. |

The choice is per-process and metadata carries the chosen backend so
existing assets keep being served correctly when you switch.

For S3, set:

```bash
STORAGE_BACKEND=s3
S3_ENDPOINT=https://s3.amazonaws.com         # or your R2/MinIO endpoint
S3_BUCKET=my-0docs-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com   # optional; defaults to the bucket URL
```

When `STORAGE_BACKEND=s3` and the bucket env vars are set, the upload
routes stream new media into S3 and the asset metadata row points back
at it. If the S3 env vars are incomplete the server logs a warning and
silently falls back to Postgres so a misconfigured deploy still works.

Per-upload size caps live in `MAX_UPLOAD_BYTES` (default 20 MB). Crank
this up if you're uploading large video files — but remember the
Postgres backend keeps bytes inline in the database.

---

## Disabling public signup

Once your team has accounts, flip `DISABLE_SIGNUP=true` in `.env` and
restart the API. Login + password reset still work; only `POST
/api/auth/signup` refuses (with one carve-out: when the users table is
empty, signup is still allowed so a fresh install can bootstrap).

---

## Checklist before going live

- [ ] `NODE_ENV=production` is set on the API container / Railway service.
- [ ] HTTPS is terminated upstream and `X-Forwarded-Proto` is forwarded.
- [ ] `CORS_ALLOWLIST` includes any extra origins (skip if web + API
      share a hostname — the default).
- [ ] Postgres has automated, off-host backups.
- [ ] `ADMIN_EMAIL` matches the person who'll own the bootstrap account.
- [ ] `OPENAI_API_KEY` is set if you want "Ask docs" to work.
- [ ] `SMTP_URL` is set if you want password resets to email users.
- [ ] Pick a storage backend. Postgres BLOBs (`STORAGE_BACKEND=postgres`,
      the default) is fine for small/medium installs. Switch to
      `STORAGE_BACKEND=s3` once your media corpus grows or you want
      CDN-edge caching.
- [ ] You've taken a manual `pg_dump` of an empty fresh install and
      verified the restore path works.
