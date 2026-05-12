import { eq } from "drizzle-orm";
import { db, mediaBlobsTable } from "@workspace/db";
import type { StorageAdapter } from "./types";

/**
 * Stores media bytes inline in the `media_blobs` Postgres table. Zero
 * configuration — works as soon as the database exists. Best for small-
 * to-medium installs (Railway, single-VPS) where you don't want to wire
 * up object storage. Files are part of `pg_dump` backups automatically.
 *
 * Trade-offs vs S3:
 *   + Zero infra to set up
 *   + Atomic with the rest of the data (one backup covers everything)
 *   - Bloats DB size; backups grow with media
 *   - Every read hits Postgres (no CDN edge caching)
 */
export const postgresStorage: StorageAdapter = {
  name: "postgres",

  async put({ assetId, buffer }) {
    await db.insert(mediaBlobsTable).values({
      assetId,
      data: buffer,
      sizeBytes: buffer.byteLength,
    });
    // Postgres backend keys the blob by asset id directly.
    return { storageKey: assetId };
  },

  async get(storageKey) {
    const [row] = await db
      .select({ data: mediaBlobsTable.data, sizeBytes: mediaBlobsTable.sizeBytes })
      .from(mediaBlobsTable)
      .where(eq(mediaBlobsTable.assetId, storageKey))
      .limit(1);
    if (!row) return null;
    return {
      body: row.data as Buffer,
      sizeBytes: Number(row.sizeBytes),
    };
  },

  async delete(storageKey) {
    await db
      .delete(mediaBlobsTable)
      .where(eq(mediaBlobsTable.assetId, storageKey));
  },
};
