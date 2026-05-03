# Self-hosting 0docs in production

This doc covers what `README.md` doesn't: getting from "it runs on my
laptop" to "it runs on a server my team can use." For a fast local install
see [`README.md`](./README.md).

---

## Recommended topology

```
                ┌──────────────────────────┐
                │       Reverse proxy      │   nginx / Caddy / Traefik
                │   (HTTPS, gzip, certs)   │
                └────────────┬─────────────┘
                             │
              ┌──────────────┼──────────────┐
              │                             │
        /api/* → api:8081           /  → web:8080
              │                             │
              ▼                             ▼
      ┌──────────────┐              ┌──────────────┐
      │   api-server │ ───SQL───►   │   postgres   │
      └──────────────┘              └──────────────┘
```

All in-app URLs are relative (`/api/...`) so the same build works behind
any reverse proxy that fronts both services on a single hostname.

---

## Reverse proxy (HTTPS)

### Caddy

The simplest option. `Caddyfile`:

```Caddyfile
docs.example.com {
    encode zstd gzip

    # Send /api/* to the API server.
    handle /api/* {
        reverse_proxy api:8081
    }

    # Everything else goes to the web app.
    handle {
        reverse_proxy web:8080
    }
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

    location /api/ {
        proxy_pass         http://127.0.0.1:8081;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Make sure to forward `X-Forwarded-Proto`. The session cookie is set with
`Secure` when `NODE_ENV=production`, so requests must arrive over HTTPS or
the cookie won't be saved.

### Single-host CORS

When the web app and API live on the same hostname (recommended), you
don't need to touch CORS at all. If you split them onto different
hostnames, add the web app's origin to `CORS_ALLOWLIST`:

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

For a managed Postgres, use that provider's snapshot/PITR features — the
out-of-the-box options on Neon, Supabase, RDS, and DigitalOcean are all
fine.

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
docker compose run --rm api pnpm --filter @workspace/db run push
docker compose up -d
```

The `db push` step is intentionally separate so you can take a backup
first. Drizzle Kit prints the SQL it's about to run before applying it.

---

## Object storage (current limitation)

Uploaded images currently live wherever the api-server's local filesystem
points (or in Replit Object Storage when running on Replit). For a true
multi-instance deployment you'll want S3-compatible storage. That work is
tracked as a follow-up — see the open issues. In the meantime:

- A single-instance deploy on a server with persistent disk works fine.
- If you put two `api` replicas behind a load balancer, sticky sessions on
  the load balancer keeps things mostly working until the S3 backend lands.

---

## Disabling public signup

Once your team has accounts, flip `SELFHOST_DISABLE_SIGNUP=true` in `.env`
and restart the API. Login + password reset still work; only `POST
/api/auth/signup` is hidden from the UI. (The endpoint itself stays
accessible to keep the API stable, but the web UI hides it; if you'd like
the endpoint to refuse, lock it down at your reverse proxy.)

---

## Checklist before going live

- [ ] `SESSION_SECRET` is at least 64 random characters (`install.sh`
      handles this).
- [ ] `NODE_ENV=production` is set on the API container.
- [ ] HTTPS is terminated by the reverse proxy and `X-Forwarded-Proto`
      is forwarded.
- [ ] `CORS_ALLOWLIST` includes any extra origins (skip if web + API
      share a hostname).
- [ ] Postgres has automated, off-host backups.
- [ ] `ADMIN_EMAIL` matches the address of the person who'll create the
      bootstrap account.
- [ ] `OPENAI_API_KEY` is set if you want "Ask docs" to work.
- [ ] `SMTP_URL` is set if you want password resets to email users.
- [ ] You've taken a manual `pg_dump` of an empty fresh install and
      verified the restore path works.
