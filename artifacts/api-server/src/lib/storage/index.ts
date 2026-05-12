import { logger } from "../logger";
import { postgresStorage } from "./postgres";
import { s3StorageOrNull } from "./s3";
import type { StorageAdapter } from "./types";

export { StorageError } from "./types";
export type { StorageAdapter } from "./types";

/**
 * Pick the active storage backend at boot.
 *
 *   STORAGE_BACKEND=postgres  (default) — inline BLOBs in the database.
 *   STORAGE_BACKEND=s3                 — S3-compatible object storage.
 *
 * "s3" requires S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY.
 * If they're missing we log a warning and fall back to postgres so a
 * misconfigured deploy still works.
 *
 * The choice is made once per process. Existing assets carry their own
 * `storage` column so they can still be served after a backend change.
 */
function pickBackend(): StorageAdapter {
  const choice = (process.env.STORAGE_BACKEND ?? "postgres").toLowerCase();
  if (choice === "s3") {
    const s3 = s3StorageOrNull();
    if (s3) {
      logger.info("[storage] using S3-compatible backend");
      return s3;
    }
    logger.warn(
      "[storage] STORAGE_BACKEND=s3 but S3_* env vars are incomplete — falling back to postgres",
    );
  }
  logger.info("[storage] using postgres BLOB backend");
  return postgresStorage;
}

let cached: StorageAdapter | null = null;
export function activeStorage(): StorageAdapter {
  if (!cached) cached = pickBackend();
  return cached;
}

const ADAPTERS: Record<string, StorageAdapter> = {
  postgres: postgresStorage,
};

/**
 * Look up an adapter by name for serving existing assets. Falls back to
 * the active backend if the name is unknown (defensive — shouldn't
 * happen with a clean schema).
 */
export function adapterFor(name: string): StorageAdapter {
  if (name === "s3") {
    const s3 = s3StorageOrNull();
    if (s3) return s3;
  }
  return ADAPTERS[name] ?? activeStorage();
}
