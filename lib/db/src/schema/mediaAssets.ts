import {
  bigint,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Drizzle ships no native BYTEA helper; this minimal customType maps to it.
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

// Metadata for every uploaded media asset (images, video, files). The
// bytes live either inline (mediaBlobsTable, postgres backend) or in
// external object storage (S3-compatible) — `storage` + `storageKey`
// disambiguate.
export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    filename: text("filename").notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // 'postgres' | 's3' — picks which adapter knows how to read the bytes.
    storage: varchar("storage", { length: 32 }).notNull(),
    // For 'postgres' this is the asset id (joins to mediaBlobsTable).
    // For 's3' this is the bucket key.
    storageKey: text("storage_key").notNull(),
    uploadedByUserId: varchar("uploaded_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("media_assets_project_idx").on(t.projectId)],
);

// Inline blob storage for the postgres backend. Kept in its own table so
// reads of mediaAssetsTable stay cheap — you only join in the bytes when
// you actually need to serve them.
export const mediaBlobsTable = pgTable("media_blobs", {
  assetId: uuid("asset_id")
    .primaryKey()
    .references(() => mediaAssetsTable.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  // Kept here too so the size check on serve doesn't need a second query.
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
});

export type MediaAsset = typeof mediaAssetsTable.$inferSelect;
export type NewMediaAsset = typeof mediaAssetsTable.$inferInsert;
