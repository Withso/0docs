#!/usr/bin/env node
// scripts/seed-admin.mjs
//
// Idempotently seed an admin user from environment variables. Used by the
// self-host installer (install.sh) so the operator never has to "remember
// to be the first signup". Safe to re-run: existing users are left alone
// except that `is_admin` is set to true on the matching email.
//
// Required env: ADMIN_EMAIL, ADMIN_PASSWORD (>=8 chars), DATABASE_URL.
// If ADMIN_EMAIL or ADMIN_PASSWORD is missing, the script exits 0 and
// prints a hint — the installer treats that as "skip seeding" rather
// than failure so the "first signup becomes admin" path still works.
//
// Implementation note: we deliberately use raw `pg` here rather than
// importing `@workspace/db` (which is TypeScript-only — `node` can't
// resolve `.ts` exports without a loader). Keeping this script JS-only
// means it runs with plain `node` from install.sh on any host.

import crypto from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scryptAsync = promisify(crypto.scrypt);
const KEY_LEN = 64;
const SALT_LEN = 16;

// Format mirrors artifacts/api-server/src/lib/auth/password.ts exactly:
// scrypt$<salt-hex>$<hash-hex>. Keep these in sync.
async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const derived = await scryptAsync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.log(
    "[seed-admin] ADMIN_EMAIL and/or ADMIN_PASSWORD not set — skipping admin seed.",
  );
  console.log(
    "[seed-admin] First user to sign up via the web UI will become the admin.",
  );
  process.exit(0);
}

if (password.length < 8) {
  console.error("[seed-admin] ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "[seed-admin] DATABASE_URL is not set — cannot seed admin user.",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const { rows: existing } = await client.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (existing.length > 0) {
    await client.query(
      "UPDATE users SET is_admin = TRUE, updated_at = NOW() WHERE id = $1",
      [existing[0].id],
    );
    console.log(`[seed-admin] ✓ ensured ${email} is admin (existing user).`);
  } else {
    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();
    await client.query(
      `INSERT INTO users (id, email, password_hash, is_admin, created_at, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW(), NOW())`,
      [id, email, passwordHash],
    );
    console.log(`[seed-admin] ✓ created admin user ${email} (id=${id}).`);
  }
} finally {
  await client.end();
}
