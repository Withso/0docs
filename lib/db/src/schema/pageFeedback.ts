import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pageFeedbackTable = pgTable("page_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("page_id").notNull(),
  isHelpful: boolean("is_helpful").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPageFeedbackSchema = createInsertSchema(pageFeedbackTable).omit({ id: true, createdAt: true });
export type InsertPageFeedback = z.infer<typeof insertPageFeedbackSchema>;
export type PageFeedback = typeof pageFeedbackTable.$inferSelect;
