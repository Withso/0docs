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
  // Optional URL prefix at which the docs are served on the custom domain
  // (e.g. "/docs"). Null/empty means the docs live at the domain root. Stored
  // with a leading slash and no trailing slash. Mintlify-style hosting.
  customDomainBasePath: text("custom_domain_base_path"),
  customDomainStatus: text("custom_domain_status"),
  customDomainVerifiedAt: timestamp("custom_domain_verified_at", { withTimezone: true }),
  customDomainLastCheckedAt: timestamp("custom_domain_last_checked_at", { withTimezone: true }),
  customDomainLastError: text("custom_domain_last_error"),
  publishedVersionId: uuid("published_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => ({
  customDomainUniqueIdx: uniqueIndex("projects_custom_domain_unique_idx").on(t.customDomain),
  // Slug drives the public /p/:slug URL — a duplicate would silently shadow
  // another project, so enforce uniqueness at the DB layer (defense in depth
  // against race conditions that the app-level pre-insert check can miss).
  slugUniqueIdx: uniqueIndex("projects_slug_unique_idx").on(t.slug),
}));

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
