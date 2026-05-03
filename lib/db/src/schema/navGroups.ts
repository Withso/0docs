import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const navGroupsTable = pgTable("nav_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  branchId: uuid("branch_id").notNull(),
  title: text("title").notNull().default("New Label"),
  type: text("type").notNull().default("label"),
  orderIndex: integer("order_index").notNull().default(0),
  tabId: uuid("tab_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNavGroupSchema = createInsertSchema(navGroupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNavGroup = z.infer<typeof insertNavGroupSchema>;
export type NavGroup = typeof navGroupsTable.$inferSelect;
