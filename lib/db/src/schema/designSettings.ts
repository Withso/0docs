import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectDesignSettingsTable = pgTable("project_design_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().unique(),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDesignSettingsSchema = createInsertSchema(projectDesignSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDesignSettings = z.infer<typeof insertDesignSettingsSchema>;
export type DesignSettings = typeof projectDesignSettingsTable.$inferSelect;
