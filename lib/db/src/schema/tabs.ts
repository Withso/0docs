import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tabsTable = pgTable("tabs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  label: text("label").notNull().default("New Tab"),
  icon: text("icon"),
  orderIndex: integer("order_index").notNull().default(0),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTabSchema = createInsertSchema(tabsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTab = z.infer<typeof insertTabSchema>;
export type Tab = typeof tabsTable.$inferSelect;
