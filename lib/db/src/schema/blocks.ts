import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blocksTable = pgTable("blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionId: uuid("section_id").notNull(),
  // Branch-scoped: every block belongs to exactly one branch.
  branchId: uuid("branch_id").notNull(),
  type: text("type").notNull().default("paragraph"),
  content: jsonb("content").notNull().default({}),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBlockSchema = createInsertSchema(blocksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Block = typeof blocksTable.$inferSelect;
