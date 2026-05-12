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
3. In the service's **Variables** tab, set:
   - `SESSION_SECRET` — random 64+ char string.
     Use `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
     to generate one.
   - `NODE_ENV=production`.
   - `ADMIN_EMAIL` + `ADMIN_PASSWORD` (optional) — bootstrap admin user.
   - `OPENAI_API_KEY` (optional) — enables the "Ask docs" feature.
   - `SMTP_URL` + `SMTP_FROM` (optional) — enables password-reset emails.
   - `S3_*` variables (optional) — enables S3-compatible image upload.
     Required if you scale past one instance, since Railway's filesystem
     is ephemeral.
4. Deploy. Railway runs migrations on boot.

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

## Object storage

Uploaded images live in the api-server's local filesystem by default,
which works fine for a single-instance VPS deploy with a persistent disk.
For Railway and any multi-instance deploy, point image uploads at
S3-compatible storage by setting:

```bash
S3_ENDPOINT=https://s3.amazonaws.com         # or your R2/MinIO endpoint
S3_BUCKET=my-0docs-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com   # optional; defaults to the bucket URL
```

When `S3_BUCKET` is set the upload routes write to S3 and return the
public URL. When it isn't set, uploads stay on local disk.

---

## Disabling public signup

Once your team has accounts, flip `DISABLE_SIGNUP=true` in `.env` and
restart the API. Login + password reset still work; only `POST
/api/auth/signup` refuses (with one carve-out: when the users table is
empty, signup is still allowed so a fresh install can bootstrap).

---

## Checklist before going live

- [ ] `SESSION_SECRET` is at least 64 random characters (`install.sh`
      handles this).
- [ ] `NODE_ENV=production` is set on the API container / Railway service.
- [ ] HTTPS is terminated upstream and `X-Forwarded-Proto` is forwarded.
- [ ] `CORS_ALLOWLIST` includes any extra origins (skip if web + API
      share a hostname — the default).
- [ ] Postgres has automated, off-host backups.
- [ ] `ADMIN_EMAIL` matches the person who'll own the bootstrap account.
- [ ] `OPENAI_API_KEY` is set if you want "Ask docs" to work.
- [ ] `SMTP_URL` is set if you want password resets to email users.
- [ ] `S3_BUCKET` (and friends) is set if you're on Railway or any
      multi-instance / ephemeral-FS host.
- [ ] You've taken a manual `pg_dump` of an empty fresh install and
      verified the restore path works.
