import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const publishedVersionsTable = pgTable("published_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  versionNumber: text("version_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  publishedBy: text("published_by").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  pagesSnapshot: jsonb("pages_snapshot").notNull().default([]),
  sectionsSnapshot: jsonb("sections_snapshot").notNull().default([]),
  blocksSnapshot: jsonb("blocks_snapshot").notNull().default([]),
  designSnapshot: jsonb("design_snapshot").notNull().default({}),
  navGroupsSnapshot: jsonb("nav_groups_snapshot").notNull().default([]),
  editorChanges: jsonb("editor_changes").notNull().default([]),
  designChanges: jsonb("design_changes").notNull().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPublishedVersionSchema = createInsertSchema(publishedVersionsTable).omit({ id: true, createdAt: true });
export type InsertPublishedVersion = z.infer<typeof insertPublishedVersionSchema>;
export type PublishedVersion = typeof publishedVersionsTable.$inferSelect;
