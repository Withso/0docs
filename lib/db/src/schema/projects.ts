import { pgTable, text, boolean, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isHomepage: boolean("is_homepage").notNull().default(false),
  customDomain: text("custom_domain"),
  customDomainStatus: text("custom_domain_status"),
  customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),
  customDomainLastCheckedAt: timestamp("custom_domain_last_checked_at", { withTimezone: true }),
  customDomainLastError: text("custom_domain_last_error"),
  publishedVersionId: uuid("published_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  customDomainUniqueIdx: uniqueIndex("projects_custom_domain_unique_idx").on(t.customDomain),
}));

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
