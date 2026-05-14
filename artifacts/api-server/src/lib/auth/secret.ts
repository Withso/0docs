import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, systemSettingsTable } from "@workspace/db";
import { logger } from "../logger";

const SETTING_KEY = "session_secret";

/**
 * Resolve the secret used to sign session cookies. Precedence:
 *
 *   1. `SESSION_SECRET` env var, if set and non-empty. Lets operators
 *      pin a stable value across multiple instances / blue-green
 *      deploys without DB round-trips.
 *   2. The row in `system_settings` with key="session_secret", if it
 *      exists. This survives restarts and is captured by pg_dump
 *      backups along with the rest of the data.
 *   3. Otherwise, generate 48 bytes of random and persist them into
 *      `system_settings`. The very first boot does this once; every
 *      boot after that reuses the stored value.
 *
 * Result: zero-config deploys (Railway, Fly, fresh docker compose) get
 * signed cookies automatically without the operator having to manage a
 * secret. Cookies from before this change are invalidated on the next
 * deploy, but that's a one-time forced sign-out — sids themselves stay
 * unforgeable either way.
 */
export async function ensureSessionSecret(): Promise<string> {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) {
    logger.info("[auth] using SESSION_SECRET from environment");
    return fromEnv;
  }

  const [existing] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, SETTING_KEY))
    .limit(1);
  if (existing) {
    return existing.value;
  }

  const generated = crypto.randomBytes(48).toString("hex");
  try {
    await db.insert(systemSettingsTable).values({
      key: SETTING_KEY,
      value: generated,
    });
    logger.info(
      "[auth] generated + stored a new session secret in system_settings",
    );
    return generated;
  } catch (err) {
    // Another instance booted at the same moment and won the insert
    // race — fall back to reading whichever value landed.
    const [retry] = await db
      .select({ value: systemSettingsTable.value })
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.key, SETTING_KEY))
      .limit(1);
    if (retry) return retry.value;
    logger.error({ err }, "[auth] could not persist session secret");
    throw err;
  }
}
