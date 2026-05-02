import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const docVersionsTable = pgTable("doc_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  versionLabel: text("version_label").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocVersionSchema = createInsertSchema(docVersionsTable).omit({ id: true, createdAt: true });
export type InsertDocVersion = z.infer<typeof insertDocVersionSchema>;
export type DocVersion = typeof docVersionsTable.$inferSelect;
