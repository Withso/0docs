import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sectionsTable = pgTable("sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id").notNull(),
  title: text("title").notNull().default("New Section"),
  navTitle: text("nav_title"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSectionSchema = createInsertSchema(sectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type Section = typeof sectionsTable.$inferSelect;
